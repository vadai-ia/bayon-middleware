import { cn } from "@/lib/utils";

/**
 * Telas Bayón brand mark.
 *
 * PLACEHOLDER WORDMARK: the real logo asset is not in the repo yet. This is the
 * single source of truth for the brand mark — to swap in the real logo later,
 * replace ONLY the inner markup of this component (e.g. with an <Image>/<svg>);
 * every screen consumes it through this component, so nothing else changes.
 *
 * `tone` adapts it to its background:
 *  - "dark"  → for white/light backgrounds (navy text)  — default
 *  - "light" → for navy/dark backgrounds (white text)
 */
export function BayonLogo({
  tone = "dark",
  className,
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const isLight = tone === "light";

  return (
    <span
      className={cn("inline-flex flex-col leading-none", className)}
      aria-label="Telas Bayón"
    >
      <span
        className={cn(
          "font-serif text-2xl font-bold tracking-tight",
          isLight ? "text-white" : "text-bayon-navy"
        )}
      >
        Bay
        <span className="text-bayon-red">ó</span>
        n
      </span>
      <span
        className={cn(
          "mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.25em]",
          isLight ? "text-white/70" : "text-bayon-blue"
        )}
      >
        Telas · Desde 1918
      </span>
    </span>
  );
}
