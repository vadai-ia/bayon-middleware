/**
 * Types for the Logs tab (M4). These mirror the `mcp_request_logs` table
 * (supabase/migrations/0001_init_mcp_request_logs.sql). Strict, no `any`.
 */

import type { MCP_LOG_STATUS } from "@/lib/constants";

/** The DB CHECK status vocabulary (ERRORES.md #14 — internal/analytics, not the envelope). */
export type McpLogStatus = (typeof MCP_LOG_STATUS)[keyof typeof MCP_LOG_STATUS];

/**
 * One row of `mcp_request_logs` as read by the panel.
 *
 * `arguments` is real jsonb (ERRORES.md #4). The MCP server writes the tool's
 * `BuscarProductosArgs` here, but the log viewer treats it as an opaque
 * structured payload (`Record<string, unknown>`) so it renders whatever was
 * sent — including attributes not promoted to columns — without coupling the
 * panel to the tool's argument shape.
 */
export interface McpRequestLogRow {
  id: string;
  created_at: string;
  tool_name: string;
  arguments: Record<string, unknown>;
  status: McpLogStatus;
  result_count: number | null;
  duration_ms: number | null;
  norm_query: string | null;
  req_color: string | null;
  req_coleccion: string | null;
  error_message: string | null;
}

/** Filters the Logs tab can apply (all optional). */
export interface LogsFilter {
  status?: McpLogStatus;
  /** Free-text match over the normalized query. */
  query?: string;
  /** Inclusive lower bound (YYYY-MM-DD, local date). */
  from?: string;
  /** Inclusive upper bound (YYYY-MM-DD, local date). */
  to?: string;
}

/** A page of log rows plus the total count for pagination. */
export interface LogsPage {
  rows: McpRequestLogRow[];
  total: number;
  page: number;
  pageSize: number;
}
