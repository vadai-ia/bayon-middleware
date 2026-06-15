"use client";

import { ChevronDown, ChevronRight, Inbox } from "lucide-react";
import { useState } from "react";

import { LogArguments } from "@/components/logs/log-arguments";
import { LogStatusBadge } from "@/components/logs/log-status-badge";
import {
  formatCount,
  formatDuration,
  formatTimestamp,
  orDash,
} from "@/lib/logs/format";
import type { McpRequestLogRow } from "@/lib/logs/types";
import { cn } from "@/lib/utils";

const GRID_COLS =
  "md:grid-cols-[155px_120px_130px_minmax(120px,1fr)_100px_120px_90px_80px_28px]";

const HEADERS = [
  "Fecha y hora",
  "Tool",
  "Estado",
  "Consulta",
  "Color",
  "Colección",
  "Resultados",
  "Duración",
];

/** A single labelled field (label visible on mobile, hidden on desktop grid). */
function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-2 md:block", className)}>
      <span className="text-xs font-medium text-bayon-blue md:hidden">
        {label}
      </span>
      <span className="text-sm text-black">{children}</span>
    </div>
  );
}

function LogRow({ row }: { row: McpRequestLogRow }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-t border-bayon-navy/10 first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          "grid w-full grid-cols-1 gap-2 px-4 py-3 text-left transition-colors hover:bg-bayon-navy/[0.03]",
          GRID_COLS,
          "md:items-center md:gap-3"
        )}
      >
        <Field label="Fecha y hora">
          <span className="font-mono text-xs text-black">
            {formatTimestamp(row.created_at)}
          </span>
        </Field>
        <Field label="Tool">
          <span className="font-mono text-xs">{row.tool_name}</span>
        </Field>
        <Field label="Estado">
          <LogStatusBadge status={row.status} />
        </Field>
        <Field label="Consulta">
          <span className="line-clamp-2 break-words">{orDash(row.norm_query)}</span>
        </Field>
        <Field label="Color">{orDash(row.req_color)}</Field>
        <Field label="Colección">{orDash(row.req_coleccion)}</Field>
        <Field label="Resultados" className="md:text-right">
          {formatCount(row.result_count)}
        </Field>
        <Field label="Duración" className="md:text-right">
          {formatDuration(row.duration_ms)}
        </Field>
        <span className="hidden items-center justify-center text-bayon-navy/50 md:flex">
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </span>
      </button>

      {open && (
        <div className="border-t border-bayon-navy/10 bg-bayon-navy/[0.02] px-4 py-4">
          <div className="flex flex-col gap-4">
            <section>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bayon-navy">
                Argumentos
              </h4>
              <div className="rounded-md border border-bayon-navy/10 bg-white p-3">
                <LogArguments data={row.arguments} />
              </div>
            </section>

            {row.error_message && (
              <section>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-bayon-red">
                  Detalle del error
                </h4>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-bayon-red/20 bg-bayon-red/5 p-3 text-sm text-bayon-red">
                  {row.error_message}
                </pre>
              </section>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bayon-navy/5 text-bayon-navy/60">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="font-serif text-lg font-semibold text-bayon-navy">
        {hasFilters
          ? "Sin resultados para estos filtros"
          : "Aún no hay solicitudes registradas"}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {hasFilters
          ? "Ajusta o limpia los filtros para ver más registros."
          : "Cuando el agente de Whaapy realice búsquedas, aparecerán aquí en tiempo real."}
      </p>
    </div>
  );
}

export function LogsTable({
  rows,
  hasFilters,
}: {
  rows: McpRequestLogRow[];
  hasFilters: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-bayon-navy/10 bg-white">
      {/* Desktop column header */}
      <div
        className={cn(
          "hidden gap-3 bg-bayon-navy px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-white md:grid",
          GRID_COLS
        )}
      >
        {HEADERS.map((header, idx) => (
          <span
            key={header}
            className={cn(
              idx === 6 || idx === 7 ? "text-right" : undefined
            )}
          >
            {header}
          </span>
        ))}
        <span aria-hidden />
      </div>

      {rows.length === 0 ? (
        <EmptyState hasFilters={hasFilters} />
      ) : (
        rows.map((row) => <LogRow key={row.id} row={row} />)
      )}
    </div>
  );
}
