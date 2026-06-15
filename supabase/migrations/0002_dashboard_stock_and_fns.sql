-- =============================================================================
-- Bayón Middleware — M5 (Dashboard)
-- 1) Stock columns on mcp_request_logs (availability metric, DOCTRINE Q5)
-- 2) Read-only SQL aggregation functions (RPC) that power the dashboard
--
-- Apply by pasting this whole file into the Supabase SQL Editor (same as 0001).
-- Idempotent: safe to run more than once.
--
-- SECURITY: every function is SECURITY INVOKER (the default) — it runs with the
-- CALLER's privileges, so the existing RLS policy ("authenticated can read
-- logs") still applies. The dashboard calls these through the user-scoped server
-- client, never the service role (ERRORES.md #6). `set search_path = public`
-- hardens them against search_path hijacking.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) Availability / stock (DOCTRINE Q5)
--
-- Two nullable counters per call. When known: result_count = in + out. They are
-- nullable so historic rows (M1/M3 mock logging, which never wrote stock) are
-- simply excluded from stock aggregates instead of skewing them as zeros.
--
-- WHO WRITES THESE:
--   * M5 seed script  → realistic synthetic values (verifiable now).
--   * M2 real logging → derived from the external searcher's result set:
--        in_stock_count     = # of returned productos with disponible = true
--        out_of_stock_count = # of returned productos with disponible = false
--     (no_results / error calls write 0 / 0 or leave null — see report).
-- -----------------------------------------------------------------------------
alter table public.mcp_request_logs
  add column if not exists in_stock_count     integer,
  add column if not exists out_of_stock_count integer;

comment on column public.mcp_request_logs.in_stock_count is
  'Count of returned products currently in stock (disponible=true). Null for rows logged before M5 / when unknown. M2 fills from the real searcher result set.';
comment on column public.mcp_request_logs.out_of_stock_count is
  'Count of returned products out of stock (disponible=false). Null when unknown. With in_stock_count: result_count = in + out.';

-- Supports the stock summary, which scans only rows that carry stock data.
create index if not exists mcp_request_logs_stock_idx
  on public.mcp_request_logs (created_at)
  where in_stock_count is not null;

-- =============================================================================
-- 2) Aggregation functions
--
-- All share the same date-range contract:
--   p_from : inclusive lower bound (timestamptz), NULL = no lower bound ("all").
--   p_to   : EXCLUSIVE upper bound (timestamptz), NULL = no upper bound.
-- The caller (lib/dashboard/queries.ts) passes an exclusive upper bound, exactly
-- like the Logs tab does (queries.ts), so day ranges are inclusive of the last
-- day. Aggregation happens in-DB against the indexed columns — the dashboard
-- never pulls the table into memory.
-- =============================================================================

-- ---- Headline KPIs ----------------------------------------------------------
create or replace function public.dashboard_summary(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  total_calls     bigint,
  success         bigint,
  no_results      bigint,
  errors          bigint,
  avg_duration_ms numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    count(*)                                                  as total_calls,
    count(*) filter (where status = 'success')                as success,
    count(*) filter (where status = 'no_results')             as no_results,
    count(*) filter (where status in ('error', 'timeout'))    as errors,
    round(avg(duration_ms)::numeric, 0)                       as avg_duration_ms
  from public.mcp_request_logs
  where (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to);
$$;

-- ---- Most-searched terms / unmet terms (Q1 / Q4) ----------------------------
-- p_only_no_results = true → restrict to status 'no_results' (unmet demand).
create or replace function public.dashboard_term_counts(
  p_from            timestamptz default null,
  p_to              timestamptz default null,
  p_only_no_results boolean     default false,
  p_limit           integer     default 10
)
returns table (label text, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select norm_query as label, count(*) as n
  from public.mcp_request_logs
  where norm_query is not null
    and btrim(norm_query) <> ''
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
    and (not p_only_no_results or status = 'no_results')
  group by norm_query
  order by n desc, label asc
  limit greatest(coalesce(p_limit, 10), 0);
$$;

-- ---- Requested colors / unmet colors (Q2) -----------------------------------
create or replace function public.dashboard_color_counts(
  p_from            timestamptz default null,
  p_to              timestamptz default null,
  p_only_no_results boolean     default false,
  p_limit           integer     default 10
)
returns table (label text, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select req_color as label, count(*) as n
  from public.mcp_request_logs
  where req_color is not null
    and btrim(req_color) <> ''
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
    and (not p_only_no_results or status = 'no_results')
  group by req_color
  order by n desc, label asc
  limit greatest(coalesce(p_limit, 10), 0);
$$;

-- ---- Requested collections / unmet collections (Q3) -------------------------
create or replace function public.dashboard_collection_counts(
  p_from            timestamptz default null,
  p_to              timestamptz default null,
  p_only_no_results boolean     default false,
  p_limit           integer     default 10
)
returns table (label text, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select req_coleccion as label, count(*) as n
  from public.mcp_request_logs
  where req_coleccion is not null
    and btrim(req_coleccion) <> ''
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
    and (not p_only_no_results or status = 'no_results')
  group by req_coleccion
  order by n desc, label asc
  limit greatest(coalesce(p_limit, 10), 0);
$$;

-- ---- Technical attributes from the arguments jsonb (Q8) ---------------------
-- p_attr is WHITELISTED (the `p_attr in (...)` guard): any other key makes the
-- predicate false for every row → empty result. No dynamic SQL, no injection.
-- The jsonb `->>` operator takes the key as a value, so it stays parameterized.
create or replace function public.dashboard_attribute_counts(
  p_from  timestamptz default null,
  p_to    timestamptz default null,
  p_attr  text        default 'tipo_de_tela',
  p_limit integer     default 10
)
returns table (label text, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select lower(btrim(arguments ->> p_attr)) as label, count(*) as n
  from public.mcp_request_logs
  where p_attr in ('tipo_de_tela', 'estilo', 'composicion')
    and arguments ? p_attr
    and btrim(coalesce(arguments ->> p_attr, '')) <> ''
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
  group by lower(btrim(arguments ->> p_attr))
  order by n desc, label asc
  limit greatest(coalesce(p_limit, 10), 0);
$$;

-- ---- Requested width, bucketed (Q8) -----------------------------------------
-- Uses ancho_min when present, else ancho_max. Numeric values only (seed/M2
-- always send numbers); a non-numeric value is treated as "Sin especificar".
create or replace function public.dashboard_width_buckets(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (label text, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  with raw as (
    select coalesce(arguments ->> 'ancho_min', arguments ->> 'ancho_max') as val
    from public.mcp_request_logs
    where (arguments ? 'ancho_min' or arguments ? 'ancho_max')
      and (p_from is null or created_at >= p_from)
      and (p_to   is null or created_at <  p_to)
  ),
  bucketed as (
    select case
      when val ~ '^\s*\d+(\.\d+)?\s*$' and val::numeric < 150 then '< 150 cm'
      when val ~ '^\s*\d+(\.\d+)?\s*$' and val::numeric < 250 then '150–249 cm'
      when val ~ '^\s*\d+(\.\d+)?\s*$' and val::numeric < 300 then '250–299 cm'
      when val ~ '^\s*\d+(\.\d+)?\s*$'                        then '300+ cm'
      else 'Sin especificar'
    end as label
    from raw
  )
  select label, count(*) as n
  from bucketed
  group by label
  order by n desc, label asc;
$$;

-- ---- Activity by hour of day, Bayón local time (Q7) -------------------------
create or replace function public.dashboard_activity_hourly(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (hour integer, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(hour from (created_at at time zone 'America/Mexico_City'))::int as hour,
    count(*) as n
  from public.mcp_request_logs
  where (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
  group by 1
  order by 1;
$$;

-- ---- Activity by weekday, Bayón local time (Q7) -----------------------------
-- dow: 0 = Sunday … 6 = Saturday (Postgres convention).
create or replace function public.dashboard_activity_weekday(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (dow integer, n bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(dow from (created_at at time zone 'America/Mexico_City'))::int as dow,
    count(*) as n
  from public.mcp_request_logs
  where (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to)
  group by 1
  order by 1;
$$;

-- ---- Availability / stock summary (Q5) --------------------------------------
-- Scans only rows that carry stock data (in_stock_count is not null), so rows
-- logged before M5 don't dilute the metric.
--   searches_no_stock = calls that DID match products but none were in stock
--                       (in + out > 0 AND in = 0).
create or replace function public.dashboard_stock_summary(
  p_from timestamptz default null,
  p_to   timestamptz default null
)
returns table (
  in_stock              bigint,
  out_of_stock          bigint,
  products_total        bigint,
  searches_with_results bigint,
  searches_no_stock     bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    coalesce(sum(in_stock_count), 0)::bigint                                          as in_stock,
    coalesce(sum(out_of_stock_count), 0)::bigint                                      as out_of_stock,
    coalesce(sum(coalesce(in_stock_count,0) + coalesce(out_of_stock_count,0)), 0)::bigint as products_total,
    count(*) filter (
      where (coalesce(in_stock_count,0) + coalesce(out_of_stock_count,0)) > 0
    )::bigint                                                                          as searches_with_results,
    count(*) filter (
      where (coalesce(in_stock_count,0) + coalesce(out_of_stock_count,0)) > 0
        and coalesce(in_stock_count,0) = 0
    )::bigint                                                                          as searches_no_stock
  from public.mcp_request_logs
  where in_stock_count is not null
    and (p_from is null or created_at >= p_from)
    and (p_to   is null or created_at <  p_to);
$$;

-- -----------------------------------------------------------------------------
-- Grants. Explicit execute for the authenticated panel role; RLS on the table
-- still gates which rows the function can see (anon has no SELECT policy →
-- empty aggregates).
-- -----------------------------------------------------------------------------
grant execute on function public.dashboard_summary(timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_term_counts(timestamptz, timestamptz, boolean, integer) to authenticated;
grant execute on function public.dashboard_color_counts(timestamptz, timestamptz, boolean, integer) to authenticated;
grant execute on function public.dashboard_collection_counts(timestamptz, timestamptz, boolean, integer) to authenticated;
grant execute on function public.dashboard_attribute_counts(timestamptz, timestamptz, text, integer) to authenticated;
grant execute on function public.dashboard_width_buckets(timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_activity_hourly(timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_activity_weekday(timestamptz, timestamptz) to authenticated;
grant execute on function public.dashboard_stock_summary(timestamptz, timestamptz) to authenticated;
