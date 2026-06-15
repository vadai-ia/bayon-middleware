"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/components/dashboard/chart-tooltip";
import {
  ACTIVITY_BAR,
  ACTIVITY_LINE,
  CHART_GRID,
  CHART_INK_MUTED,
} from "@/lib/dashboard/chart-theme";
import type { HourPoint, WeekdayPoint } from "@/lib/dashboard/format";

const AXIS_TICK = { fontSize: 11, fill: CHART_INK_MUTED };

/** Activity by hour of day (Bayón local time) — when customers ask. */
export function ActivityHourlyChart({
  data,
  height = 220,
}: {
  data: HourPoint[];
  height?: number;
}) {
  return (
    <div role="img" aria-label="Actividad por hora del día">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            interval={3}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ stroke: CHART_GRID }}
            content={<ChartTooltip unit="búsquedas" />}
          />
          <Line
            type="monotone"
            dataKey="n"
            stroke={ACTIVITY_LINE}
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Activity by weekday (Mon→Sun, Bayón local time). */
export function ActivityWeekdayChart({
  data,
  height = 220,
}: {
  data: WeekdayPoint[];
  height?: number;
}) {
  return (
    <div role="img" aria-label="Actividad por día de la semana">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid stroke={CHART_GRID} vertical={false} />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: CHART_GRID }}
          />
          <YAxis
            allowDecimals={false}
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip
            cursor={{ fill: "rgba(36, 51, 106, 0.06)" }}
            content={<ChartTooltip unit="búsquedas" />}
          />
          <Bar dataKey="n" fill={ACTIVITY_BAR} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
