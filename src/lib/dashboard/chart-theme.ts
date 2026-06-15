/**
 * Chart theming for the Dashboard (M5).
 *
 * Pure constants — safe to import from both Server and Client Components. Colors
 * are the Telas Bayón brand palette (tailwind.config.ts `bayon.*`), restated as
 * hex here because Recharts needs concrete color strings, not Tailwind classes.
 *
 * Accessibility: navy / blue / red on white all clear 4.5:1. YELLOW does NOT —
 * it is used ONLY as a fill behind dark labels, never as text or as a thin line
 * on white (ui-ux-pro-max color-contrast guidance).
 */

/** Telas Bayón brand palette. */
export const BRAND = {
  navy: "#24336A",
  blue: "#42619A",
  red: "#D60F3A",
  yellow: "#F8D927",
} as const;

/** Ink for axis ticks / labels (navy reads as near-black on white). */
export const CHART_INK = BRAND.navy;

/** Muted ink for secondary labels (navy at ~60%, still ≥4.5:1 on white). */
export const CHART_INK_MUTED = "#5B6588";

/** Hairline grid / axis color: navy at ~12% — visible but recessive. */
export const CHART_GRID = "rgba(36, 51, 106, 0.12)";

/**
 * Default bar color for single-series rankings and the color used to ACCENT the
 * most important / most actionable bar (e.g. the #1 unmet search). Keeping one
 * hue per ranking + a single red accent is more legible than rainbow bars.
 */
export const RANKING_BAR = BRAND.navy;
export const RANKING_BAR_ACCENT = BRAND.red;

/** Per-attribute bar colors, so the small-multiple attribute charts read apart. */
export const ATTRIBUTE_COLORS = {
  tipo_de_tela: BRAND.navy,
  estilo: BRAND.blue,
  composicion: BRAND.red,
  width: BRAND.navy,
} as const;

/** Activity charts. */
export const ACTIVITY_LINE = BRAND.blue;
export const ACTIVITY_BAR = BRAND.navy;

/** Stock donut: in-stock vs out-of-stock (blue = available, red = unavailable). */
export const STOCK_COLORS = {
  inStock: BRAND.blue,
  outOfStock: BRAND.red,
} as const;
