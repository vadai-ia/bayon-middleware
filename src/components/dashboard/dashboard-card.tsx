import { BrandAccentBar } from "@/components/brand/brand-accent-bar";
import { cn } from "@/lib/utils";

/**
 * Titled card wrapper for a dashboard metric. Plain Server Component — pure
 * layout, no data. Serif title + clean sans description, consistent with the M4
 * panel. `prominent` cards (most-searched terms, unmet demand) get a heavier
 * border, a stronger shadow and the four-color brand stripe to pull visual
 * weight, matching the priority hierarchy in the M5 brief. Every card carries at
 * least a soft shadow so the white surface lifts off the tinted panel canvas.
 */
export function DashboardCard({
  title,
  description,
  prominent = false,
  className,
  children,
}: {
  title: string;
  description?: string;
  prominent?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-lg border bg-white p-4 sm:p-5",
        prominent
          ? "border-bayon-navy/20 shadow-md"
          : "border-bayon-navy/10 shadow-sm",
        className
      )}
    >
      <header className="mb-4 flex items-start gap-3">
        {prominent && (
          <BrandAccentBar
            orientation="vertical"
            className="w-1 shrink-0 self-stretch rounded-full"
          />
        )}
        <div>
          <h2
            className={cn(
              "font-serif font-semibold text-bayon-navy",
              prominent ? "text-xl" : "text-lg"
            )}
          >
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Shared empty/low-data state for an individual chart. Charts should render this
 * instead of an empty SVG when there's nothing to plot for the period.
 */
export function EmptyChart({
  message = "Aún no hay datos suficientes en este periodo.",
  height = 192,
}: {
  message?: string;
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center rounded-md border border-dashed border-bayon-navy/20 bg-bayon-navy/[0.02] px-4 text-center text-sm text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}
