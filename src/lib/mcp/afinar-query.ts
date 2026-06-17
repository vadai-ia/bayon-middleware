/**
 * Query refinement (M2) — adapts our tool's parameters to what the Whaapy Data
 * Gateway's `search_variant` tool actually accepts.
 *
 * What the Data Gateway supports (verified against the live API):
 *   - `query`      free-text hybrid search (full-text + vector)
 *   - `color`      exact `eq` filter — CASE- and ACCENT-SENSITIVE (ERRORES.md #19)
 *   - `price_max`  numeric ceiling, applied as `price <= n`
 *   - `limit`      result cap (1–50)
 *
 * What it does NOT support as a filter, and therefore folds into the free-text
 * `query` so the semantic search can still use it (nothing dropped silently):
 *   - `coleccion`  the catalog's `collections` is a comma-joined blob matched
 *                  only by exact `eq`, so it can never match a single category
 *                  (ERRORES.md #18) — fold into text.
 *   - `tipo_de_tela`, `estilo`, `composicion`  no such filterable fields.
 *   - `ancho_min` / `ancho_max`  no width field at all.
 *
 * Price is used as-is (MXN, the website price; no IVA math — M2 decision).
 */

import { BUSCADOR_RESULT_LIMIT } from "@/lib/constants";
import type { BuscarProductosArgs } from "@/lib/mcp/types";

/** Arguments POSTed to the Data Gateway's `search_variant` invoke endpoint. */
export interface GatewayArgs {
  query: string;
  color?: string;
  price_max?: number;
  limit: number;
}

/**
 * Result of refining one tool call: the Gateway args to send, plus `usado`,
 * which records what we resolved — the color we actually sent (canonical
 * casing) and the folded free-text query — for transparency in the envelope's
 * `filtros_aplicados`. Analytics columns (norm_query, req_color, req_coleccion)
 * are derived separately from the ORIGINAL args by the logging layer, which
 * already normalizes them; refinement does not touch logging.
 */
export interface QueryRefinada {
  gatewayArgs: GatewayArgs;
  usado: {
    query: string;
    color?: string;
  };
}

/**
 * Lowercase + strip accents + collapse whitespace + trim. Used ONLY as a lookup
 * key for matching (e.g. into the color table) — never as the value we send to
 * the Data Gateway, because its `color` filter is exact and accent-sensitive.
 */
function clave(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Common color inputs → the catalog's REAL literal value (exact casing and
 * accents — that is what the Gateway's `eq` filter matches on).
 *
 * Frequent catalog colors observed live: Blanco, Rojo, Hueso, Beige, Negro,
 * Gris, Azul Marino, Azul, Azul Rey, Gris Oxford, Vino, Naranja, Rosa, Azul
 * Cielo, Verde, Café, Rosa Pastel, Turquesa, Gris Perla, Rosa Fucsia.
 *
 * This REPLACES M1's wrong map (beige→Arena, café→Chocolate), which targeted
 * values this catalog doesn't use and would have broken every exact match.
 * Keys are accent-stripped/lowercased (matched via `clave`); values keep the
 * canonical casing/accents the Gateway expects.
 */
const COLORES_CANONICOS: Record<string, string> = {
  // Canonical values mapped from their own accent-stripped key (so "cafe",
  // "CAFÉ", "Café " all resolve to "Café").
  blanco: "Blanco",
  negro: "Negro",
  rojo: "Rojo",
  hueso: "Hueso",
  beige: "Beige",
  gris: "Gris",
  azul: "Azul",
  "azul marino": "Azul Marino",
  "azul rey": "Azul Rey",
  "azul cielo": "Azul Cielo",
  "gris oxford": "Gris Oxford",
  "gris perla": "Gris Perla",
  vino: "Vino",
  naranja: "Naranja",
  rosa: "Rosa",
  "rosa pastel": "Rosa Pastel",
  "rosa fucsia": "Rosa Fucsia",
  verde: "Verde",
  cafe: "Café",
  turquesa: "Turquesa",
  // Synonyms → canonical catalog value.
  marino: "Azul Marino",
  marron: "Café",
  chocolate: "Café",
  "cafe oscuro": "Café",
  fucsia: "Rosa Fucsia",
  fiucsia: "Rosa Fucsia",
  "rosa fiucsia": "Rosa Fucsia",
  crema: "Hueso",
  blanca: "Blanco",
};

/**
 * Resolve a requested color to the catalog's literal value. Known
 * synonyms/spellings map to canonical casing; an unrecognized color is sent
 * trimmed as-is (best effort — the agent may already pass an exact value).
 * Empty/whitespace → undefined (no color filter).
 */
function afinarColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  const trimmed = color.trim();
  if (!trimmed) return undefined;
  return COLORES_CANONICOS[clave(trimmed)] ?? trimmed;
}

/**
 * Build the free-text query: the customer's `query` plus the terms that have no
 * Gateway filter (coleccion, tipo_de_tela, estilo, composicion, width), so the
 * hybrid search can still use them. Width numbers are appended as "<n> cm".
 * De-duplicates tokens (case-insensitively) to keep the query lean.
 */
function construirQuery(args: BuscarProductosArgs): string {
  const partes: string[] = [args.query];
  const anchos: number[] = [];

  if (args.coleccion) partes.push(args.coleccion);
  if (args.tipo_de_tela) partes.push(args.tipo_de_tela);
  if (args.estilo) partes.push(args.estilo);
  if (args.composicion) partes.push(args.composicion);
  if (typeof args.ancho_min === "number") anchos.push(args.ancho_min);
  if (typeof args.ancho_max === "number" && args.ancho_max !== args.ancho_min) {
    anchos.push(args.ancho_max);
  }
  for (const ancho of anchos) partes.push(`${ancho} cm`);

  // Token-level de-dup (case-insensitive), preserving first-seen order.
  const vistos = new Set<string>();
  const tokens: string[] = [];
  for (const parte of partes) {
    for (const token of parte.split(/\s+/).filter(Boolean)) {
      const k = clave(token);
      if (k && !vistos.has(k)) {
        vistos.add(k);
        tokens.push(token);
      }
    }
  }
  return tokens.join(" ");
}

/**
 * Refine our tool's arguments into Data Gateway args. `color` and `precio_max`
 * become real filters; everything else folds into the free-text query.
 */
export function afinarQuery(args: BuscarProductosArgs): QueryRefinada {
  const query = construirQuery(args);
  const color = afinarColor(args.color);

  const gatewayArgs: GatewayArgs = {
    query,
    limit: BUSCADOR_RESULT_LIMIT,
  };
  if (color) gatewayArgs.color = color;
  // Price used exactly as requested (MXN, no IVA conversion); positive only.
  if (typeof args.precio_max === "number" && args.precio_max > 0) {
    gatewayArgs.price_max = args.precio_max;
  }

  return { gatewayArgs, usado: { query, color } };
}
