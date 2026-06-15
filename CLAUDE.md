# CLAUDE.md — BAYÓN MIDDLEWARE

Read this file completely before touching anything. No exceptions.
Also read ERRORES.md before writing any code.

---

## How you must work

1. Read CLAUDE.md and ERRORES.md in full before doing anything.
2. Check which tools/MCPs are available and which ones are useful for the current task before starting it.
3. Present a detailed plan of what you intend to do and wait for explicit approval before writing any code. Do not proceed until you get a go-ahead.
4. Never assume something works — verify with `npm run build` before declaring anything done.
5. If you find anything that contradicts the doctrine or a closed decision (see DOCTRINE.md), pause and ask before proceeding.
6. If anything in the prompt is unclear, ask before inventing a solution.
7. At the end of each block of work, report what changed and which technical decisions you made and why, before committing.
8. Every new error you encounter during development → add it to ERRORES.md before committing.

---

## What this project is

A Next.js middleware that acts as an intermediary between Whaapy's AI agent and an external product-search service for Telas Bayón's catalog. It exposes an MCP server that Whaapy consumes to search products over WhatsApp.

**Flow:** Whaapy → `/api/mcp` (this system) → refine query → external searcher → formatted response → log → Whaapy

This system does NOT connect to Shopify directly. The external searcher is the one that queries Shopify.

## Stack

- **Framework:** Next.js 14.2.x, App Router, TypeScript — always `npx create-next-app@14`
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** Supabase Postgres + RLS
- **Auth:** Supabase Auth (email/password, admin only)
- **MCP:** `@modelcontextprotocol/sdk` — do not implement the protocol by hand
- **Charts:** Recharts
- **Hosting:** Vercel

## Absolute rules

- `npx create-next-app@14` — NEVER `@latest`
- NEVER connect directly to Shopify from this system
- NEVER perform INSERT/UPDATE/DELETE on catalog data from MCP tools
- NEVER expose the Supabase service role in the browser or in client code
- NEVER use localStorage or sessionStorage in React components
- `/api/mcp` is ALWAYS excluded from the Next.js auth middleware matcher (see ERRORES.md #1)
- Verify `npm run build` passes with no errors before declaring any milestone complete

## Code rules

- Strict TypeScript — never use `any`
- Server Components by default; `'use client'` only when actually needed
- Validate all external inputs (MCP tool arguments, form inputs)
- Centralize constants; no magic strings/numbers scattered across files
- Keep UI components focused — split when they grow past ~300 lines

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        ← server-side only, never expose to the browser
MCP_API_KEY=                      ← key that validates incoming requests from Whaapy
BUSCADOR_EXTERNO_URL=             ← external searcher endpoint
BUSCADOR_EXTERNO_API_KEY=         ← external searcher auth (if applicable)
```

## What to build

**MCP server at `/api/mcp`**
Compatible with the Whaapy MCP spec. A single read-only tool: `buscar_productos`, with the parameters of Bayón's catalog (query, coleccion, color, tipo_de_tela, estilo, composicion, ancho_min, ancho_max, precio_max). Tool/parameter names stay in Spanish because they reflect the client's business domain.

**Query refinement**
Before calling the external searcher, normalize the parameters: text to lowercase without accents, unify style variants ("Lisos"→"Liso"), map common color synonyms (beige→Arena, café→Chocolate), extract numbers from width strings ("150cm"→150).

**Async logging**
Each tools/call is logged to Supabase without blocking the response. Store: tool, arguments, status, result count, duration, and the key derived values for analytics (query, requested color, requested collection).

**Web panel**
- `/login` — Supabase Auth
- `/logs` — request log with filters and expandable detail
- `/dashboard` — 8 business metrics (see DOCTRINE.md)
- Telas Bayón branding, responsive

## Whaapy MCP spec

You have the Whaapy documentation MCP connected (server "whaapy-docs"). Before implementing the MCP server, consult it to read the full spec. Use it as well whenever you have doubts about the protocol or want to verify that what you're building is compatible.

The implementation must comply with that spec 100%. You define how to implement it.
