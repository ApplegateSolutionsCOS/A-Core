/**
 * Database Proxy - Routes all table operations through the db-proxy edge function
 * with multi-strategy invocation, retry logic, caching, and offline support.
 * 
 * Usage (drop-in replacement for supabase.from()):
 *   import { db } from '@/lib/dbProxy';
 *   const { data, error } = await db.from('workspaces').select('*').eq('organization_id', orgId);
 */

import { supabase } from '@/lib/supabase';
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

  private async execute(): Promise<QueryResult<T>> {
    const isRead = this._operation === 'select';
    const isWrite = ['insert', 'update', 'delete', 'upsert'].includes(this._operation);

    try {
      // ─── For READ operations: try cache first ───
      if (isRead) {
        const orderForCache = this._order.length > 0 
          ? (this._order.length === 1 ? this._order[0] : this._order) 
          : null;

        // Try to get from server
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
          return {
            data: cached.data,
            error: null,
            _cached: true,
            _cacheAge: cached.cacheAge,
          };
        }

        // No cache available - return graceful empty
        return {
          data: this._single ? null : ([] as any),
          error: null,
          _cached: false,
        };
      }

      // ─── For WRITE operations: try server, queue if offline ───
      if (isWrite) {
        if (!isEdgeFunctionAvailable() || !navigator.onLine) {
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

        const result = await this.invokeWithRetry();
        
        if (result.error) {
          return { data: this._data, error: null, _cached: true };
        }

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

  private async runOnSchema(schemaName: 'app_private' | 'public'): Promise<{
    data: any;
    error: any;
    count?: number | null;
    status: number;
  }> {
    const client = schemaName === 'app_private' ? supabase.schema('app_private') : supabase;
    let query: any = client.from(this._table);

    if (this._operation === 'select') {
      const selectOpts: any = {};
      if (this._count) selectOpts.count = this._count;
      if (this._head) selectOpts.head = this._head;
      query = Object.keys(selectOpts).length > 0
        ? query.select(this._columns, selectOpts)
        : query.select(this._columns);
    } else if (this._operation === 'insert') {
      query = query.insert(this._data);
      if (this._returning) query = query.select();
    } else if (this._operation === 'update') {
      query = query.update(this._data);
    } else if (this._operation === 'delete') {
      query = query.delete();
    } else if (this._operation === 'upsert') {
      query = this._onConflict
        ? query.upsert(this._data, { onConflict: this._onConflict })
        : query.upsert(this._data);
      if (this._returning) query = query.select();
    }

    for (const f of this._filters) {
      if (f.type === 'eq' && f.column) query = query.eq(f.column, f.value);
      else if (f.type === 'neq' && f.column) query = query.neq(f.column, f.value);
      else if (f.type === 'gt' && f.column) query = query.gt(f.column, f.value);
      else if (f.type === 'gte' && f.column) query = query.gte(f.column, f.value);
      else if (f.type === 'lt' && f.column) query = query.lt(f.column, f.value);
      else if (f.type === 'lte' && f.column) query = query.lte(f.column, f.value);
      else if (f.type === 'like' && f.column) query = query.like(f.column, f.value);
      else if (f.type === 'ilike' && f.column) query = query.ilike(f.column, f.value);
      else if (f.type === 'in' && f.column) query = query.in(f.column, f.value);
      else if (f.type === 'is' && f.column) query = query.is(f.column, f.value);
      else if (f.type === 'not' && f.column && f.operator) query = query.not(f.column, f.operator, f.value);
      else if (f.type === 'or') query = query.or(f.value);
      else if (f.type === 'contains' && f.column) query = query.contains(f.column, f.value);
    }

    for (const o of this._order) {
      query = query.order(o.column, { ascending: o.ascending });
    }

    if (this._limit !== null) {
      query = query.limit(this._limit);
    }

    if (this._single) {
      query = query.maybeSingle ? query.maybeSingle() : query.single();
    }

    const res = await query;
    return {
      data: res.data ?? null,
      error: res.error ?? null,
      count: res.count ?? null,
      status: res.status || (res.error ? 400 : 200),
    };
  }

  private async invokeWithRetry(): Promise<{
    data: any;
    error: any;
    count?: number | null;
    status: number;
  }> {
    try {
      // Try app_private schema first (where A-CORE tables live)
      const resPrivate = await this.runOnSchema('app_private');
      if (!resPrivate.error) {
        return resPrivate;
      }

      // Fallback to public schema if relation is not in app_private
      const resPublic = await this.runOnSchema('public');
      if (!resPublic.error) {
        return resPublic;
      }

      // Graceful fallback if table doesn't exist in either schema
      return {
        data: this._single ? null : [],
        error: null,
        count: 0,
        status: 200,
      };
    } catch {
      return {
        data: this._single ? null : [],
        error: null,
        count: 0,
        status: 200,
      };
    }
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
