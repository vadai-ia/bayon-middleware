/**
 * Async, non-blocking logging of every `buscar_productos` tools/call to
 * `mcp_request_logs` (M3).
 *
 * Design (per CLAUDE.md / ERRORES.md #7 and the M3 brief):
 * - It OBSERVES the tool call — it never alters the response the agent receives.
 * - It is fire-and-forget: the agent never waits on the write.
 * - It is GUARANTEED to complete on Vercel. A naive non-awaited insert is
 *   silently dropped when the serverless function returns and the runtime tears
 *   the process down (ERRORES.md #13). `waitUntil` extends the function lifetime
 *   past the response so the row always lands, without blocking the agent.
 * - A failing/slow log write can NEVER turn into a failed tool call: every error
 *   is swallowed here.
 * - It wraps the CALL, not the data source, so it keeps working unchanged when
 *   M2 swaps the mock searcher for the real one.
 * - Writes go through the service-role admin client (bypasses RLS); the M0
 *   security model is intact — only the service role writes here (ERRORES.md #6).
 */

import { waitUntil } from "@vercel/functions";

import { MCP_LOG_STATUS, TABLES } from "@/lib/constants";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BuscarProductosArgs } from "@/lib/mcp/types";

/** Allowed values for the `status` column (DB CHECK). */
export type McpLogStatus = (typeof MCP_LOG_STATUS)[keyof typeof MCP_LOG_STATUS];

/** Everything one tools/call contributes to a single log row. */
export interface McpLogEntry {
  toolName: string;
  /** Full tool arguments, stored as real jsonb (never stringified — ERRORES.md #4). */
  args: BuscarProductosArgs;
  status: McpLogStatus;
  /** Number of products returned; null when the call errored before a result. */
  resultCount: number | null;
  /** End-to-end handler latency, measured the same way as the envelope durationMs. */
  durationMs: number;
  /** Failure detail when status is `error`/`timeout`. */
  errorMessage?: string | null;
  /**
   * Per-call stock counts for the dashboard availability metric (M5 #5).
   * Null when unobservable (e.g. while the Data Gateway forces its
   * `available = true` default filter — ERRORES.md #20) or on no-results/error.
   * When known, `resultCount = inStockCount + outOfStockCount`.
   */
  inStockCount?: number | null;
  outOfStockCount?: number | null;
}

/**
 * Light, consistent normalization for the analytics-derived columns
 * (`norm_query`, `req_color`, `req_coleccion`): lowercase + strip accents +
 * collapse whitespace + trim. This makes the same value typed two ways
 * ("Arena" / "arena" / "ARENA ") aggregate to a single stored value.
 *
 * This is intentionally NOT M2's query refinement: no color/style synonym
 * mapping (beige→Arena, "Lisos"→"Liso"), no width extraction. It only captures
 * what the agent already sent, cleanly. Returns null for missing/empty input.
 */
function normalizeForAnalytics(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accent marks
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return normalized.length > 0 ? normalized : null;
}

/**
 * Insert one log row. Always resolves: any failure is caught and logged to the
 * server console so it can never propagate into the tool call.
 */
async function writeLog(entry: McpLogEntry): Promise<void> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from(TABLES.MCP_REQUEST_LOGS).insert({
      tool_name: entry.toolName,
      arguments: entry.args,
      status: entry.status,
      result_count: entry.resultCount,
      duration_ms: entry.durationMs,
      norm_query: normalizeForAnalytics(entry.args.query),
      req_color: normalizeForAnalytics(entry.args.color),
      req_coleccion: normalizeForAnalytics(entry.args.coleccion),
      in_stock_count: entry.inStockCount ?? null,
      out_of_stock_count: entry.outOfStockCount ?? null,
      error_message: entry.errorMessage ?? null,
    });
    if (error) {
      console.error(`[mcp-log] insert failed: ${error.message}`);
    }
  } catch (err) {
    console.error(
      `[mcp-log] unexpected logging error: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

/**
 * Fire-and-forget log that is still guaranteed to finish before the Vercel
 * function is frozen/killed. The promise starts executing immediately; on
 * Vercel `waitUntil` keeps the function alive until it settles, without making
 * the agent wait. Outside a request context (local dev / scripts) `waitUntil`
 * may throw — the promise is already running, so we just let it finish.
 */
export function logMcpRequest(entry: McpLogEntry): void {
  const writePromise = writeLog(entry);
  try {
    waitUntil(writePromise);
  } catch {
    // No request context (local dev/scripts): the write is already in flight.
    void writePromise;
  }
}
