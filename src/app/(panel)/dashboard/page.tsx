import { BarChart3 } from "lucide-react";

/**
 * Dashboard tab — PLACEHOLDER (M4). The real 8-metric business dashboard is M5;
 * this only reserves the tab inside the shared panel shell so M5 fills it in
 * without reworking navigation.
 */
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-2xl font-bold text-bayon-navy">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Métricas de negocio de las búsquedas.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-bayon-navy/20 bg-white px-6 py-20 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bayon-yellow/25 text-bayon-navy">
          <BarChart3 className="h-6 w-6" />
        </span>
        <p className="font-serif text-lg font-semibold text-bayon-navy">
          Próximamente
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          El panel de métricas de negocio llegará en la siguiente entrega.
        </p>
      </div>
    </div>
  );
}
