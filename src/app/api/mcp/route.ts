/**
 * MCP server — Whaapy-compatible, read-only.
 *
 * Exposes a single tool, `buscar_productos`, over Streamable HTTP / JSON-RPC
 * 2.0 (MCP 2025-06-18), per the Whaapy spec (/guides/mcp-server-spec). Built on
 * the official @modelcontextprotocol/sdk via Vercel's `mcp-handler` adapter —
 * the protocol is NOT implemented by hand (CLAUDE.md).
 *
 * - Stateless: a fresh McpServer is created per request (no session id).
 * - Auth: incoming POST/DELETE require the shared MCP_API_KEY (the 401 check
 *   deferred from M0). This is separate from the panel's Supabase session auth.
 *   /api/mcp stays excluded from the auth middleware matcher (ERRORES.md #1).
 * - M1 uses a mock searcher; M2 swaps the data source behind the same contract.
 */

import { createMcpHandler } from "mcp-handler";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  MCP_LOG_STATUS,
  MCP_MAX_DURATION_SECONDS,
  MCP_NO_RESULTS_NEXT_QUESTION,
  MCP_SEARCHER_FAILED_MESSAGE,
  MCP_SERVER_INFO,
  MCP_STATUS,
  MCP_TOOL_NAME,
} from "@/lib/constants";
import { authorizeMcpRequest } from "@/lib/mcp/auth";
import { SearcherError } from "@/lib/mcp/data-gateway";
import { buildToolResult } from "@/lib/mcp/envelope";
import { logMcpRequest } from "@/lib/mcp/logging";
import { buscarProductos } from "@/lib/mcp/search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Must be a literal — Next statically analyzes this route-segment config.
// Mirrors MCP_MAX_DURATION_SECONDS (Whaapy tools/call timeout).
export const maxDuration = 30;

/**
 * Semantic contract (Whaapy spec): the description tells the agent when to use
 * the tool and what a correct result means. Kept in Spanish — it's the client's
 * business domain and the agent serves Spanish-speaking customers.
 */
const TOOL_DESCRIPTION = [
  "Busca telas en el catálogo de Telas Bayón por texto libre y filtros del catálogo.",
  "Devuelve productos con SKU, nombre, color, colección, inventario y precio (MXN, el mismo de telasbayon.com).",
  "",
  "When to use: cuando el cliente pide telas o pregunta por disponibilidad, color, tipo, ancho o precio.",
  "Never use for: crear pedidos, modificar inventario o cualquier acción de escritura — esta herramienta es solo de lectura.",
  "Side effects: ninguno. Solo consulta el catálogo, no escribe nada.",
  "Success criteria: ok=true, status=success y data.productos con al menos un resultado.",
  "Fallback: si no hay coincidencias, status=needs_more_info con un nextQuestion breve para acotar la búsqueda.",
].join("\n");

/**
 * Tool input schema. Real typed structures (string/integer), never JSON-as-
 * string (ERRORES.md #4). `query` required; the rest optional. Spanish names
 * reflect the client's domain (DOCTRINE.md).
 */
const buscarProductosShape = {
  query: z.string().min(1).describe("Texto libre de búsqueda (requerido)."),
  coleccion: z
    .string()
    .optional()
    .describe("Categoría del catálogo: Vestir, Cortinas, Tapicería, Blancos, etc."),
  color: z
    .string()
    .optional()
    .describe("Color solicitado: Arena, Negro, Blanco, Rojo, Turquesa, Olivo, etc."),
  tipo_de_tela: z
    .string()
    .optional()
    .describe("Tipo de tela: Percal, Popelina, Loneta, Blackout, Polar, Panama, Gobelino, etc."),
  estilo: z
    .string()
    .optional()
    .describe("Estilo: Liso, Estampado, Bordado, Rayas."),
  composicion: z
    .string()
    .optional()
    .describe("Composición: 100% Algodón, Poliéster, Algodón/Poliéster, etc."),
  ancho_min: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Ancho mínimo en centímetros."),
  ancho_max: z
    .number()
    .int()
    .positive()
    .optional()
    .describe("Ancho máximo en centímetros."),
  precio_max: z
    .number()
    .positive()
    .optional()
    .describe("Precio máximo en MXN (precio de venta, el mismo que muestra telasbayon.com)."),
} as const;

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      MCP_TOOL_NAME,
      TOOL_DESCRIPTION,
      buscarProductosShape,
      async (args) => {
        const startedAt = Date.now();
        try {
          // Real searcher (M2): refine → Data Gateway → mapped results + stock.
          const { resultado, stock } = await buscarProductos(args);
          const hayResultados = resultado.total > 0;
          const finishedAt = Date.now();

          // Observe the call (M3). Fire-and-forget but guaranteed to land on
          // Vercel; the agent never waits on it and a log failure can't fail
          // the call. Now also carries the derived stock counts (M5 #5).
          logMcpRequest({
            toolName: MCP_TOOL_NAME,
            args,
            status: hayResultados
              ? MCP_LOG_STATUS.SUCCESS
              : MCP_LOG_STATUS.NO_RESULTS,
            resultCount: resultado.total,
            durationMs: Math.max(0, finishedAt - startedAt),
            // No-results → 0/0; otherwise the derived counts (null while the
            // Gateway forces available=true, so stockouts are unobservable).
            inStockCount: hayResultados ? stock.inStock : 0,
            outOfStockCount: hayResultados ? stock.outOfStock : 0,
          });

          // Response contract is unchanged — logging only observes.
          return buildToolResult(
            {
              ok: true,
              status: hayResultados
                ? MCP_STATUS.SUCCESS
                : MCP_STATUS.NEEDS_MORE_INFO,
              data: resultado,
              startedAt,
              nextQuestion: hayResultados
                ? undefined
                : MCP_NO_RESULTS_NEXT_QUESTION,
              isError: false,
            },
            finishedAt,
          );
        } catch (err) {
          // A searcher timeout/failure must NOT hang or bubble as an unhandled
          // error (ERRORES.md #7). Map it to a clean `failed` envelope with a
          // Spanish message, and log it (timeout vs. error). Any other,
          // unexpected error is logged and re-thrown so mcp-handler reports it.
          const finishedAt = Date.now();
          const durationMs = Math.max(0, finishedAt - startedAt);

          if (err instanceof SearcherError) {
            logMcpRequest({
              toolName: MCP_TOOL_NAME,
              args,
              status:
                err.kind === "timeout"
                  ? MCP_LOG_STATUS.TIMEOUT
                  : MCP_LOG_STATUS.ERROR,
              resultCount: null,
              durationMs,
              inStockCount: null,
              outOfStockCount: null,
              errorMessage: err.message,
            });

            return buildToolResult(
              {
                ok: false,
                status: MCP_STATUS.FAILED,
                data: { productos: [], total: 0, filtros_aplicados: args },
                startedAt,
                errors: [
                  {
                    code: err.kind,
                    message: err.message,
                    message_es: MCP_SEARCHER_FAILED_MESSAGE,
                    retryable: true,
                  },
                ],
                isError: true,
              },
              finishedAt,
            );
          }

          logMcpRequest({
            toolName: MCP_TOOL_NAME,
            args,
            status: MCP_LOG_STATUS.ERROR,
            resultCount: null,
            durationMs,
            inStockCount: null,
            outOfStockCount: null,
            errorMessage: err instanceof Error ? err.message : String(err),
          });
          throw err;
        }
      },
    );
  },
  {
    serverInfo: MCP_SERVER_INFO,
  },
  {
    basePath: "/api",
    disableSse: true,
    maxDuration: MCP_MAX_DURATION_SECONDS,
    verboseLogs: false,
  },
);

/** 401 response for unauthenticated/misconfigured requests. */
function unauthorized(reason: "server_misconfigured" | "missing_or_invalid_key") {
  const isConfig = reason === "server_misconfigured";
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      id: null,
      error: {
        code: isConfig ? -32603 : -32001,
        message: isConfig
          ? "MCP server misconfigured: missing API key."
          : "Unauthorized: missing or invalid API key.",
      },
    },
    { status: isConfig ? 500 : 401 },
  );
}

/** Gate the request on the API key, then delegate to the MCP handler. */
async function handleAuthenticated(request: Request): Promise<Response> {
  const auth = authorizeMcpRequest(request);
  if (!auth.ok) return unauthorized(auth.reason);
  return baseHandler(request);
}

export function POST(request: Request): Promise<Response> {
  return handleAuthenticated(request);
}

export function DELETE(request: Request): Promise<Response> {
  return handleAuthenticated(request);
}

/** Unauthenticated liveness check (not part of the MCP transport). */
export function GET(): Response {
  return NextResponse.json(
    { ok: true, status: "healthy", service: MCP_SERVER_INFO.name },
    { status: 200 },
  );
}
