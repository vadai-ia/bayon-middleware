import { LogsFilters } from "@/components/logs/logs-filters";
import { LogsPagination } from "@/components/logs/logs-pagination";
import { LogsTable } from "@/components/logs/logs-table";
import { LOG_STATUS_OPTIONS } from "@/lib/constants";
import { fetchLogs } from "@/lib/logs/queries";
import type { LogsFilter, McpLogStatus } from "@/lib/logs/types";

/**
 * Logs tab — the RAW technical view of every MCP request (M4).
 * Server Component: reads filters/page from the URL and fetches the matching
 * slice via the user-scoped server client (RLS). Default view: all rows,
 * newest-first, no date pre-filter.
 *
 * Always reflects the live table — never cached.
 */
export const dynamic = "force-dynamic";

type SearchParams = {
  status?: string;
  q?: string;
  from?: string;
  to?: string;
  page?: string;
};

function parseStatus(value: string | undefined): McpLogStatus | undefined {
  return LOG_STATUS_OPTIONS.find((option) => option === value);
}

export default async function LogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const filter: LogsFilter = {
    status: parseStatus(searchParams.status),
    query: searchParams.q?.trim() || undefined,
    from: searchParams.from || undefined,
    to: searchParams.to || undefined,
  };

  const pageParam = Number.parseInt(searchParams.page ?? "1", 10);
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;

  const hasFilters = Boolean(
    filter.status || filter.query || filter.from || filter.to
  );

  const { rows, total, pageSize } = await fetchLogs(filter, page);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3">
        <span
          aria-hidden
          className="w-1 shrink-0 self-stretch rounded-full bg-bayon-red"
        />
        <div>
          <h1 className="font-serif text-2xl font-bold text-bayon-navy">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registro en bruto de cada solicitud del agente al middleware.
          </p>
        </div>
      </div>

      <LogsFilters />

      <LogsTable rows={rows} hasFilters={hasFilters} />

      <LogsPagination page={page} total={total} pageSize={pageSize} />
    </div>
  );
}
