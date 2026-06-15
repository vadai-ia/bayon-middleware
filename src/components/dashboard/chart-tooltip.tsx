"use client";

/**
 * Brand-styled Recharts tooltip. Recharts clones the element passed to a chart's
 * `content` prop and injects `active` / `payload` / `label` at runtime, so we
 * declare a minimal local prop shape (no `any`, no fragile deep recharts type
 * imports). White surface + navy ink keeps ≥4.5:1 contrast.
 */
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number | string; payload?: { label?: string } }>;
  label?: string | number;
  /** Noun describing the value, e.g. "búsquedas". */
  unit?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  unit = "búsquedas",
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const point = payload[0];
  const name = label ?? point.payload?.label ?? "";
  const value = point.value ?? 0;

  return (
    <div className="rounded-md border border-bayon-navy/15 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-bayon-navy">{name}</p>
      <p className="text-xs text-muted-foreground">
        {value} {unit}
      </p>
    </div>
  );
}
