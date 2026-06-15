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
