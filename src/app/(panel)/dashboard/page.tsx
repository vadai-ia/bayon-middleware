import { BrandAccentBar } from "@/components/brand/brand-accent-bar";
import {
  ActivityHourlyChart,
  ActivityWeekdayChart,
} from "@/components/dashboard/activity-charts";
import {
  DashboardCard,
  EmptyChart,
} from "@/components/dashboard/dashboard-card";
import { DashboardRangeControl } from "@/components/dashboard/dashboard-range-control";
import { KpiCards } from "@/components/dashboard/kpi-cards";
import { RankingBarChart } from "@/components/dashboard/ranking-bar-chart";
import { StockDonut } from "@/components/dashboard/stock-donut";
import { ATTRIBUTE_COLORS } from "@/lib/dashboard/chart-theme";
import { fetchDashboard, resolveRange } from "@/lib/dashboard/queries";
import {
  fillHours,
  fillWeekdays,
  prettyRanking,
} from "@/lib/dashboard/format";
import type { LabelCount } from "@/lib/dashboard/types";

/**
 * Dashboard tab — the BUSINESS view of the MCP logs (M5). Where the Logs tab is
 * the raw technical record, this turns logs into the 8 questions a fabric
 * merchant acts on (DOCTRINE.md). Server Component: reads the range from the URL,
 * aggregates in Postgres via the user-scoped client (RLS), and hands plain data
 * to the client chart islands (ERRORES.md #9 — no service role in the bundle,
 * #6). Always live, never cached.
 *
 * Visual weight follows the brief: unmet demand and most-searched terms are the
 * most prominent; the rest follow.
 */
export const dynamic = "force-dynamic";

type SearchParams = { range?: string };

/** Render a chart when there's data, else the shared empty state. */
function chartOrEmpty(
  data: LabelCount[],
  chart: React.ReactNode,
  height = 192
): React.ReactNode {
  return data.length > 0 ? chart : <EmptyChart height={height} />;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const range = resolveRange(searchParams.range);
  const data = await fetchDashboard(range);

  const unmetTerms = prettyRanking(data.unmetTerms);
  const unmetColors = prettyRanking(data.unmetColors);
  const unmetCollections = prettyRanking(data.unmetCollections);
  const topTerms = prettyRanking(data.topTerms);
  const topColors = prettyRanking(data.topColors);
  const topCollections = prettyRanking(data.topCollections);
  const attrFabric = prettyRanking(data.attrFabric);
  const attrEstilo = prettyRanking(data.attrEstilo);
  const attrComposicion = prettyRanking(data.attrComposicion);
  const widthBuckets = data.widthBuckets; // already display-ready labels
  const hours = fillHours(data.activityHourly);
  const weekdays = fillWeekdays(data.activityWeekday);
  const { stock } = data;
  const hasStock = stock.inStock + stock.outOfStock > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Header + range control */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex gap-3">
          <BrandAccentBar
            orientation="vertical"
            className="w-1.5 shrink-0 self-stretch rounded-full"
          />
          <div>
            <h1 className="font-serif text-2xl font-bold text-bayon-navy">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Qué buscan los clientes de Telas Bayón y qué no encontramos.
            </p>
          </div>
        </div>
        <DashboardRangeControl active={range.key} />
      </div>

      {/* Headline KPIs */}
      <KpiCards summary={data.summary} />

      {/* 1 — Unmet demand (most prominent) */}
      <DashboardCard
        title="Demanda no satisfecha"
        description="Búsquedas que no encontraron nada. La métrica más accionable: dice qué conviene tener en stock."
        prominent
      >
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Búsquedas sin resultados
            </h3>
            {chartOrEmpty(
              unmetTerms,
              <RankingBarChart
                data={unmetTerms}
                unit="búsquedas sin resultado"
                accentTop
                ariaLabel="Ranking de búsquedas que no encontraron resultados"
              />
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Colores pedidos sin coincidencia
            </h3>
            {chartOrEmpty(
              unmetColors,
              <RankingBarChart
                data={unmetColors}
                unit="búsquedas sin resultado"
                ariaLabel="Colores más pedidos sin coincidencia"
              />
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Colecciones pedidas sin coincidencia
            </h3>
            {chartOrEmpty(
              unmetCollections,
              <RankingBarChart
                data={unmetCollections}
                unit="búsquedas sin resultado"
                ariaLabel="Colecciones más pedidas sin coincidencia"
              />
            )}
          </div>
        </div>
      </DashboardCard>

      {/* 2 — Most-searched terms (prominent) */}
      <DashboardCard
        title="Términos más buscados"
        description="Lo que los clientes piden con más frecuencia."
        prominent
      >
        {chartOrEmpty(
          topTerms,
          <RankingBarChart
            data={topTerms}
            ariaLabel="Ranking de términos más buscados"
            height={280}
          />,
          240
        )}
      </DashboardCard>

      {/* 3 & 4 — Colors and collections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Colores más pedidos"
          description="Ranking de colores solicitados."
        >
          {chartOrEmpty(
            topColors,
            <RankingBarChart
              data={topColors}
              ariaLabel="Ranking de colores más pedidos"
            />
          )}
        </DashboardCard>
        <DashboardCard
          title="Colecciones más buscadas"
          description="Categorías del catálogo que dominan la intención."
        >
          {chartOrEmpty(
            topCollections,
            <RankingBarChart
              data={topCollections}
              ariaLabel="Ranking de colecciones más buscadas"
            />
          )}
        </DashboardCard>
      </div>

      {/* 5 — Technical attributes */}
      <DashboardCard
        title="Atributos técnicos más consultados"
        description="Los filtros técnicos sobre los que más preguntan los clientes."
      >
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Tipo de tela
            </h3>
            {chartOrEmpty(
              attrFabric,
              <RankingBarChart
                data={attrFabric}
                unit="consultas"
                color={ATTRIBUTE_COLORS.tipo_de_tela}
                ariaLabel="Tipos de tela más consultados"
                height={200}
              />,
              176
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Estilo
            </h3>
            {chartOrEmpty(
              attrEstilo,
              <RankingBarChart
                data={attrEstilo}
                unit="consultas"
                color={ATTRIBUTE_COLORS.estilo}
                ariaLabel="Estilos más consultados"
                height={200}
              />,
              176
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Composición
            </h3>
            {chartOrEmpty(
              attrComposicion,
              <RankingBarChart
                data={attrComposicion}
                unit="consultas"
                color={ATTRIBUTE_COLORS.composicion}
                ariaLabel="Composiciones más consultadas"
                height={200}
              />,
              176
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-bayon-navy">
              Ancho solicitado
            </h3>
            {chartOrEmpty(
              widthBuckets,
              <RankingBarChart
                data={widthBuckets}
                unit="consultas"
                color={ATTRIBUTE_COLORS.width}
                ariaLabel="Anchos más solicitados"
                height={200}
              />,
              176
            )}
          </div>
        </div>
      </DashboardCard>

      {/* 6 — Activity over time */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <DashboardCard
          title="Actividad por hora"
          description="Cuándo preguntan los clientes (hora local de Bayón)."
        >
          <ActivityHourlyChart data={hours} />
        </DashboardCard>
        <DashboardCard
          title="Actividad por día"
          description="Días de la semana con más consultas."
        >
          <ActivityWeekdayChart data={weekdays} />
        </DashboardCard>
      </div>

      {/* 7 — Availability / stock */}
      <DashboardCard
        title="Disponibilidad de lo consultado"
        description="De los productos que coincidieron con las búsquedas, cuántos estaban en stock."
      >
        {hasStock ? (
          <div className="flex flex-col gap-5">
            <StockDonut inStock={stock.inStock} outOfStock={stock.outOfStock} />
            <p className="rounded-md bg-bayon-yellow/15 px-4 py-3 text-sm text-bayon-navy">
              <span className="font-semibold">{stock.searchesNoStock}</span> de{" "}
              <span className="font-semibold">{stock.searchesWithResults}</span>{" "}
              búsquedas con coincidencias no tuvieron ninguna pieza en stock.
            </p>
          </div>
        ) : (
          <EmptyChart
            message="Aún no hay datos de stock para este periodo."
            height={220}
          />
        )}
      </DashboardCard>
    </div>
  );
}
