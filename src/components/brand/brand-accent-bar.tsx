import { cn } from "@/lib/utils";

/**
 * Thin four-segment Bayón accent bar (navy · blue · red · yellow).
 * A restrained graphic touch used over the white base to keep the panel from
 * reading flat — single source of truth so every placement stays consistent.
 */
export function BrandAccentBar({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("flex h-1 w-full overflow-hidden", className)}
    >
      <span className="flex-1 bg-bayon-navy" />
      <span className="flex-1 bg-bayon-blue" />
      <span className="flex-1 bg-bayon-red" />
      <span className="flex-1 bg-bayon-yellow" />
    </div>
  );
}
