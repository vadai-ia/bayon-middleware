/**
 * Server-side data layer for the Dashboard tab (M5).
 *
 * SECURITY: like the Logs read path, this uses the user-scoped server client
 * (anon key + session cookie), so every aggregation runs as the authenticated
 * admin under RLS. The service-role/admin client is NEVER used here
 * (ERRORES.md #6). This module imports the server Supabase client, which uses
 * `next/headers` — Next.js fails the build if a Client Component transitively
 * imports it, so this path can never reach the browser bundle (ERRORES.md #15).
 *
 * EFFICIENCY: all aggregation happens in Postgres via the migration-0002
 * functions (RPC) against the indexed columns; we never pull the table into
 * memory. PostgREST may serialize bigint/numeric as strings — every value is
 * coerced to a JS `number` here so the typed shapes stay clean.
 */

import {
  ATTRIBUTE_KEYS,
  DASHBOARD_RANGES,
  DASHBOARD_RANKING_LIMIT,
  DASHBOARD_RPC,
} from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type {
  DashboardData,
  DashboardRange,
  DashboardRangeKey,
  HourCount,
  LabelCount,
  WeekdayCount,
} from "@/lib/dashboard/types";

type SupabaseServerClient = ReturnType<typeof createClient>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Coerce a PostgREST scalar (number | string | null) to a finite number. */
function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Coerce to a finite number or null (for averages that can be absent). */
function numOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolve a range-preset key into concrete bounds for the SQL functions.
 * `from` is an inclusive ISO lower bound; `to` stays null (open-ended up to
 * now). "all" yields null/null. Unknown keys fall back to the default preset.
 */
export function resolveRange(key: string | undefined): DashboardRange {
  const preset =
    DASHBOARD_RANGES.find((r) => r.key === key) ??
    DASHBOARD_RANGES.find((r) => r.key === "90")!;

  if (preset.days === null) {
    return { key: preset.key, from: null, to: null };
  }

  const from = new Date(Date.now() - preset.days * DAY_MS).toISOString();
  return { key: preset.key as DashboardRangeKey, from, to: null };
}

/** Map the RPC's `{ p_from, p_to }` parameters from a resolved range. */
function rangeParams(range: DashboardRange): {
  p_from: string | null;
  p_to: string | null;
} {
  return { p_from: range.from, p_to: range.to };
}

/** Run a set-returning RPC and map rows to `LabelCount[]`. */
async function labelCounts(
  supabase: SupabaseServerClient,
  fn: string,
  params: Record<string, unknown>
): Promise<LabelCount[]> {
  const { data, error } = await supabase.rpc(fn, params);
  if (error) {
    throw new Error(`Dashboard (${fn}) falló: ${error.message}`);
  }
  return (data ?? []).map((row: { label: string | null; n: unknown }) => ({
    label: row.label ?? "—",
    n: num(row.n),
  }));
}

/**
 * Fetch every dashboard aggregate for the given range. All RPCs run in parallel.
 */
export async function fetchDashboard(
  range: DashboardRange
): Promise<DashboardData> {
  const supabase = createClient();
  const params = rangeParams(range);
  const rank = { ...params, p_limit: DASHBOARD_RANKING_LIMIT };

  const [
    summaryRes,
    unmetTerms,
    unmetColors,
    unmetCollections,
    topTerms,
    topColors,
    topCollections,
    attrFabric,
    attrEstilo,
    attrComposicion,
    widthBuckets,
    activityHourlyRes,
    activityWeekdayRes,
    stockRes,
  ] = await Promise.all([
    supabase.rpc(DASHBOARD_RPC.SUMMARY, params),
    labelCounts(supabase, DASHBOARD_RPC.TERM_COUNTS, {
      ...rank,
      p_only_no_results: true,
    }),
    labelCounts(supabase, DASHBOARD_RPC.COLOR_COUNTS, {
      ...rank,
      p_only_no_results: true,
    }),
    labelCounts(supabase, DASHBOARD_RPC.COLLECTION_COUNTS, {
      ...rank,
      p_only_no_results: true,
    }),
    labelCounts(supabase, DASHBOARD_RPC.TERM_COUNTS, {
      ...rank,
      p_only_no_results: false,
    }),
    labelCounts(supabase, DASHBOARD_RPC.COLOR_COUNTS, {
      ...rank,
      p_only_no_results: false,
    }),
    labelCounts(supabase, DASHBOARD_RPC.COLLECTION_COUNTS, {
      ...rank,
      p_only_no_results: false,
    }),
    labelCounts(supabase, DASHBOARD_RPC.ATTRIBUTE_COUNTS, {
      ...rank,
      p_attr: ATTRIBUTE_KEYS.TIPO_DE_TELA,
    }),
    labelCounts(supabase, DASHBOARD_RPC.ATTRIBUTE_COUNTS, {
      ...rank,
      p_attr: ATTRIBUTE_KEYS.ESTILO,
    }),
    labelCounts(supabase, DASHBOARD_RPC.ATTRIBUTE_COUNTS, {
      ...rank,
      p_attr: ATTRIBUTE_KEYS.COMPOSICION,
    }),
    labelCounts(supabase, DASHBOARD_RPC.WIDTH_BUCKETS, params),
    supabase.rpc(DASHBOARD_RPC.ACTIVITY_HOURLY, params),
    supabase.rpc(DASHBOARD_RPC.ACTIVITY_WEEKDAY, params),
    supabase.rpc(DASHBOARD_RPC.STOCK_SUMMARY, params),
  ]);

  if (summaryRes.error) {
    throw new Error(`Dashboard (summary) falló: ${summaryRes.error.message}`);
  }
  if (activityHourlyRes.error) {
    throw new Error(
      `Dashboard (activity hourly) falló: ${activityHourlyRes.error.message}`
    );
  }
  if (activityWeekdayRes.error) {
    throw new Error(
      `Dashboard (activity weekday) falló: ${activityWeekdayRes.error.message}`
    );
  }
  if (stockRes.error) {
    throw new Error(`Dashboard (stock) falló: ${stockRes.error.message}`);
  }

  const summaryRow = (summaryRes.data ?? [])[0] ?? {};
  const stockRow = (stockRes.data ?? [])[0] ?? {};

  const activityHourly: HourCount[] = (activityHourlyRes.data ?? []).map(
    (row: { hour: unknown; n: unknown }) => ({
      hour: num(row.hour),
      n: num(row.n),
    })
  );
  const activityWeekday: WeekdayCount[] = (activityWeekdayRes.data ?? []).map(
    (row: { dow: unknown; n: unknown }) => ({
      dow: num(row.dow),
      n: num(row.n),
    })
  );

  return {
    summary: {
      totalCalls: num(summaryRow.total_calls),
      success: num(summaryRow.success),
      noResults: num(summaryRow.no_results),
      errors: num(summaryRow.errors),
      avgDurationMs: numOrNull(summaryRow.avg_duration_ms),
    },
    unmetTerms,
    unmetColors,
    unmetCollections,
    topTerms,
    topColors,
    topCollections,
    attrFabric,
    attrEstilo,
    attrComposicion,
    widthBuckets,
    activityHourly,
    activityWeekday,
    stock: {
      inStock: num(stockRow.in_stock),
      outOfStock: num(stockRow.out_of_stock),
      productsTotal: num(stockRow.products_total),
      searchesWithResults: num(stockRow.searches_with_results),
      searchesNoStock: num(stockRow.searches_no_stock),
    },
  };
}
