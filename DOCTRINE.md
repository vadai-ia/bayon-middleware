# BAYÓN MIDDLEWARE — PROJECT DOCTRINE

> Version: 1.0 | Date: June 2026
> Client: Telas Bayón | telasbayon.com | myshopify: telasbayon
> Built by: VADAI (Hecho Está, S.C.)
> Repo: github.com/vadai-ia/bayon-middleware

---

## What this system is

A middleware that acts as an intermediary between Whaapy's AI agent (which serves customers on WhatsApp) and the external product-search service for Telas Bayón's catalog.

When a customer asks something on WhatsApp, the agent interprets the need and calls this middleware's search tool. The middleware refines the query and passes it to the external searcher, which queries Shopify and returns results. The middleware formats them, logs them, and returns them to the agent.

## Flow

```
WhatsApp customer
      ↓
Whaapy agent
      ↓  MCP
Middleware /api/mcp  ←── this system
      ↓
External searcher (connected to Bayón's Shopify)
      ↓
Bayón's Shopify
```

## What this system does

- Expose an MCP server compatible with Whaapy, with a single read-only search tool
- Refine the query before passing it to the searcher (normalization, synonyms)
- Call the external searcher and format its response
- Log every MCP request to generate business metrics
- Web panel for Bayón: request log + metrics dashboard

## What it does NOT do (out of scope for V1)

- Connect directly to Shopify
- Write, create, or modify products
- Handle orders, customers, or buyer data
- Mirror Shopify's catalog into Supabase
- Be multi-tenant

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14.2.x (App Router) |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase Postgres + RLS |
| Panel auth | Supabase Auth (email/password) |
| MCP | `@modelcontextprotocol/sdk` TypeScript |
| Charts | Recharts |
| Hosting | Vercel (*.vercel.app for now) |

**NOT used:** Inngest, Upstash, Redis, Shopify webhooks, GraphQL Admin API.

## Database

Only one core table — the exact schema is defined by Claude Code:

**`mcp_request_logs`** — one record per tools/call received. Must capture enough information to answer the 8 dashboard questions (below).

No Shopify mirror tables. No synchronization.

## Search tool

A single tool: `buscar_productos`, read-only. Tool and parameter names stay in Spanish because they reflect the client's business domain.

Parameters the agent can send (all optional except `query`):

| Parameter | Description |
|---|---|
| `query` | Free text (required) |
| `coleccion` | Catalog category: Vestir, Cortinas, Tapicería, Blancos, etc. |
| `color` | Requested color: Arena, Negro, Blanco, Rojo, etc. |
| `tipo_de_tela` | Percal, Blackout, Polar, Gobelino, Loneta, etc. |
| `estilo` | Liso, Estampado, Bordado, Rayas |
| `composicion` | 100% Algodón, Poliéster, Algodón/Poliéster, etc. |
| `ancho_min` | Minimum width in cm |
| `ancho_max` | Maximum width in cm |
| `precio_max` | Maximum price in MXN including IVA |

No results → return `status: needs_more_info` with a short, generic `nextQuestion` in Spanish (the standard Whaapy protocol field). The Whaapy agent owns the conversation; the middleware only populates that protocol field — it does NOT generate elaborate conversational suggestions.

## Web panel

Access: Bayón admin + VADAI admin only. No open registration.
Branding: Telas Bayón visual identity.
Responsive: must work on mobile.

### 8 questions the dashboard answers for Bayón

1. Which products/fabrics do customers ask about most?
2. Which colors are requested most — and which ones are requested but NOT found?
3. Which collections/categories dominate intent?
4. What do customers search for that we don't find? (unmet demand)
5. Which products do customers ask availability for, and how often was there no stock?
6. What price sensitivity is there?
7. When do people ask? (peak hours, days of the week)
8. Which technical attributes are asked about most? (width, composition, fabric type)

## Security

Proportional to the risk — this is public catalog data, no customer PII:
- API key to validate incoming MCP requests
- Supabase RLS on all tables
- Supabase service role server-side only
- HTTPS by default (Vercel)

## Closed decisions

- MCP is 100% read-only
- Single-tenant for Bayón
- No Shopify mirror in Supabase
- Single tool: `buscar_productos`
- Next.js 14.2.x
- Prices always in MXN including IVA
- MCP server is stateless
