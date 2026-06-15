/**
 * Centralized constants. No magic strings scattered across files (CLAUDE.md).
 */

/** Supabase table names. */
export const TABLES = {
  MCP_REQUEST_LOGS: "mcp_request_logs",
} as const;

/** The single MCP tool exposed to Whaapy (read-only). */
export const MCP_TOOL_NAME = "buscar_productos";

/** MCP server identity, reported in the `initialize` handshake (Whaapy spec). */
export const MCP_SERVER_INFO = {
  name: "bayon-middleware-mcp",
  version: "1.0.0",
} as const;

/**
 * Business status values for the response envelope (Whaapy MCP spec).
 * The spec defines exactly these; do not invent new ones.
 */
export const MCP_STATUS = {
  SUCCESS: "success",
  FAILED: "failed",
  NEEDS_MORE_INFO: "needs_more_info",
  PENDING_CONFIRMATION: "pending_confirmation",
  QUEUED: "queued",
} as const;

/** Operation-risk class reported in the envelope. This tool only ever reads. */
export const MCP_SAFETY_READ_ONLY = "read_only";

/**
 * Status vocabulary for the `mcp_request_logs.status` column (matches the DB
 * CHECK constraint in 0001_init_mcp_request_logs.sql).
 *
 * This is DELIBERATELY distinct from MCP_STATUS above: MCP_STATUS is the
 * agent-facing Whaapy envelope vocabulary (e.g. `needs_more_info`), while this
 * is the internal analytics/log vocabulary the dashboard aggregates over (e.g.
 * `no_results`). Logging maps envelope outcomes to these values; it never
 * changes what the agent receives. `timeout` is reserved for M2 (external
 * searcher exceeding its budget); the M1 mock only ever yields the first three.
 */
export const MCP_LOG_STATUS = {
  SUCCESS: "success",
  NO_RESULTS: "no_results",
  ERROR: "error",
  TIMEOUT: "timeout",
} as const;

/**
 * Headers Whaapy may use to send the MCP API key (spec: `api_key` or `bearer`).
 * We accept either; both carry the same shared secret (MCP_API_KEY).
 */
export const MCP_AUTH_HEADERS = {
  API_KEY: "x-api-key",
  AUTHORIZATION: "authorization",
} as const;

/** Prices the tool deals with are MXN including IVA (closed decision). */
export const CURRENCY = "MXN" as const;

/**
 * Generic, short clarifying hint returned (as the spec's `nextQuestion`) when a
 * search yields no results. Intentionally minimal — the Whaapy agent owns the
 * conversation; we only populate the protocol's standard field.
 */
export const MCP_NO_RESULTS_NEXT_QUESTION =
  "¿La buscas para cortina, tapicería o vestir?";

/** MCP request maxDuration (seconds). Aligns with Whaapy's tools/call timeout. */
export const MCP_MAX_DURATION_SECONDS = 30;

/** App routes. */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  LOGS: "/logs",
  DASHBOARD: "/dashboard",
  MCP: "/api/mcp",
} as const;

/** Public routes that the auth middleware must never gate. */
export const PUBLIC_ROUTES = [ROUTES.HOME, ROUTES.LOGIN] as const;
