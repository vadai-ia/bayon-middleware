import { NextResponse } from "next/server";

/**
 * MCP endpoint — PLACEHOLDER for M0.
 *
 * The real MCP server (handshake, tools/list, tools/call, buscar_productos,
 * API-key auth) is implemented in M1 with @modelcontextprotocol/sdk.
 *
 * For M0 this only proves the route is reachable: a POST without a session must
 * return a real response here, NOT a 307 redirect from the auth middleware
 * (ERRORES.md #1).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  return NextResponse.json(
    {
      ok: true,
      service: "bayon-middleware-mcp",
      milestone: "M0",
      message:
        "MCP placeholder reachable. Real MCP server arrives in M1.",
    },
    { status: 200 }
  );
}

export function GET() {
  return NextResponse.json(
    { ok: true, status: "healthy", service: "bayon-middleware-mcp" },
    { status: 200 }
  );
}
