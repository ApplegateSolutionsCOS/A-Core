// ═══════════════════════════════════════════════════════════════════════
// REPORT AGGREGATION — shared between builder preview and pinned widgets
// Queries the source mini-app records (and connected apps for calc mode),
// applies a list of filter rows, and buckets values by an optional
// breakdown field. Returns [{ label, value }] for charting.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase';

export type MetricMode = 'count' | 'sum' | 'calc';
export type CalcOp = 'add' | 'subtract' | 'multiply' | 'divide';

export type FilterOp =
  | 'equals' | 'not_equals'
  | 'contains' | 'not_contains'
  | 'gt' | 'gte' | 'lt' | 'lte'
  | 'between'
  | 'in_last_days' | 'not_in_last_days'
  | 'is_empty' | 'is_not_empty';

export interface FilterRow {
  id: string;
  fieldName: string;
  fieldType?: string;        // helps pick the right operator UI
  op: FilterOp;
  value: string;
  value2?: string;           // secondary value for "between"
  conjunction: 'AND' | 'OR'; // joins this row to the PREVIOUS row (ignored on first)
}

export interface ReportConfig {
  orgId: string;
  sourceAppId: string;
  metricMode: MetricMode;
  countField?: string | null;
  breakdownField?: string | null;
  calcFieldA?: string | null;      // "fieldName::appId"
  calcFieldB?: string | null;
  calcOp?: CalcOp | null;
  filters?: FilterRow[];
}

export interface AggregatedPoint { label: string; value: number }

const unwrapData = (rawObj: any): Record<string, any> => {
  if (!rawObj) return {};
  if (typeof rawObj === 'string') {
    try { return JSON.parse(rawObj); } catch { return {}; }
  }
  return rawObj;
};

const cleanReportVal = (val: any): any => {
  if (val === null || val === undefined) return '';
  let parsed = val;
  if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
    try { parsed = JSON.parse(val); } catch {}
  }
  const extractOne = (item: any): any => {
    if (item && typeof item === 'object') {
      if ('value' in item) {
        if (typeof item.value === 'object' && item.value !== null) {
          return item.value.name || item.value.title || item.value.text || JSON.stringify(item.value);
        }
        return item.value;
      }
      if ('text' in item) return item.text;
      if ('name' in item) return item.name;
      if ('title' in item) return item.title;
      if ('label' in item) return item.label;
    }
    return item;
  };
  if (Array.isArray(parsed)) {
    return parsed.map(extractOne).filter(v => v !== null && v !== undefined && v !== '').join(', ');
  }
  if (typeof parsed === 'object' && parsed !== null) {
    return extractOne(parsed);
  }
  return parsed;
};

const parseNumeric = (val: any): number => {
  const cleaned = cleanReportVal(val);
  if (typeof cleaned === 'number') return cleaned;
  if (typeof cleaned === 'string') {
    const stripped = cleaned.replace(/[^0-9.\-]/g, '');
    return stripped ? Number(stripped) : NaN;
  }
  return Number(cleaned);
};

const getVal = (rawObj: any, key: string): any => {
  const obj = unwrapData(rawObj);
  if (!obj || !key) return undefined;
  if (obj[key] !== undefined) return cleanReportVal(obj[key]);
  const lower = String(key).toLowerCase();
  const found = Object.keys(obj).find(k => k.toLowerCase() === lower);
  return found ? cleanReportVal(obj[found]) : undefined;
};

const parseDate = (v: any): number | null => {
  if (!v) return null;
  const cleaned = cleanReportVal(v);
  const t = typeof cleaned === 'number' ? cleaned : Date.parse(String(cleaned));
  return isNaN(t) ? null : t;
};

const rowMatchesFilter = (row: any, f: FilterRow): boolean => {
  if (!f.fieldName) return true;
  const raw = getVal(row.data || {}, f.fieldName);
  const strRaw = raw === undefined || raw === null ? '' : String(raw);
  const numRaw = parseNumeric(raw);
  const v = f.value ?? '';
  const v2 = f.value2 ?? '';
  switch (f.op) {
    case 'equals':       return strRaw.toLowerCase() === String(v).toLowerCase();
    case 'not_equals':   return strRaw.toLowerCase() !== String(v).toLowerCase();
    case 'contains':     return strRaw.toLowerCase().includes(String(v).toLowerCase());
    case 'not_contains': return !strRaw.toLowerCase().includes(String(v).toLowerCase());
    case 'gt':           return !isNaN(numRaw) && numRaw >  Number(v);
    case 'gte':          return !isNaN(numRaw) && numRaw >= Number(v);
    case 'lt':           return !isNaN(numRaw) && numRaw <  Number(v);
    case 'lte':          return !isNaN(numRaw) && numRaw <= Number(v);
    case 'between': {
      const lo = Math.min(Number(v), Number(v2));
      const hi = Math.max(Number(v), Number(v2));
      // try date first, fall back to number
      const d = parseDate(raw);
      const dLo = parseDate(v);
      const dHi = parseDate(v2);
      if (d !== null && dLo !== null && dHi !== null) {
        return d >= Math.min(dLo, dHi) && d <= Math.max(dLo, dHi);
      }
      return !isNaN(numRaw) && numRaw >= lo && numRaw <= hi;
    }
    case 'in_last_days': {
      const d = parseDate(raw);
      if (d === null) return false;
      const days = Number(v) || 30;
      return d >= Date.now() - days * 86400000;
    }
    case 'not_in_last_days': {
      const d = parseDate(raw);
      if (d === null) return true;
      const days = Number(v) || 30;
      return d < Date.now() - days * 86400000;
    }
    case 'is_empty':     return strRaw === '' || raw === null || raw === undefined;
    case 'is_not_empty': return !(strRaw === '' || raw === null || raw === undefined);
  }
  return true;
};

// Combine filter rows using a left-to-right AND/OR evaluation
// where each row's `conjunction` joins it to the previous row.
const recordPassesFilters = (row: any, filters: FilterRow[]): boolean => {
  if (!filters || filters.length === 0) return true;
  let result = rowMatchesFilter(row, filters[0]);
  for (let i = 1; i < filters.length; i++) {
    const f = filters[i];
    const m = rowMatchesFilter(row, f);
    if (f.conjunction === 'OR') result = result || m;
    else result = result && m;
  }
  return result;
};

export async function runReportAggregation(cfg: ReportConfig): Promise<AggregatedPoint[]> {
  const {
    orgId, sourceAppId, metricMode,
    countField, breakdownField,
    calcFieldA, calcFieldB, calcOp,
    filters = [],
  } = cfg;

  if (!orgId || !sourceAppId) return [];

  const { data: records, error } = await supabase.schema('app_private')
    .from('mini_app_records')
    .select('id, item_uid, data')
    .eq('mini_app_id', sourceAppId)
    .eq('organization_id', orgId)
    .limit(1000);
  if (error) throw error;

  // Pre-fetch connected-app records only if calc mode references a different app
  const connectedCache: Record<string, any[]> = {};
  const calcFields = [calcFieldA, calcFieldB].filter(Boolean) as string[];
  for (const ck of calcFields) {
    const [, appId] = ck.split('::');
    if (appId && appId !== sourceAppId && !connectedCache[appId]) {
      const { data: crs } = await supabase.schema('app_private')
        .from('mini_app_records')
        .select('item_uid, data')
        .eq('mini_app_id', appId)
        .eq('organization_id', orgId)
        .limit(1000);
      connectedCache[appId] = crs || [];
    }
  }

  // Apply filters
  const pool = (records || []).filter(r => recordPassesFilters(r, filters));

  const valueForRecord = (rec: any): number => {
    const d = rec.data || {};
    if (metricMode === 'count') {
      if (countField) {
        const v = getVal(d, countField);
        return (v === undefined || v === null || v === '') ? 0 : 1;
      }
      return 1;
    }
    if (metricMode === 'sum') {
      const v = parseNumeric(getVal(d, countField || ''));
      return isNaN(v) ? 0 : v;
    }
    // calc
    const side = (key?: string | null): number => {
      if (!key) return 0;
      const [fName, appId] = key.split('::');
      if (!appId || appId === sourceAppId) {
        const v = parseNumeric(getVal(d, fName));
        return isNaN(v) ? 0 : v;
      }
      const p = connectedCache[appId] || [];
      let total = 0;
      p.forEach(pr => {
        const v = parseNumeric(getVal(pr.data || {}, fName));
        if (!isNaN(v)) total += v;
      });
      return total;
    };
    const a = side(calcFieldA);
    const b = side(calcFieldB);
    switch (calcOp) {
      case 'add':      return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide':   return b !== 0 ? a / b : 0;
    }
    return 0;
  };

  const buckets: Record<string, number> = {};
  pool.forEach(r => {
    const d = r.data || {};
    const bucketKey = breakdownField
      ? String(getVal(d, breakdownField) ?? 'Unspecified').substring(0, 40)
      : 'Total';
    buckets[bucketKey] = (buckets[bucketKey] || 0) + valueForRecord(r);
  });

  return Object.entries(buckets)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
}
