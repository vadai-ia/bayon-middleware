import { cn } from "@/lib/utils";

/**
 * Four-segment Bayón accent bar (navy · blue · red · yellow). A restrained
 * graphic touch over the white base — single source of truth so every placement
 * stays consistent.
 *
 * `orientation` switches between a horizontal strip (default) and a vertical
 * stripe; size/position are controlled by the caller via `className`.
 */
export function BrandAccentBar({
  orientation = "horizontal",
  className,
}: {
  orientation?: "horizontal" | "vertical";
  className?: string;
}) {
  const isVertical = orientation === "vertical";

  return (
    <div
      aria-hidden
      className={cn(
        "flex overflow-hidden",
        isVertical ? "h-full w-full flex-col" : "h-1 w-full flex-row",
        className
      )}
    >
      <span className="flex-1 bg-bayon-navy" />
      <span className="flex-1 bg-bayon-blue" />
      <span className="flex-1 bg-bayon-red" />
      <span className="flex-1 bg-bayon-yellow" />
    </div>
  );
}
