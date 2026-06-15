/**
 * Types for the Dashboard tab (M5). The aggregated shapes mirror what the SQL
 * functions in migration 0002 return; the data layer (queries.ts) coerces every
 * numeric to a JS `number` so these stay clean (no string/number ambiguity from
 * PostgREST bigint/numeric serialization). Strict — no `any`.
 */

import type { DASHBOARD_RANGES } from "@/lib/constants";

/** A single ranking row: a label and its frequency. */
export interface LabelCount {
  label: string;
  n: number;
}

/** Activity by hour of day (0–23, Bayón local time). */
export interface HourCount {
  hour: number;
  n: number;
}

/** Activity by weekday (Postgres dow: 0 = Sunday … 6 = Saturday). */
export interface WeekdayCount {
  dow: number;
  n: number;
}

/** Headline KPIs for the top cards. */
export interface DashboardSummary {
  totalCalls: number;
  success: number;
  noResults: number;
  errors: number;
  avgDurationMs: number | null;
}

/** Availability / stock aggregates (Q5). */
export interface StockSummary {
  inStock: number;
  outOfStock: number;
  productsTotal: number;
  /** Calls that matched ≥1 product (in + out > 0). */
  searchesWithResults: number;
  /** Calls that matched products but none were in stock. */
  searchesNoStock: number;
}

/** Everything the Dashboard page renders, pre-aggregated server-side. */
export interface DashboardData {
  summary: DashboardSummary;
  unmetTerms: LabelCount[];
  unmetColors: LabelCount[];
  unmetCollections: LabelCount[];
  topTerms: LabelCount[];
  topColors: LabelCount[];
  topCollections: LabelCount[];
  attrFabric: LabelCount[];
  attrEstilo: LabelCount[];
  attrComposicion: LabelCount[];
  widthBuckets: LabelCount[];
  activityHourly: HourCount[];
  activityWeekday: WeekdayCount[];
  stock: StockSummary;
}

/** The `key` of one of the DASHBOARD_RANGES presets. */
export type DashboardRangeKey = (typeof DASHBOARD_RANGES)[number]["key"];

/**
 * A resolved range: the preset key plus the concrete bounds passed to the SQL
 * functions. `from` is an inclusive ISO lower bound, `to` an EXCLUSIVE ISO upper
 * bound; `null` on either side means "unbounded" (used by the "Todo" preset).
 */
export interface DashboardRange {
  key: DashboardRangeKey;
  from: string | null;
  to: string | null;
}
