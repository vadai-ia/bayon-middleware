/**
 * Mock search over the in-memory catalog (M1).
 *
 * This is intentionally simple matching for the mock — NOT the query
 * refinement (accent stripping, style/color synonyms, width extraction) that
 * arrives in M2. The only contract that matters here is the returned
 * `BusquedaResultado` shape, which M2's external searcher must reproduce.
 */

import { MOCK_CATALOGO } from "@/lib/mcp/catalog-mock";
import type { BuscarProductosArgs, BusquedaResultado, Producto } from "@/lib/mcp/types";

/** Case-insensitive equality for a single-value facet filter. */
function igual(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** Every whitespace-separated token of `query` must appear in the product. */
function coincideQuery(producto: Producto, query: string): boolean {
  const blob = [
    producto.nombre,
    producto.coleccion,
    producto.color,
    producto.tipo_de_tela,
    producto.estilo,
    producto.composicion,
    producto.descripcion,
  ]
    .join(" ")
    .toLowerCase();

  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  return tokens.every((token) => blob.includes(token));
}

/**
 * Run the mock search. Synchronous and instant — keeps us far under Whaapy's
 * 30s tools/call timeout (ERRORES.md #7). M2 makes this async against the
 * external searcher while preserving the return shape.
 */
export function buscarProductosMock(args: BuscarProductosArgs): BusquedaResultado {
  const productos = MOCK_CATALOGO.filter((p) => {
    if (!coincideQuery(p, args.query)) return false;
    if (args.coleccion && !igual(p.coleccion, args.coleccion)) return false;
    if (args.color && !igual(p.color, args.color)) return false;
    if (args.tipo_de_tela && !igual(p.tipo_de_tela, args.tipo_de_tela)) return false;
    if (args.estilo && !igual(p.estilo, args.estilo)) return false;
    if (args.composicion && !igual(p.composicion, args.composicion)) return false;
    if (args.ancho_min !== undefined && p.ancho_cm < args.ancho_min) return false;
    if (args.ancho_max !== undefined && p.ancho_cm > args.ancho_max) return false;
    if (args.precio_max !== undefined && p.precio_mxn > args.precio_max) return false;
    return true;
  });

  return {
    productos,
    total: productos.length,
    filtros_aplicados: args,
  };
}
