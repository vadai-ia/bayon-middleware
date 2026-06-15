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
  MCP_SERVER_INFO,
  MCP_STATUS,
  MCP_TOOL_NAME,
} from "@/lib/constants";
import { authorizeMcpRequest } from "@/lib/mcp/auth";
import { buildToolResult } from "@/lib/mcp/envelope";
import { logMcpRequest } from "@/lib/mcp/logging";
import { buscarProductosMock } from "@/lib/mcp/search";

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
  "Devuelve productos con color, tipo de tela, estilo, composición, ancho (cm) y precio (MXN con IVA).",
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
    .describe("Precio máximo en MXN incluyendo IVA."),
} as const;

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      MCP_TOOL_NAME,
      TOOL_DESCRIPTION,
      buscarProductosShape,
      (args) => {
        const startedAt = Date.now();
        try {
          const resultado = buscarProductosMock(args);
          const hayResultados = resultado.total > 0;
          const finishedAt = Date.now();

          // Observe the call (M3). Fire-and-forget but guaranteed to land on
          // Vercel; the agent never waits on it and a log failure can't fail
          // the call. Wraps the call, not the data source, so M2's real
          // searcher needs no change here.
          logMcpRequest({
            toolName: MCP_TOOL_NAME,
            args,
            status: hayResultados
              ? MCP_LOG_STATUS.SUCCESS
              : MCP_LOG_STATUS.NO_RESULTS,
            resultCount: resultado.total,
            durationMs: Math.max(0, finishedAt - startedAt),
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
          // Log the failure, then re-throw so mcp-handler returns the exact
          // same error response it would have. Observe, don't alter.
          logMcpRequest({
            toolName: MCP_TOOL_NAME,
            args,
            status: MCP_LOG_STATUS.ERROR,
            resultCount: null,
            durationMs: Math.max(0, Date.now() - startedAt),
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
