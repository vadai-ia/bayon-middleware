/**
 * Presentational formatting for the Dashboard (M5). Pure functions — importable
 * from Server or Client Components.
 *
 * The analytics columns are stored normalized (lowercased, accent-stripped — see
 * lib/mcp/logging.ts), which is right for aggregation but not for display. These
 * helpers turn aggregates into human-readable, brand-consistent labels.
 */

import { WEEKDAY_LABELS } from "@/lib/constants";
import type { HourCount, LabelCount, WeekdayCount } from "@/lib/dashboard/types";

/** Capitalize each word ("loneta lisa" → "Loneta Lisa"). */
export function prettyLabel(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Apply `prettyLabel` to the `label` of each ranking row. */
export function prettyRanking(rows: LabelCount[]): LabelCount[] {
  return rows.map((row) => ({ ...row, label: prettyLabel(row.label) }));
}

/** "14:00" for hour 14. */
export function formatHour(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

/** A point on the activity-by-hour line, ready for the chart. */
export interface HourPoint {
  hour: number;
  label: string;
  n: number;
}

/**
 * Fill the sparse hourly aggregate into a continuous 0–23 series (missing hours
 * → 0) so the line chart has no gaps.
 */
export function fillHours(rows: HourCount[]): HourPoint[] {
  const byHour = new Map(rows.map((r) => [r.hour, r.n]));
  return Array.from({ length: 24 }, (_, hour) => ({
    hour,
    label: formatHour(hour),
    n: byHour.get(hour) ?? 0,
  }));
}

/** A bar on the activity-by-weekday chart, ready for the chart. */
export interface WeekdayPoint {
  dow: number;
  label: string;
  n: number;
}

/**
 * Fill the sparse weekday aggregate into a full week, ordered Mon→Sun (the
 * business-week reading) rather than Postgres' Sun→Sat dow order.
 */
export function fillWeekdays(rows: WeekdayCount[]): WeekdayPoint[] {
  const byDow = new Map(rows.map((r) => [r.dow, r.n]));
  const order = [1, 2, 3, 4, 5, 6, 0]; // Lun … Dom
  return order.map((dow) => ({
    dow,
    label: WEEKDAY_LABELS[dow],
    n: byDow.get(dow) ?? 0,
  }));
}
