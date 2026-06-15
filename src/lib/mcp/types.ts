/**
 * Types for the MCP `buscar_productos` tool.
 *
 * The catalog/search shapes here are the CONTRACT between this middleware and
 * the product data source. In M1 the data comes from a mock (catalog-mock.ts);
 * in M2 it comes from the external searcher. Both must produce the same
 * `BusquedaResultado` shape so the swap only changes the data source, never the
 * contract Whaapy sees.
 */

import type { MCP_STATUS } from "@/lib/constants";

/** A single product as the searcher returns it. Prices are MXN incl. IVA. */
export interface Producto {
  id: string;
  nombre: string;
  /** Catalog category: Vestir, Cortinas, Tapicería, Blancos, etc. */
  coleccion: string;
  color: string;
  /** Percal, Popelina, Loneta, Blackout, Polar, Panama, Gobelino, etc. */
  tipo_de_tela: string;
  /** Liso, Estampado, Bordado, Rayas. */
  estilo: string;
  /** 100% Algodón, Poliéster, Algodón/Poliéster, etc. */
  composicion: string;
  /** Width in centimeters. */
  ancho_cm: number;
  /** Unit price in MXN including IVA. */
  precio_mxn: number;
  /** Whether the product currently has stock. */
  disponible: boolean;
  /** Storefront URL of the product. */
  url: string;
  /** Primary product image URL. */
  imagen_url: string;
  descripcion: string;
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
 * `filtros_aplicados` echoes the arguments the search actually used, so the
 * Whaapy agent (and our future logging) can see what was queried.
 */
export interface BusquedaResultado {
  productos: Producto[];
  total: number;
  filtros_aplicados: BuscarProductosArgs;
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
