/**
 * Display formatters for the Logs tab.
 *
 * Timestamps are formatted in a FIXED timezone (Bayón is in Mexico) via Intl, so
 * the output is identical on the server prerender and the client hydration — no
 * React hydration mismatch (which a locale/`toLocaleString` default would risk).
 */

const TIMEZONE = "America/Mexico_City";

const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("es-MX", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** "14/06/2026, 13:05:09" */
export function formatTimestamp(iso: string): string {
  return TIMESTAMP_FORMAT.format(new Date(iso));
}

/** Compact latency: "842 ms" or "1.2 s". Null → em dash. */
export function formatDuration(ms: number | null): string {
  if (ms === null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

/** Result count, with a stable placeholder for null. */
export function formatCount(count: number | null): string {
  return count === null ? "—" : String(count);
}

/** Generic placeholder for empty text fields. */
export function orDash(value: string | null): string {
  return value && value.length > 0 ? value : "—";
}
