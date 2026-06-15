/**
 * API-key authentication for incoming MCP requests (the 401 check deferred
 * from M0). This is SEPARATE from the panel's Supabase session auth — Whaapy
 * posts here without a session and authenticates only with the shared key
 * (CLAUDE.md / ERRORES.md #1).
 *
 * The key is checked on every POST, including `initialize`, which is safe:
 * Whaapy sends its configured auth header on all requests, so gating the whole
 * endpoint does not break the handshake.
 *
 * Accepts the key via either header the Whaapy spec supports:
 *   - X-API-Key: <key>
 *   - Authorization: Bearer <key>
 */

import { createHash, timingSafeEqual } from "node:crypto";

import { MCP_AUTH_HEADERS } from "@/lib/constants";

/** Read the configured secret. Returns null if the server is misconfigured. */
function getExpectedKey(): string | null {
  const key = process.env.MCP_API_KEY;
  return key && key.length > 0 ? key : null;
}

/** Extract the presented key from either supported header. */
function extractPresentedKey(request: Request): string | null {
  const apiKey = request.headers.get(MCP_AUTH_HEADERS.API_KEY);
  if (apiKey && apiKey.length > 0) return apiKey;

  const authorization = request.headers.get(MCP_AUTH_HEADERS.AUTHORIZATION);
  if (authorization) {
    const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
    if (match) return match[1];
  }
  return null;
}

/** Length-independent constant-time comparison (compare SHA-256 digests). */
function safeEqual(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}

export type AuthResult =
  | { ok: true }
  | { ok: false; reason: "server_misconfigured" | "missing_or_invalid_key" };

/** Validate the request's API key against MCP_API_KEY. */
export function authorizeMcpRequest(request: Request): AuthResult {
  const expected = getExpectedKey();
  if (!expected) return { ok: false, reason: "server_misconfigured" };

  const presented = extractPresentedKey(request);
  if (!presented || !safeEqual(presented, expected)) {
    return { ok: false, reason: "missing_or_invalid_key" };
  }
  return { ok: true };
}
