# MILESTONES — BAYÓN MIDDLEWARE

Milestone index. Title + description only. Detailed prompts are written one at a time, as each previous milestone is completed.

---

## M0 — Setup and project skeleton

Create the Next.js 14.2.x project with App Router and TypeScript. Configure Supabase (verified connection, `mcp_request_logs` table created, RLS enabled). Connect the GitHub repo to Vercel and get a successful first deploy. Create `middleware.ts` with the correct matcher from the start. Verify the env vars point to the correct project. Checkpoint: Vercel deploy works, `/api/mcp` receives a POST and returns 200, Supabase connection verified with a test query.

## M1 — MCP server + buscar_productos tool

Implement the full MCP server at `/api/mcp` using `@modelcontextprotocol/sdk`. It must correctly handle the initialization handshake and `tools/list`. Implement the `buscar_productos` tool with its complete inputSchema. For now the tool calls a mock of the external searcher (hardcoded response of 3 products) so the MCP flow can be tested end to end. Validate auth by API key. To implement the MCP server correctly, consult the connected Whaapy documentation MCP ("whaapy-docs"). Checkpoint: full validation with MCP Inspector and the Whaapy spec checklist (handshake, tools/list, tools/call, correct envelope, types not serialized as strings).

## M2 — Query refinement + external searcher integration

Implement the query refinement logic with text normalization, style unification, and color synonym mapping. Replace the searcher mock with the real integration against the Whaapy programmer's endpoint. Handle timeouts (20s max) and searcher errors with clear failed responses. Checkpoint: a real end-to-end search from MCP Inspector reaches the external searcher and returns real Bayón products.

## M3 — Logging

Implement async logging of each tools/call in `mcp_request_logs`. Extract and store the derived columns for analytics (normalized query, requested color, requested collection, result count). Logging must not block or delay the response to the agent. Checkpoint: after 10 test searches, the Supabase table has the 10 records with all fields correctly populated.

## M4 — Panel: Auth + Logs tab

Implement login with Supabase Auth (email/password). Implement the `/logs` tab with a server-side table, filters by tool/status/date, pagination, and an expandable row with the full request and response. Apply Bayón branding (colors and logo from their Shopify theme). Checkpoint: Bayón admin can log in, see logs live, and filter them.

## M5 — Panel: Dashboard tab

Implement the `/dashboard` tab with the 8 business metrics using Recharts. Period comparison (this month vs. previous). Responsive for mobile. Checkpoint: all metrics show correct data against the logs seeded in M3, visual review approved by Alejandro.

## M6 — Whaapy integration + final QA

Connect the real MCP to the Whaapy agent in a test environment. Validate the full flow: real customer question on WhatsApp → agent → tool → searcher → response with real products. Adjust tool descriptions and normalization based on agent feedback. Security hardening (basic rate limiting if deemed necessary). Delivery documentation. Checkpoint: a real end-to-end WhatsApp conversation working correctly.
