# ERRORES.md — BAYÓN MIDDLEWARE

Errors documented in previous VADAI projects that apply here, plus new ones found during this project.
Read this before writing code. Add every new error you encounter before committing.

---

## 1. Auth middleware blocking API routes

**What happened (Centr Hub):** the Next.js middleware intercepted POSTs to `/api/webhooks/*` and returned a 307 redirect because they weren't excluded from the matcher. External requests never reached the handler.

**How to avoid it:** from the first commit, the `middleware.ts` matcher must explicitly exclude `/api/mcp` and any public API route. Verify in M0 that a POST to `/api/mcp` without a session returns 401, not 307.

---

## 2. Importing `server-only` in CLI scripts or client code

**What happened (Centr Hub):** backfill scripts imported modules marked with `server-only` (the Supabase admin client) and failed when run outside the Next.js context.

**How to avoid it:** keep three separate Supabase clients (browser / server / admin). The admin client without a `server-only` mark so it can be used in scripts if needed.

---

## 3. Vercel environment variables with values from another project

**What happened (Centr Hub):** when creating the Vercel project, env vars were copied from another service. The Supabase keys pointed to the wrong project and everything failed silently.

**How to avoid it:** when configuring Vercel, open the Supabase dashboard in parallel and copy each value directly. Verify in M0 that the Supabase connection works with a test query before moving on.

---

## 4. JSON serialized as a string in MCP schemas

**Documented in the Whaapy spec:** passing objects or arrays as JSON strings inside the inputSchema or in responses prevents the agent from parsing the data correctly.

**Correct:** real object/array types in the schema.
**Incorrect:** a `string` field described as "JSON array of...".

---

## 5. TypeScript build errors not caught in dev

**What happened (multiple projects):** the dev server (`npm run dev`) doesn't surface all type errors that do appear in build. Code that broke the Vercel deploy was committed.

**How to avoid it:** run `npm run build` locally before every important commit. Mandatory before declaring a milestone complete.

---

## 6. Supabase service role exposed in client code

**Risk:** if `SUPABASE_SERVICE_ROLE_KEY` is imported in a client component or in a `NEXT_PUBLIC_` variable, it ends up in the browser bundle and anyone can bypass RLS.

**Rule:** `SUPABASE_SERVICE_ROLE_KEY` is only used in Route Handlers and Server Components. Never in `/components` or any file that uses `'use client'`.

---

## 7. Responding to the MCP client after slow operations

**Risk for this project:** if logging to Supabase or the external searcher call is slow and blocks the response, Whaapy can time out (limit: 30s for tools/call).

**How to avoid it:**
- The external searcher call goes first, with its own ~20s timeout.
- Logging to Supabase is async and must not block: fire-and-forget, don't await it.
- If the searcher takes longer than 20s, respond with a failed status and a clear message.

---

## 8. shadcn `init` installs the Tailwind v4 setup on a Tailwind v3 project (M0)

**What happened (this project, M0):** `npx shadcn@latest init` pulled shadcn **v4**, which targets Tailwind **v4**. It rewrote `globals.css` with `@import "tw-animate-css"`, `@import "shadcn/tailwind.css"`, `oklch()` colors and v4-only utilities (`outline-ring/50`, `ring-3`), generated a `button.tsx` importing `@base-ui/react`, and added incompatible deps. Our stack is pinned to `create-next-app@14`, which installs Tailwind **v3.4** — this combination breaks `npm run build`.

**How to avoid it:** the stack is Tailwind v3 (pinned by `create-next-app@14`). Do NOT use `shadcn@latest`. Either pin a Tailwind-v3-compatible CLI (shadcn 2.x) or add the shadcn files by hand (the v3 `components.json`, `lib/utils.ts`, hsl-variable `globals.css`, extended `tailwind.config.ts`, `tailwindcss-animate`, `@radix-ui/react-slot`). Mirrors ERRORES.md #5: same lesson as never using `@latest`.

---

## 9. Strict TS: `@supabase/ssr` cookie `setAll` callback param is implicitly `any`

**What happened (this project, M0):** the `cookies.setAll(cookiesToSet)` callbacks in the server and middleware Supabase clients failed `next build` under strict TS with "Parameter 'cookiesToSet' implicitly has an 'any' type". The dev server did not surface it (see ERRORES.md #5).

**How to avoid it:** type the param explicitly — `setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[])`, importing `CookieOptions` from `@supabase/ssr`. Never silence it with `any` (CLAUDE.md code rules).

---

## 10. `create-next-app` refuses a non-empty directory

**What happened (this project, M0):** the repo already contained `CLAUDE.md`, `DOCTRINE.md`, `ERRORES.md`, `MILESTONES.md` and `.claude/`, so `create-next-app@14 .` aborted with "directory contains files that could conflict".

**How to avoid it:** scaffold into a temp subdir (a name not starting with `_`/`.`, due to npm naming rules) and move the generated files up into the repo root, dropping the subdir's auto-created `.git`. Then `git init` once at the root.

---

## 11. Route-segment `maxDuration` must be a literal, not an imported constant (M1)

**What happened (this project, M1):** `export const maxDuration = MCP_MAX_DURATION_SECONDS;` in `app/api/mcp/route.ts` made `next build` warn `Unknown identifier "MCP_MAX_DURATION_SECONDS" at "maxDuration". The default config will be used instead.` Next statically analyzes route-segment config exports at build time and cannot resolve imports — so the centralized constant was silently ignored and the default (no limit) would have applied.

**How to avoid it:** route-segment config (`maxDuration`, `revalidate`, `dynamic`, `runtime`, …) must be inline literals: `export const maxDuration = 30;`. If you also need the value at runtime (e.g. to pass into a library config), keep the centralized constant for that runtime use and mirror it as a literal in the segment export, with a comment noting they must stay in sync.

---

## 12. Strict TS: MCP tool callback return type needs an index signature (M1)

**What happened (this project, M1):** the `@modelcontextprotocol/sdk` `server.tool(...)` callback expects a return assignable to `CallToolResult`, whose type includes an index signature (`[x: string]: unknown`, for `_meta`/`structuredContent`). A narrow helper interface (`{ content: {type:"text";text:string}[]; isError: boolean }`) failed `next build` with "Index signature for type 'string' is missing in type 'ToolResult'". Dev did not surface it (ERRORES.md #5).

**How to avoid it:** the tool-result helper type must add `[key: string]: unknown;` so it stays structurally assignable to the SDK's `CallToolResult` (or import the SDK type directly). Do NOT cast with `any` (CLAUDE.md). Note: Streamable HTTP responses come back SSE-framed (`content-type: text/event-stream`, `event: message\ndata: {…}`) even when `Accept` includes `application/json` — this is correct; Whaapy sends `Accept: application/json, text/event-stream` and parses it.

---

## 13. Fire-and-forget log silently dropped when the Vercel function returns (M3)

**Risk for this project (M3):** the request log is written at the END of the tools/call (duration and result count are only known then). A naive non-awaited `insert()` (true fire-and-forget) is dispatched but the serverless function returns immediately after the response — Vercel then freezes/tears down the process and the in-flight write is silently dropped. Locally it "works" (the Node process keeps running), so this never shows up in dev (mirrors ERRORES.md #5) — only in production do rows go missing. Awaiting the write instead would fix the drop but block the agent and risk the 30s timeout (ERRORES.md #7) — not acceptable either.

**How to avoid it:** use `waitUntil()` from `@vercel/functions`. Start the write (the promise begins executing) and hand the promise to `waitUntil` — Vercel extends the function lifetime until it settles WITHOUT making the agent wait on it. Next.js 14.2 has no `after`/`unstable_after` (those land later) and `mcp-handler` doesn't expose `waitUntil`, so the `@vercel/functions` dependency is required. Outside a request context (local dev, CLI scripts) `waitUntil` may throw — catch it and let the already-running promise finish. The log writer must also swallow all its own errors so a slow/failing write can never turn into a failed tool call.

---

## 14. Two distinct status vocabularies: Whaapy envelope vs. the log column (M3)

**What happened (this project, M3):** the response envelope uses the Whaapy spec status values (`success`, `needs_more_info`, …) while the `mcp_request_logs.status` column has its own CHECK constraint (`success | no_results | error | timeout`) chosen for analytics. A "no results" call is `needs_more_info` to the agent but `no_results` in the log — these are deliberately different, NOT a bug to reconcile. Blindly writing the envelope status into the column would violate the CHECK (`needs_more_info` is not allowed) and corrupt the dashboard's vocabulary.

**How to avoid it:** keep them separate. `MCP_STATUS` (constants.ts) is the agent-facing envelope vocabulary; `MCP_LOG_STATUS` is the internal analytics/log vocabulary that matches the DB CHECK. Logging MAPS one outcome to the other (results>0 → `success`, results=0 → `no_results`, thrown → `error`); it never changes what the agent receives. Do not "fix" the mismatch by unifying them.

---

## 15. The `server-only` package is not resolvable from the project root (M4)

**What happened (this project, M4):** to harden the panel's logs read path against accidentally landing in the browser bundle, I added `import "server-only";` to `lib/logs/queries.ts`. `server-only` is a transitive dependency of `next` (pinned `0.0.1`) but it is NOT hoisted to the top-level `node_modules`, so it does not resolve from our own source (`require.resolve('server-only')` throws; no `node_modules/server-only` dir). Relying on it would risk a build break — and it isn't a declared dependency of ours.

**How to avoid it:** don't import `server-only` unless you add it to `package.json` explicitly. It's also redundant here: a module that imports the server Supabase client (which uses `next/headers`) already cannot be pulled into a Client Component — Next.js fails the build if a `'use client'` file transitively imports `next/headers`. That import chain is the real browser-bundle guard for the panel's server-side reads (complements the service-role rule, ERRORES.md #6). If you ever do want the explicit `server-only` marker, `npm install server-only` first.
