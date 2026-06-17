/**
 * Whaapy Data Gateway client (M2) — server-to-server REST.
 *
 * Our `/api/mcp` stays the only MCP server Whaapy talks to. Inside the
 * `buscar_productos` handler we call the Data Gateway's `search_variant` tool
 * over REST (it validates against the published schema and runs the same hybrid
 * search as `/query`). We do NOT self-host anything and do NOT point Whaapy at
 * the Gateway — our middleware stays in the path.
 *
 * SERVER-ONLY: this module reads `BUSCADOR_EXTERNO_API_KEY`. It must only be
 * imported by the route handler / server code, never by anything that reaches
 * the browser bundle (ERRORES.md #6). It carries no `'use client'`.
 *
 * Defensive parsing (ERRORES.md #4/#5): the documented response shapes were
 * wrong, so we parse against the REAL shape verified live and coerce every
 * field, tolerating missing/extra keys.
 */

import {
  BUSCADOR_TIMEOUT_MS,
  DATA_GATEWAY,
} from "@/lib/constants";
import type { GatewayArgs } from "@/lib/mcp/afinar-query";
import type { Producto, StockResumen } from "@/lib/mcp/types";

/** Why a Data Gateway call failed — drives the log status + envelope message. */
export type SearcherErrorKind = "timeout" | "http" | "network" | "bad_response";

/** A clean, typed searcher failure. The route maps it to a `failed` envelope. */
export class SearcherError extends Error {
  readonly kind: SearcherErrorKind;
  constructor(kind: SearcherErrorKind, message: string) {
    super(message);
    this.name = "SearcherError";
    this.kind = kind;
  }
}

/** Parsed result of one Data Gateway search. */
export interface GatewaySearchResult {
  productos: Producto[];
  /** Total returned (capped by `limit`). */
  total: number;
  stock: StockResumen;
}

// ---- coercion helpers (tolerate missing / wrongly-typed fields) -------------

function str(value: unknown): string | null {
  if (typeof value === "string") {
    const t = value.trim();
    return t.length > 0 ? t : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function num(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Read the first present key from a list (the upcoming mapping may name new
 * fields slightly differently — e.g. width as `ancho` or `width`). Lets us add
 * forward-compatible fields without guessing a single exact key now.
 */
function pick(data: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (key in data && data[key] !== null && data[key] !== undefined) {
      return data[key];
    }
  }
  return undefined;
}

/**
 * Map one raw result (`{ id, score, data: {...} }`) to our `Producto`.
 *
 * The fields below the divider are NOT in the current mapping; we read them
 * defensively anyway (tolerating several plausible key names) so that when the
 * programmer adds them they flow through with no change here — only an optional
 * tweak to the candidate key lists. Treat the current set as partial.
 */
export function parseVariant(raw: unknown): Producto | null {
  if (!isRecord(raw)) return null;
  const data = isRecord(raw.data) ? raw.data : raw;

  const sku = str(data.sku);
  const nombre = str(data.productTitle) ?? str(data.title);
  // A variant without a SKU or a name is unusable to the agent — skip it.
  if (!sku && !nombre) return null;

  const inventario = num(data.inventoryQuantity);
  // `available` is the Gateway's derived flag; fall back to inventory > 0.
  const disponible =
    typeof data.available === "boolean"
      ? data.available
      : inventario !== null
        ? inventario > 0
        : false;

  return {
    sku: sku ?? "",
    nombre: nombre ?? "",
    variante: str(data.title),
    color: str(data.color),
    coleccion: str(data.collections),
    precio_mxn: num(data.price) ?? 0,
    inventario,
    disponible,
    size: str(data.size),
    status: str(data.status),
    score: num(raw.score),

    // ---- future mapping fields (optional; populated automatically later) ----
    tipo_de_tela: str(pick(data, ["tipo_de_tela", "fabricType", "tipoDeTela"])),
    estilo: str(pick(data, ["estilo", "style"])),
    composicion: str(pick(data, ["composicion", "composition"])),
    ancho_cm: num(pick(data, ["ancho_cm", "ancho", "width", "widthCm"])),
    url: str(pick(data, ["url", "productUrl", "handleUrl"])),
    imagen_url: str(pick(data, ["imagen_url", "image", "imageUrl", "featuredImage"])),
  };
}

/**
 * Whether the Gateway forced its `available = true` default filter on this
 * response (i.e. it appears in `applied_filters` even though we never sent it).
 * While forced, out-of-stock variants are unobservable → stock counts are
 * "unknown" (null) rather than a misleading 0 (ERRORES.md #20). The check keys
 * off the response itself, so the moment the programmer disables the filter the
 * counts populate with no code change.
 */
function availableFilterForced(appliedFilters: unknown): boolean {
  // We never send `available`, so any present `available = true` is forced.
  if (!Array.isArray(appliedFilters)) return false;
  return appliedFilters.some(
    (f) =>
      isRecord(f) &&
      f.field === "available" &&
      (f.value === true || f.value === "true"),
  );
}

/** Derive per-call stock counts from the returned variants. */
function derivarStock(productos: Producto[], forced: boolean): StockResumen {
  if (forced) {
    // Can't see stockouts while available=true is forced — record "unknown".
    return { inStock: null, outOfStock: null };
  }
  let inStock = 0;
  let outOfStock = 0;
  for (const p of productos) {
    if (p.disponible) inStock += 1;
    else outOfStock += 1;
  }
  return { inStock, outOfStock };
}

/** Read + validate the Data Gateway env config (server-side only). */
function gatewayConfig(): { url: string; key: string } {
  const url = process.env.BUSCADOR_EXTERNO_URL;
  const key = process.env.BUSCADOR_EXTERNO_API_KEY;
  if (!url || !key) {
    throw new SearcherError(
      "network",
      "Missing Data Gateway env vars: BUSCADOR_EXTERNO_URL and/or BUSCADOR_EXTERNO_API_KEY.",
    );
  }
  return { url: url.replace(/\/+$/, ""), key };
}

/**
 * Call the Data Gateway `search_variant` invoke endpoint and parse the result.
 * Respects a hard time budget (BUSCADOR_TIMEOUT_MS) well under Whaapy's 30s
 * limit; a timeout/failure throws a typed `SearcherError` — never hangs.
 */
export async function buscarVariantes(
  gatewayArgs: GatewayArgs,
): Promise<GatewaySearchResult> {
  const { url, key } = gatewayConfig();
  const endpoint = `${url}${DATA_GATEWAY.SEARCH_PATH}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BUSCADOR_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      // JSON.stringify emits UTF-8, so accented colors (Café, Vino) match the
      // Gateway's exact `eq` filter (ERRORES.md #19).
      body: JSON.stringify({ args: gatewayArgs }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new SearcherError(
        "timeout",
        `Data Gateway timed out after ${BUSCADOR_TIMEOUT_MS}ms`,
      );
    }
    throw new SearcherError(
      "network",
      `Data Gateway request failed: ${err instanceof Error ? err.message : String(err)}`,
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new SearcherError(
      "http",
      `Data Gateway returned HTTP ${response.status}`,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new SearcherError("bad_response", "Data Gateway response was not valid JSON");
  }
  if (!isRecord(body)) {
    throw new SearcherError("bad_response", "Data Gateway response was not an object");
  }

  // Zero results = HTTP 200 with an empty `results` array and no envelope —
  // we generate our own envelope upstream (M1/M3), so just parse what's there.
  const rawResults = Array.isArray(body.results) ? body.results : [];
  const productos = rawResults
    .map(parseVariant)
    .filter((p): p is Producto => p !== null);

  const forced = availableFilterForced(body.applied_filters);

  return {
    productos,
    total: productos.length,
    stock: derivarStock(productos, forced),
  };
}
