"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import { STOCK_COLORS } from "@/lib/dashboard/chart-theme";

/**
 * Availability donut: products customers asked about that were in stock vs out
 * of stock. Only two segments, so it stays accessibility-safe (the pie caveat is
 * about >5 slices) — blue = available, red = unavailable, a legend with counts +
 * percentages, and the availability rate called out in the center. Color is
 * never the sole signal: every value is also written as text.
 */
export function StockDonut({
  inStock,
  outOfStock,
  height = 220,
}: {
  inStock: number;
  outOfStock: number;
  height?: number;
}) {
  const total = inStock + outOfStock;
  const pct = (value: number) =>
    total === 0 ? 0 : Math.round((value / total) * 100);

  const data = [
    { label: "En stock", value: inStock, color: STOCK_COLORS.inStock },
    { label: "Sin stock", value: outOfStock, color: STOCK_COLORS.outOfStock },
  ];

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-around">
      <div className="relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="62%"
              outerRadius="92%"
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((slice) => (
                <Cell key={slice.label} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip unit="productos" />} />
          </PieChart>
        </ResponsiveContainer>
        <div
          className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"
          aria-hidden
        >
          <span className="font-serif text-2xl font-bold text-bayon-navy">
            {pct(inStock)}%
          </span>
          <span className="text-[11px] text-muted-foreground">en stock</span>
        </div>
      </div>

      <ul className="flex w-full max-w-[220px] flex-col gap-2.5 text-sm">
        {data.map((slice) => (
          <li key={slice.label} className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
              aria-hidden
            />
            <span className="text-bayon-navy">{slice.label}</span>
            <span className="ml-auto font-semibold text-bayon-navy">
              {slice.value}
            </span>
            <span className="w-10 text-right text-xs text-muted-foreground">
              {pct(slice.value)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
