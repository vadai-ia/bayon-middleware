/**
 * Centralized constants. No magic strings scattered across files (CLAUDE.md).
 */

/** Supabase table names. */
export const TABLES = {
  MCP_REQUEST_LOGS: "mcp_request_logs",
} as const;

/** The single MCP tool exposed to Whaapy (read-only). Implemented in M1. */
export const MCP_TOOL_NAME = "buscar_productos";

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
