/**
 * `buscar_productos` search (M2) — real data via Whaapy's Data Gateway.
 *
 * Thin orchestrator: refine our tool's args → call the Data Gateway's
 * `search_variant` tool → assemble the `BusquedaResultado` the envelope already
 * expects, plus the per-call stock counts the M5 logging needs. The MCP
 * response contract is unchanged; only the data SOURCE changed (the M1 mock is
 * gone). A searcher failure/timeout surfaces as a typed `SearcherError` (from
 * data-gateway.ts) so the route returns a clean `failed` status, never a hang.
 */

import { afinarQuery } from "@/lib/mcp/afinar-query";
import { buscarVariantes } from "@/lib/mcp/data-gateway";
import type { BuscarProductosArgs, BusquedaOutcome } from "@/lib/mcp/types";

/**
 * Run a real catalog search. Resolves with the products, total, the refined
 * filters actually used, and the stock summary. Rejects with `SearcherError`
 * on timeout/failure (handled by the route).
 */
export async function buscarProductos(
  args: BuscarProductosArgs,
): Promise<BusquedaOutcome> {
  const { gatewayArgs, usado } = afinarQuery(args);
  const { productos, total, stock } = await buscarVariantes(gatewayArgs);

  return {
    resultado: {
      productos,
      total,
      // Echo what the search actually used: the folded free-text query and the
      // canonical color sent as a real filter (the rest of the original args
      // are preserved for transparency; coleccion/tipo/etc. live in `query`).
      filtros_aplicados: {
        ...args,
        query: usado.query,
        color: usado.color,
      },
    },
    stock,
  };
}
