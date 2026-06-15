"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  LOG_STATUS_LABELS,
  LOG_STATUS_OPTIONS,
  ROUTES,
} from "@/lib/constants";

const INPUT_CLASS =
  "h-10 rounded-md border border-bayon-navy/20 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-bayon-blue focus:ring-2 focus:ring-bayon-blue/30";

/**
 * Logs filter bar. Filters live in the URL search params so the Server Component
 * page re-reads them and pagination/filters compose. Submitting resets to page 1.
 */
export function LogsFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const [status, setStatus] = useState(params.get("status") ?? "");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [from, setFrom] = useState(params.get("from") ?? "");
  const [to, setTo] = useState(params.get("to") ?? "");

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = new URLSearchParams();
    if (status) next.set("status", status);
    if (query.trim()) next.set("q", query.trim());
    if (from) next.set("from", from);
    if (to) next.set("to", to);
    // Omit page → back to page 1 on every new filter.
    const qs = next.toString();
    router.replace(qs ? `${ROUTES.LOGS}?${qs}` : ROUTES.LOGS);
  }

  function clear() {
    setStatus("");
    setQuery("");
    setFrom("");
    setTo("");
    router.replace(ROUTES.LOGS);
  }

  return (
    <form
      onSubmit={apply}
      className="grid grid-cols-1 gap-3 rounded-lg border border-bayon-navy/10 border-t-2 border-t-bayon-yellow bg-white p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
    >
      <label className="flex flex-col gap-1.5 lg:col-span-2">
        <span className="text-xs font-medium text-bayon-navy">
          Buscar en la consulta
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="p. ej. blackout, lino…"
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-bayon-navy">Estado</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Todos</option>
          {LOG_STATUS_OPTIONS.map((value) => (
            <option key={value} value={value}>
              {LOG_STATUS_LABELS[value]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-bayon-navy">Desde</span>
        <input
          type="date"
          value={from}
          max={to || undefined}
          onChange={(e) => setFrom(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-bayon-navy">Hasta</span>
        <input
          type="date"
          value={to}
          min={from || undefined}
          onChange={(e) => setTo(e.target.value)}
          className={INPUT_CLASS}
        />
      </label>

      <div className="flex gap-2 sm:col-span-2 lg:col-span-5">
        <Button
          type="submit"
          className="bg-bayon-navy text-white hover:bg-bayon-blue"
        >
          Filtrar
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          className="border-bayon-navy/20 text-bayon-navy hover:bg-bayon-navy/5"
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}
