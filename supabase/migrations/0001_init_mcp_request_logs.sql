-- =============================================================================
-- Bayón Middleware — M0
-- Table: mcp_request_logs
-- One row per MCP tools/call received from Whaapy. This is the ONLY core table
-- in the project (no Shopify mirror, no sync). It must hold enough to answer the
-- 8 dashboard business questions (DOCTRINE.md).
-- =============================================================================

-- gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.mcp_request_logs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),          -- Q7: when do people ask

  -- ---- request ----
  tool_name       text        not null,                        -- which MCP tool
  arguments       jsonb       not null default '{}'::jsonb,     -- full tool args, REAL json (ERRORES.md #4)

  -- ---- result ----
  status          text        not null
                    check (status in ('success','no_results','error','timeout')),
  result_count    integer,                                     -- Q1/Q5: how many products returned
  duration_ms     integer,                                     -- end-to-end handler latency

  -- ---- analytics-derived (populated in M3; denormalized for fast dashboards) ----
  norm_query      text,                                        -- Q1/Q4: normalized free-text query
  req_color       text,                                        -- Q2: requested color
  req_coleccion   text,                                        -- Q3: requested collection/category

  -- ---- failure detail ----
  error_message   text
);

comment on table public.mcp_request_logs is
  'One row per MCP tools/call from Whaapy. Source for the admin dashboard metrics. Writes are server-side only (service role).';
comment on column public.mcp_request_logs.arguments is
  'Full tool arguments as real JSON (never a stringified JSON). Holds attributes not promoted to columns (tipo_de_tela, estilo, composicion, ancho_min/max, precio_max) for Q6/Q8.';
comment on column public.mcp_request_logs.status is
  'success | no_results | error | timeout';

-- ---- indexes (dashboard access patterns) ----
create index if not exists mcp_request_logs_created_at_idx
  on public.mcp_request_logs (created_at desc);                -- Q7 time-series + log pagination
create index if not exists mcp_request_logs_status_idx
  on public.mcp_request_logs (status);                          -- Q4/Q5 unmet demand / no stock
create index if not exists mcp_request_logs_req_color_idx
  on public.mcp_request_logs (req_color);                       -- Q2 colors
create index if not exists mcp_request_logs_req_coleccion_idx
  on public.mcp_request_logs (req_coleccion);                   -- Q3 collections
create index if not exists mcp_request_logs_arguments_gin
  on public.mcp_request_logs using gin (arguments);             -- Q6/Q8 flexible attribute queries

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.mcp_request_logs enable row level security;

-- The service role (used by the server-side logger in M3) BYPASSES RLS, so it
-- needs no policy to INSERT. No client ever writes here.

-- Panel reads (M4) use the user-scoped server client. Registration is closed,
-- so any authenticated user is a trusted Bayón/VADAI admin → allow SELECT.
drop policy if exists "authenticated can read logs" on public.mcp_request_logs;
create policy "authenticated can read logs"
  on public.mcp_request_logs
  for select
  to authenticated
  using (true);

-- No INSERT/UPDATE/DELETE policies → anon and authenticated cannot write.
-- Logs are immutable from the app's perspective; only the service role writes.
