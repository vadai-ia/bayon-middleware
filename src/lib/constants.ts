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

/**
 * Prices the tool deals with are MXN, taken exactly as the Data Gateway returns
 * them — the same price shown on telasbayon.com (what the customer pays). No IVA
 * math, no conversion (M2 closed decision). `precio_max` filters against it 1:1.
 */
export const CURRENCY = "MXN" as const;

// =============================================================================
// External searcher — Whaapy Data Gateway (M2)
// =============================================================================

/**
 * Data Gateway integration (server-to-server REST). Base URL and key come from
 * the env vars `BUSCADOR_EXTERNO_URL` / `BUSCADOR_EXTERNO_API_KEY`; the key is
 * SERVER-ONLY and must never reach the client bundle (ERRORES.md #6).
 *
 * We call the `search_variant` compiled tool's invoke endpoint — it validates
 * against the published schema and runs the same hybrid search as `/query`.
 * Entity is `variant` (not `product`). The exact lookup tool
 * (`check_availability_variant`) is intentionally NOT used in V1.
 */
export const DATA_GATEWAY = {
  /** Path appended to BUSCADOR_EXTERNO_URL for the search invoke. */
  SEARCH_PATH: "/tools/search_variant/invoke",
} as const;

/**
 * Max results requested from the Data Gateway per call. Kept small so the
 * agent's context and our logs stay lean — a handful, not the whole catalog.
 */
export const BUSCADOR_RESULT_LIMIT = 8;

/**
 * Time budget for the Data Gateway call (ms). Well under Whaapy's 30s
 * tools/call limit (ERRORES.md #7); on timeout we return a clean failed status.
 */
export const BUSCADOR_TIMEOUT_MS = 20_000;

/**
 * Spanish-friendly message returned in the envelope when the searcher fails or
 * times out — never a hang or an unhandled error (ERRORES.md #7).
 */
export const MCP_SEARCHER_FAILED_MESSAGE =
  "No pude consultar el catálogo en este momento. Intenta de nuevo en unos segundos.";

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

// =============================================================================
// Panel (M4)
// =============================================================================

/** Top-level panel navigation tabs. Order = display order. */
export const PANEL_NAV = [
  { href: ROUTES.LOGS, label: "Logs" },
  { href: ROUTES.DASHBOARD, label: "Dashboard" },
] as const;

/** Rows per page in the Logs tab (server-side pagination). */
export const LOGS_PAGE_SIZE = 20;

/**
 * Human (Spanish) labels for each `mcp_request_logs.status` value. Keyed by the
 * DB CHECK vocabulary (MCP_LOG_STATUS), NOT the Whaapy envelope vocabulary
 * (ERRORES.md #14). This is still the RAW technical view — labels are short
 * status names, not business translations (that's M5's job).
 */
export const LOG_STATUS_LABELS: Record<
  (typeof MCP_LOG_STATUS)[keyof typeof MCP_LOG_STATUS],
  string
> = {
  [MCP_LOG_STATUS.SUCCESS]: "Éxito",
  [MCP_LOG_STATUS.NO_RESULTS]: "Sin resultados",
  [MCP_LOG_STATUS.ERROR]: "Error",
  [MCP_LOG_STATUS.TIMEOUT]: "Timeout",
};

/** Status options for the Logs filter dropdown (in display order). */
export const LOG_STATUS_OPTIONS = [
  MCP_LOG_STATUS.SUCCESS,
  MCP_LOG_STATUS.NO_RESULTS,
  MCP_LOG_STATUS.ERROR,
  MCP_LOG_STATUS.TIMEOUT,
] as const;

// =============================================================================
// Dashboard (M5)
// =============================================================================

/** Names of the SQL aggregation functions (RPC) added in migration 0002. */
export const DASHBOARD_RPC = {
  SUMMARY: "dashboard_summary",
  TERM_COUNTS: "dashboard_term_counts",
  COLOR_COUNTS: "dashboard_color_counts",
  COLLECTION_COUNTS: "dashboard_collection_counts",
  ATTRIBUTE_COUNTS: "dashboard_attribute_counts",
  WIDTH_BUCKETS: "dashboard_width_buckets",
  ACTIVITY_HOURLY: "dashboard_activity_hourly",
  ACTIVITY_WEEKDAY: "dashboard_activity_weekday",
  STOCK_SUMMARY: "dashboard_stock_summary",
} as const;

/** Whitelisted technical-attribute keys read from the arguments jsonb (Q8). */
export const ATTRIBUTE_KEYS = {
  TIPO_DE_TELA: "tipo_de_tela",
  ESTILO: "estilo",
  COMPOSICION: "composicion",
} as const;

/** Default number of rows shown in each ranking chart. */
export const DASHBOARD_RANKING_LIMIT = 8;

/**
 * Date-range presets for the dashboard. `days = null` means "all time".
 * Order = display order. Default is 90 days (covers the M5 seed window).
 */
export const DASHBOARD_RANGES = [
  { key: "7", label: "7 días", days: 7 },
  { key: "30", label: "30 días", days: 30 },
  { key: "90", label: "90 días", days: 90 },
  { key: "all", label: "Todo", days: null },
] as const;

/** Default range when none is supplied in the URL. */
export const DASHBOARD_DEFAULT_RANGE = "90" as const;

/**
 * Weekday labels indexed by Postgres `dow` (0 = Sunday … 6 = Saturday).
 * Spanish, short form, for the activity-by-weekday chart.
 */
export const WEEKDAY_LABELS = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;
