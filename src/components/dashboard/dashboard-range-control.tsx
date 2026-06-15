"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { DASHBOARD_RANGES, ROUTES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { DashboardRangeKey } from "@/lib/dashboard/types";

/**
 * Date-range selector for the dashboard. Independent of the Logs tab filters:
 * the active preset lives in the URL (`?range=`), so the Server Component page
 * re-reads it and re-aggregates. Segmented-control styling, brand navy active
 * state — touch targets meet the 44px minimum (ui-ux-pro-max touch-target-size).
 */
export function DashboardRangeControl({
  active,
}: {
  active: DashboardRangeKey;
}) {
  const router = useRouter();
  const params = useSearchParams();

  function select(key: string) {
    const next = new URLSearchParams(params.toString());
    next.set("range", key);
    router.replace(`${ROUTES.DASHBOARD}?${next.toString()}`);
  }

  return (
    <div
      role="group"
      aria-label="Periodo del dashboard"
      className="inline-flex flex-wrap gap-1 rounded-lg border border-bayon-navy/15 bg-white p-1"
    >
      {DASHBOARD_RANGES.map((preset) => {
        const isActive = preset.key === active;
        return (
          <button
            key={preset.key}
            type="button"
            aria-pressed={isActive}
            onClick={() => select(preset.key)}
            className={cn(
              "inline-flex min-h-11 items-center justify-center rounded-md px-3.5 text-sm font-medium transition-colors sm:min-h-9",
              isActive
                ? "bg-bayon-navy text-white"
                : "text-bayon-navy hover:bg-bayon-navy/5"
            )}
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}
