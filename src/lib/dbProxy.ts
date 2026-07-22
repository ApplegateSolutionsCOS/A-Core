/**
 * Database Proxy - Routes all table operations through the db-proxy edge function
 * with multi-strategy invocation, retry logic, caching, and offline support.
 * 
 * Usage (drop-in replacement for supabase.from()):
 *   import { db } from '@/lib/dbProxy';
 *   const { data, error } = await db.from('workspaces').select('*').eq('organization_id', orgId);
 */

import { invokeEdgeFunction } from '@/lib/edgeFunctionClient';
import {
  getCachedData, setCachedData, invalidateTable,
  addToSyncQueue
} from '@/lib/offlineCache';
import { setEdgeFunctionAvailable, isEdgeFunctionAvailable } from '@/lib/syncEngine';

interface Filter {
  type: string;
  column?: string;
  value?: any;
  operator?: string;
}

interface OrderSpec {
  column: string;
  ascending: boolean;
}

interface QueryResult<T = any> {
  data: T | null;
  error: any;
  count?: number | null;
  _cached?: boolean;
  _cacheAge?: number;
}

// Retry configuration
const MAX_RETRIES = 2;
const BASE_DELAY = 1000; // 1 second
const MAX_DELAY = 8000;  // 8 seconds

function exponentialBackoff(attempt: number): number {
  const delay = Math.min(BASE_DELAY * Math.pow(2, attempt), MAX_DELAY);
  // Add jitter (±25%)
  return delay * (0.75 + Math.random() * 0.5);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class QueryBuilder<T = any> implements PromiseLike<QueryResult<T>> {
  private _table: string;
  private _operation: string = 'select';
  private _columns: string = '*';
  private _filters: Filter[] = [];
  private _order: OrderSpec[] = [];
  private _limit: number | null = null;
  private _single: boolean = false;
  private _count: string | null = null;
  private _head: boolean = false;
  private _data: any = null;
  private _onConflict: string | null = null;
  private _returning: boolean = true;

  constructor(table: string) {
    this._table = table;
  }

  select(columns: string = '*', options?: { count?: string; head?: boolean }): this {
    this._operation = 'select';
    this._columns = columns;
    if (options?.count) this._count = options.count;
    if (options?.head) this._head = options.head;
    return this;
  }

  insert(data: any): this {
    this._operation = 'insert';
    this._data = data;
    return this;
  }

  update(data: any): this {
    this._operation = 'update';
    this._data = data;
    return this;
  }

  delete(): this {
    this._operation = 'delete';
    return this;
  }

  upsert(data: any, options?: { onConflict?: string }): this {
    this._operation = 'upsert';
    this._data = data;
    if (options?.onConflict) this._onConflict = options.onConflict;
    return this;
  }

  eq(column: string, value: any): this {
    this._filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any): this {
    this._filters.push({ type: 'neq', column, value });
    return this;
  }

  gt(column: string, value: any): this {
    this._filters.push({ type: 'gt', column, value });
    return this;
  }

  gte(column: string, value: any): this {
    this._filters.push({ type: 'gte', column, value });
    return this;
  }

  lt(column: string, value: any): this {
    this._filters.push({ type: 'lt', column, value });
    return this;
  }

  lte(column: string, value: any): this {
    this._filters.push({ type: 'lte', column, value });
    return this;
  }

  like(column: string, value: string): this {
    this._filters.push({ type: 'like', column, value });
    return this;
  }

  ilike(column: string, value: string): this {
    this._filters.push({ type: 'ilike', column, value });
    return this;
  }

  in(column: string, values: any[]): this {
    this._filters.push({ type: 'in', column, value: values });
    return this;
  }

  is(column: string, value: any): this {
    this._filters.push({ type: 'is', column, value });
    return this;
  }

  not(column: string, operator: string, value: any): this {
    this._filters.push({ type: 'not', column, operator, value });
    return this;
  }

  or(value: string): this {
    this._filters.push({ type: 'or', value });
    return this;
  }

  contains(column: string, value: any): this {
    this._filters.push({ type: 'contains', column, value });
    return this;
  }
  order(column: string, options?: { ascending?: boolean }): this {
    this._order.push({ column, ascending: options?.ascending ?? true });
    return this;
  }

  range(from: number, to: number): this {
    this._limit = to - from + 1;
    this._filters.push({ type: 'range_offset', value: from });
    return this;
  }

  limit(count: number): this {
    this._limit = count;
    return this;
  }

  single(): this {
    this._single = true;
    return this;
  }

  // Make the builder thenable so it auto-executes when awaited
  then<TResult1 = QueryResult<T>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private buildBody(): any {
    const body: any = {
      table: this._table,
      operation: this._operation,
    };

    if (this._columns !== '*' || this._operation === 'select') {
      body.columns = this._columns;
    }
    if (this._filters.length > 0) body.filters = this._filters;
    if (this._order.length > 0) {
      body.order = this._order.length === 1 ? this._order[0] : this._order;
    }
    if (this._limit !== null) body.limit = this._limit;
    if (this._single) body.single = true;
    if (this._count) body.count = this._count;
    if (this._head) body.head = true;
    if (this._data !== null) body.data = this._data;
    if (this._onConflict) body.onConflict = this._onConflict;
    if (!this._returning) body.returning = false;

    return body;
  }

  private async execute(): Promise<QueryResult<T>> {
    const isRead = this._operation === 'select';
    const isWrite = ['insert', 'update', 'delete', 'upsert'].includes(this._operation);

    try {
      // ─── For READ operations: try cache first ───
      if (isRead) {
        const orderForCache = this._order.length > 0 
          ? (this._order.length === 1 ? this._order[0] : this._order) 
          : null;

        // Try to get from server with retry
        const serverResult = await this.invokeWithRetry();
        
        if (serverResult.data !== null && !serverResult.error) {
          // Success - cache the result and return
          setEdgeFunctionAvailable(true);
          
          setCachedData(
            this._table, this._operation, this._filters,
            this._columns, orderForCache, this._limit,
            serverResult.data
          ).catch(() => {}); // Fire and forget

          return {
            data: serverResult.data,
            error: null,
            count: serverResult.count,
            _cached: false,
          };
        }

        // Server failed - try cache
        const cached = await getCachedData(
          this._table, this._operation, this._filters,
          this._columns, orderForCache, this._limit
        );

        if (cached) {
          console.log(`[dbProxy] Serving cached data for ${this._table}.${this._operation} (age: ${Math.round(cached.cacheAge / 1000)}s)`);
          return {
            data: cached.data,
            error: null,
            _cached: true,
            _cacheAge: cached.cacheAge,
          };
        }

        // No cache available - return graceful empty
        console.warn(`[dbProxy] No cache for ${this._table}.${this._operation}, returning empty`);
        return {
          data: this._single ? null : ([] as any),
          error: null,
          _cached: false,
        };
      }

      // ─── For WRITE operations: try server, queue if offline ───
      if (isWrite) {
        if (!isEdgeFunctionAvailable() || !navigator.onLine) {
          // Queue for later sync
          console.log(`[dbProxy] Offline - queuing ${this._table}.${this._operation} for sync`);
          await addToSyncQueue({
            table: this._table,
            operation: this._operation as any,
            data: this._data,
            filters: this._filters,
          });

          // Invalidate local cache for this table
          await invalidateTable(this._table);

          return {
            data: this._data,
            error: null,
            _cached: true,
          };
        }

        const result = await this.invokeWithRetry();
        
        if (result.error) {
          // Server error - queue for retry
          if (result.error === 'ALL_STRATEGIES_FAILED' || result.status === 0) {
            console.log(`[dbProxy] Server unreachable - queuing ${this._table}.${this._operation}`);
            await addToSyncQueue({
              table: this._table,
              operation: this._operation as any,
              data: this._data,
              filters: this._filters,
            });
            
            await invalidateTable(this._table);
            
            return {
              data: this._data,
              error: null,
              _cached: true,
            };
          }
          
          return { data: null, error: result.error };
        }

        // Success - invalidate cache for this table
        await invalidateTable(this._table);
        setEdgeFunctionAvailable(true);

        return {
          data: result.data,
          error: null,
          count: result.count,
        };
      }

      return { data: null, error: 'Unknown operation' };
    } catch (err) {
      console.error(`[dbProxy] unexpected error for ${this._table}.${this._operation}:`, err);
      
      // For reads, try cache as last resort
      if (isRead) {
        const orderForCache = this._order.length > 0 
          ? (this._order.length === 1 ? this._order[0] : this._order) 
          : null;
        const cached = await getCachedData(
          this._table, this._operation, this._filters,
          this._columns, orderForCache, this._limit
        );
        if (cached) {
          return { data: cached.data, error: null, _cached: true, _cacheAge: cached.cacheAge };
        }
        return { data: this._single ? null : ([] as any), error: null, _cached: false };
      }
      
      return { data: null, error: err };
    }
  }

  private async invokeWithRetry(): Promise<{
    data: any;
    error: any;
    count?: number | null;
    status: number;
  }> {
    const body = this.buildBody();
    let lastError: any = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = exponentialBackoff(attempt - 1);
        await sleep(delay);
      }

      try {
        const result = await invokeEdgeFunction('db-proxy', body, 20000);

        if (result.error === 'ALL_STRATEGIES_FAILED') {
          setEdgeFunctionAvailable(false);
          lastError = result.error;
          continue; // Retry
        }

        // Got a response from server
        if (result.data?.error) {
          // Server returned a query error - don't retry
          return {
            data: null,
            error: result.data.error,
            count: result.data.count,
            status: result.status,
          };
        }

        // Success
        return {
          data: result.data?.data ?? result.data ?? null,
          error: null,
          count: result.data?.count ?? null,
          status: result.status,
        };
      } catch (err: any) {
        lastError = err;
        if (attempt < MAX_RETRIES) {
          console.warn(`[dbProxy] Attempt ${attempt + 1} failed for ${this._table}.${this._operation}, retrying...`);
        }
      }
    }

    // All retries exhausted
    setEdgeFunctionAvailable(false);
    return {
      data: null,
      error: lastError || 'ALL_STRATEGIES_FAILED',
      status: 0,
    };
  }
}

/**
 * Database proxy object - use instead of supabase for table operations.
 * Now with caching, retry logic, and offline support.
 * 
 * Example:
 *   // Before: supabase.from('workspaces').select('*')
 *   // After:  db.from('workspaces').select('*')
 */
export const db = {
  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  },
};
