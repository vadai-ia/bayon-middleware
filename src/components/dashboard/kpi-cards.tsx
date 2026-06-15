import { cn } from "@/lib/utils";
import type { DashboardSummary } from "@/lib/dashboard/types";

/**
 * Headline KPI cards: total volume + the success / no-results split + average
 * latency. Plain Server Component. No-results gets the red accent because it is
 * the demand-side signal Bayón acts on; color is paired with a label so it is
 * never the only cue.
 *
 * The total card's hint surfaces `errors`, which the summary RPC counts as
 * `error` + `timeout` together (see dashboard_summary). It is labeled "con
 * fallos" — NOT "con error" — so the KPI honestly reflects what it counts and
 * stays consistent with the Logs tab, where `error` and `timeout` remain
 * separate raw statuses.
 */
export function KpiCards({ summary }: { summary: DashboardSummary }) {
  const { totalCalls, success, noResults, errors, avgDurationMs } = summary;
  const rate = (value: number) =>
    totalCalls === 0 ? "—" : `${Math.round((value / totalCalls) * 100)}%`;

  const cards = [
    {
      label: "Búsquedas totales",
      value: totalCalls.toLocaleString("es-MX"),
      hint: errors > 0 ? `${errors} con fallos` : "en el periodo",
      accent: "navy" as const,
    },
    {
      label: "Con resultados",
      value: rate(success),
      hint: `${success.toLocaleString("es-MX")} búsquedas`,
      accent: "blue" as const,
    },
    {
      label: "Sin resultados",
      value: rate(noResults),
      hint: `${noResults.toLocaleString("es-MX")} búsquedas`,
      accent: "red" as const,
    },
    {
      label: "Latencia media",
      value: avgDurationMs === null ? "—" : `${avgDurationMs} ms`,
      hint: "respuesta del middleware",
      accent: "navy" as const,
    },
  ];

  const accentClass = {
    navy: "text-bayon-navy",
    blue: "text-bayon-blue",
    red: "text-bayon-red",
  };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-bayon-navy/10 bg-white p-4 shadow-sm"
        >
          <p className="text-xs font-medium text-muted-foreground">
            {card.label}
          </p>
          <p
            className={cn(
              "mt-1 font-serif text-2xl font-bold sm:text-3xl",
              accentClass[card.accent]
            )}
          >
            {card.value}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{card.hint}</p>
        </div>
      ))}
    </div>
  );
}
