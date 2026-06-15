"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  CHART_INK,
  RANKING_BAR,
  RANKING_BAR_ACCENT,
} from "@/lib/dashboard/chart-theme";
import type { LabelCount } from "@/lib/dashboard/types";

/** Truncate long category labels on the axis; the tooltip shows the full text. */
function truncate(value: string): string {
  return value.length > 18 ? `${value.slice(0, 17)}…` : value;
}

/**
 * Horizontal bar chart for a single-series ranking (sorted desc upstream). One
 * hue per chart with an optional red accent on the #1 bar — more legible than
 * rainbow bars (ui-ux-pro-max: distinct color per bar matters when comparing
 * categories, but a ranking of ONE measure reads best as a single hue). Value
 * labels sit at the bar ends; the SVG carries an `aria-label` summary and the
 * tooltip exposes the untruncated label for keyboard/hover users.
 */
export function RankingBarChart({
  data,
  unit = "búsquedas",
  color = RANKING_BAR,
  accentTop = false,
  height = 240,
  ariaLabel,
}: {
  data: LabelCount[];
  unit?: string;
  color?: string;
  accentTop?: boolean;
  height?: number;
  ariaLabel: string;
}) {
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 40, bottom: 4, left: 4 }}
        >
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            width={120}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: CHART_INK }}
            tickFormatter={truncate}
          />
          <Tooltip
            cursor={{ fill: "rgba(36, 51, 106, 0.06)" }}
            content={<ChartTooltip unit={unit} />}
          />
          <Bar dataKey="n" radius={[0, 4, 4, 0]} maxBarSize={26}>
            {data.map((entry, index) => (
              <Cell
                key={entry.label}
                fill={accentTop && index === 0 ? RANKING_BAR_ACCENT : color}
              />
            ))}
            <LabelList
              dataKey="n"
              position="right"
              fill={CHART_INK}
              fontSize={12}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
