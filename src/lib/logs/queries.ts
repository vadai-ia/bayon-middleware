import { LOGS_PAGE_SIZE, TABLES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";
import type { LogsFilter, LogsPage, McpRequestLogRow } from "@/lib/logs/types";

/**
 * Read a page of logs for the panel.
 *
 * SECURITY: uses the user-scoped server client (anon key + session cookie), so
 * the read runs as the authenticated admin under RLS — the `authenticated can
 * read logs` SELECT policy. The service-role/admin client is NEVER used here
 * (ERRORES.md #6). This module imports the server client, which uses
 * `next/headers` — Next.js fails the build if a Client Component transitively
 * imports it, so this data path can never reach the browser bundle.
 *
 * Rows are newest-first; pagination is server-side via `range()` with an exact
 * count so the tab stays fast as the table grows.
 */
export async function fetchLogs(
  filter: LogsFilter,
  page: number
): Promise<LogsPage> {
  const supabase = createClient();
  const safePage = page > 0 ? page : 1;
  const fromIdx = (safePage - 1) * LOGS_PAGE_SIZE;
  const toIdx = fromIdx + LOGS_PAGE_SIZE - 1;

  let queryBuilder = supabase
    .from(TABLES.MCP_REQUEST_LOGS)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  if (filter.status) {
    queryBuilder = queryBuilder.eq("status", filter.status);
  }

  if (filter.query) {
    // Case-insensitive contains over the normalized query column.
    queryBuilder = queryBuilder.ilike("norm_query", `%${filter.query}%`);
  }

  if (filter.from) {
    queryBuilder = queryBuilder.gte("created_at", filter.from);
  }

  if (filter.to) {
    // Inclusive upper bound: everything strictly before the day AFTER `to`.
    const next = new Date(`${filter.to}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    queryBuilder = queryBuilder.lt("created_at", next.toISOString());
  }

  const { data, count, error } = await queryBuilder;

  if (error) {
    throw new Error(`No se pudieron cargar los logs: ${error.message}`);
  }

  return {
    rows: (data ?? []) as McpRequestLogRow[],
    total: count ?? 0,
    page: safePage,
    pageSize: LOGS_PAGE_SIZE,
  };
}
