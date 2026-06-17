/**
 * Types for the MCP `buscar_productos` tool.
 *
 * The catalog/search shapes here are the CONTRACT between this middleware and
 * the product data source. In M1 the data came from a mock; in M2 it comes from
 * Whaapy's Data Gateway (the `search_variant` tool). `BusquedaResultado` stays
 * the payload Whaapy sees inside the envelope — only the data SOURCE changed.
 */

import type { MCP_STATUS } from "@/lib/constants";

/**
 * A single product (a Shopify variant) as the Data Gateway returns it. Prices
 * are MXN, used exactly as returned (the website price; no IVA math — M2).
 *
 * FORWARD-COMPATIBLE BY DESIGN: the Data Gateway mapping currently exposes only
 * the fields above the divider. The programmer is adding more soon (ancho,
 * composición, tipo_de_tela, estilo, URL, image) — those live below the divider
 * as OPTIONAL fields so they populate automatically once the mapping returns
 * them (see `parseVariant` in data-gateway.ts), with no shape rewrite here.
 * Treat the present field set as partial, not final.
 */
export interface Producto {
  /** Variant SKU — the stable identifier customers/agents can reference. */
  sku: string;
  /** Product title (Shopify `productTitle`), e.g. "Polar Flannel Liso". */
  nombre: string;
  /** Variant label (Shopify variant `title`), e.g. "Negro" / "Default Title". */
  variante: string | null;
  /** Requested/derived color, in the catalog's literal casing (e.g. "Café"). */
  color: string | null;
  /**
   * Collections the variant belongs to. The Data Gateway returns these as one
   * comma-joined string (e.g. "Telas, Vestir, AVADA - Best Sellers"), NOT a
   * single category — this is why `coleccion` can't be an exact-match filter
   * (ERRORES.md #18) and folds into the free-text query instead.
   */
  coleccion: string | null;
  /** Unit price in MXN, exactly as the Data Gateway / website shows it. */
  precio_mxn: number;
  /** On-hand units (Shopify `inventoryQuantity`); null when unknown. */
  inventario: number | null;
  /** Whether the variant currently has stock (inventario > 0). */
  disponible: boolean;
  /** Variant size when present (e.g. "Mediana" / "Grande"). */
  size: string | null;
  /** Shopify product status ("active" / "draft"). */
  status: string | null;
  /** Deterministic relevance score (0–1) from the Data Gateway. */
  score: number | null;

  // ---------------------------------------------------------------------------
  // Coming from a later Data Gateway mapping revision (Programmer, post-M2).
  // Optional now; `parseVariant` already reads them defensively, so when the
  // mapping starts returning them they flow through with no code change here.
  // ---------------------------------------------------------------------------
  /** Percal, Popelina, Loneta, Blackout, Polar, Panama, Gobelino, etc. */
  tipo_de_tela?: string | null;
  /** Liso, Estampado, Bordado, Rayas. */
  estilo?: string | null;
  /** 100% Algodón, Poliéster, Algodón/Poliéster, etc. */
  composicion?: string | null;
  /** Width in centimeters. */
  ancho_cm?: number | null;
  /** Storefront URL of the product. */
  url?: string | null;
  /** Primary product image URL. */
  imagen_url?: string | null;
}

/** Arguments accepted by `buscar_productos` (all optional except `query`). */
export interface BuscarProductosArgs {
  query: string;
  coleccion?: string;
  color?: string;
  tipo_de_tela?: string;
  estilo?: string;
  composicion?: string;
  ancho_min?: number;
  ancho_max?: number;
  precio_max?: number;
}

/**
 * The searcher result payload (what lands in the envelope `data`).
 * `filtros_aplicados` echoes the refined inputs the search actually used (which
 * became real Data Gateway filters vs. folded into free text), so the Whaapy
 * agent can see what was queried. Shape unchanged from M1.
 */
export interface BusquedaResultado {
  productos: Producto[];
  total: number;
  filtros_aplicados: BuscarProductosArgs;
}

/**
 * Per-call stock counts derived from the returned variants, for the dashboard
 * availability metric (M5 metric #5). Both null when stock is unobservable —
 * i.e. while the Data Gateway forces its `available = true` default filter, we
 * can never see out-of-stock variants, so we honestly record "unknown" rather
 * than a misleading 0 (ERRORES.md #20). When the programmer disables that
 * filter, the counts populate automatically. `result_count = in + out`.
 */
export interface StockResumen {
  inStock: number | null;
  outOfStock: number | null;
}

/**
 * Everything one real `buscar_productos` call produces. The `resultado` feeds
 * the envelope (unchanged contract); `stock` feeds the M5 logging columns.
 */
export interface BusquedaOutcome {
  resultado: BusquedaResultado;
  stock: StockResumen;
}

/** Business status values defined by the Whaapy spec. */
export type McpStatus = (typeof MCP_STATUS)[keyof typeof MCP_STATUS];

/** Structured error entry (Whaapy spec error format). */
export interface McpError {
  code: string;
  message: string;
  /** Spanish message, used when the agent serves users in Spanish. */
  message_es?: string;
  field?: string;
  retryable?: boolean;
}

/**
 * The JSON envelope serialized into the MCP `content[0].text` string.
 * Follows the Whaapy spec response contract.
 */
export interface WhaapyEnvelope<TData> {
  ok: boolean;
  status: McpStatus;
  data: TData;
  errors?: McpError[];
  /** Short, generic clarifying hint when there are no results (spec field). */
  nextQuestion?: string;
  toolName: string;
  safety: string;
  durationMs: number;
}
