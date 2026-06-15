// Seeds realistic, varied test data into mcp_request_logs so the M5 dashboard
// can be verified end-to-end (the table is otherwise empty). Uses real Telas
// Bayón catalog values: fabrics (Percal, Popelina, Loneta, Blackout, Polar,
// Panamá, Gobelino), colors (Arena, Chocolate, Blanco, Negro, Rojo, Turquesa,
// Olivo) and collections (Vestir, Cortinas, Tapicería, Blancos) — plus a set of
// "unmet" intents (Terciopelo, Lino, Seda, Azul Rey…) that the catalog does not
// carry, so the unmet-demand and no-results metrics show something real.
//
// Every row is tagged `arguments._seed = true` so it is identifiable later (the
// real Whaapy agent + searcher land in M2; this seed is cleared then, NOT now).
//
// Uses the service-role key (server-side CLI script — ERRORES.md #2). It is the
// ONLY writer to the table besides the MCP logger; never imported by the app.
//
// Run (insert ~420 rows):   node --env-file=.env.local scripts/seed-logs.mjs
// Replace prior seed first:  node --env-file=.env.local scripts/seed-logs.mjs --reset
//
// --reset deletes ONLY rows tagged _seed=true (re-runnable without duplicates);
// it never touches real logged rows.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
  console.error(
    "✖ Set real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
  );
  process.exit(1);
}

const RESET = process.argv.includes("--reset");
const TOTAL = 420;
const DAYS = 60;
const TZ_OFFSET_HOURS = 6; // America/Mexico_City is UTC-6 (no DST since 2023).

const supabase = createClient(url, key, { auth: { persistSession: false } });

// ---- helpers ----------------------------------------------------------------

/** Mirrors lib/mcp/logging.ts normalizeForAnalytics: lowercase + strip accents. */
function normalize(value) {
  if (!value) return null;
  const n = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  return n.length > 0 ? n : null;
}

const rand = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[rand(arr.length)];

/** Weighted pick: items are [value, weight]. */
function weighted(items) {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [value, w] of items) {
    r -= w;
    if (r <= 0) return value;
  }
  return items[items.length - 1][0];
}

// ---- catalog-grounded search intents ----------------------------------------
// Each intent is a partial set of buscar_productos arguments. `unmet: true`
// means the catalog can't satisfy it → always logged as no_results.

const INTENTS = [
  // -- in-catalog, common (high weight) --
  { w: 9, args: { query: "tela para cortina", coleccion: "Cortinas", tipo_de_tela: "Blackout" } },
  { w: 8, args: { query: "blackout negro", color: "Negro", tipo_de_tela: "Blackout", estilo: "Liso" } },
  { w: 8, args: { query: "loneta para tapizar", coleccion: "Tapicería", tipo_de_tela: "Loneta", ancho_min: 280 } },
  { w: 7, args: { query: "percal de algodon", tipo_de_tela: "Percal", composicion: "100% Algodón" } },
  { w: 7, args: { query: "tela para vestido", coleccion: "Vestir", estilo: "Estampado" } },
  { w: 6, args: { query: "popelina rayas", tipo_de_tela: "Popelina", estilo: "Rayas", color: "Turquesa" } },
  { w: 6, args: { query: "polar para cobija", coleccion: "Blancos", tipo_de_tela: "Polar" } },
  { w: 6, args: { query: "gobelino tapiceria", coleccion: "Tapicería", tipo_de_tela: "Gobelino", estilo: "Bordado" } },
  { w: 5, args: { query: "tela arena", color: "Arena" } },
  { w: 5, args: { query: "panama blanco para mantel", color: "Blanco", tipo_de_tela: "Panama" } },
  { w: 5, args: { query: "loneta chocolate", color: "Chocolate", tipo_de_tela: "Loneta", coleccion: "Tapicería" } },
  { w: 4, args: { query: "tela roja estampada", color: "Rojo", estilo: "Estampado" } },
  { w: 4, args: { query: "blackout arena cortina", color: "Arena", tipo_de_tela: "Blackout", coleccion: "Cortinas" } },
  { w: 4, args: { query: "tela olivo tapiceria", color: "Olivo", coleccion: "Tapicería" } },
  { w: 4, args: { query: "tela economica para vestir", coleccion: "Vestir", precio_max: 150 } },
  { w: 3, args: { query: "percal estampado negro", color: "Negro", tipo_de_tela: "Percal", estilo: "Estampado" } },
  { w: 3, args: { query: "tela ancha cortina", coleccion: "Cortinas", ancho_min: 300 } },
  { w: 3, args: { query: "algodon poliester tapiceria", composicion: "Algodón/Poliéster", coleccion: "Tapicería" } },

  // -- in-catalog but over-constrained → sometimes no_results (handled below) --
  { w: 3, args: { query: "blackout blanco", color: "Blanco", tipo_de_tela: "Blackout" } },
  { w: 2, args: { query: "polar liso barato", tipo_de_tela: "Polar", precio_max: 90 } },

  // -- UNMET demand: catalog does not carry these (always no_results) --
  { w: 6, unmet: true, args: { query: "terciopelo azul rey", color: "Azul Rey", tipo_de_tela: "Terciopelo" } },
  { w: 5, unmet: true, args: { query: "lino natural para vestir", coleccion: "Vestir", tipo_de_tela: "Lino" } },
  { w: 4, unmet: true, args: { query: "seda para blusa", tipo_de_tela: "Seda", coleccion: "Vestir" } },
  { w: 4, unmet: true, args: { query: "tela impermeable exterior", coleccion: "Exterior" } },
  { w: 3, unmet: true, args: { query: "gamuza chocolate", color: "Chocolate", tipo_de_tela: "Gamuza" } },
  { w: 3, unmet: true, args: { query: "tul bordado blanco", tipo_de_tela: "Tul", estilo: "Bordado", color: "Blanco" } },
  { w: 3, unmet: true, args: { query: "mezclilla para pantalon", tipo_de_tela: "Mezclilla", coleccion: "Vestir" } },
  { w: 2, unmet: true, args: { query: "manteleria verde menta", color: "Verde Menta", coleccion: "Manteles" } },
  { w: 2, unmet: true, args: { query: "tela mostaza tapiceria", color: "Mostaza", coleccion: "Tapicería" } },
];

// ---- timestamp generation ---------------------------------------------------
// Business-hours / weekday weighting, expressed in Bayón LOCAL time, then shifted
// to UTC so the dashboard's `at time zone 'America/Mexico_City'` reproduces it.

const HOUR_WEIGHTS = [
  [9, 3], [10, 5], [11, 7], [12, 9], [13, 9], [14, 7],
  [15, 5], [16, 6], [17, 8], [18, 8], [19, 6], [20, 3], [21, 2],
  [8, 2], [22, 1],
];

/** Returns an ISO timestamp (UTC) for a weighted local business moment. */
function randomTimestamp() {
  for (let attempt = 0; attempt < 8; attempt++) {
    const daysAgo = rand(DAYS);
    const base = new Date(Date.now() - daysAgo * 86_400_000);
    const y = base.getUTCFullYear();
    const mo = base.getUTCMonth();
    const d = base.getUTCDate();

    const localHour = weighted(HOUR_WEIGHTS);
    const minute = rand(60);
    // Local → UTC: add the offset. Date.UTC normalizes hour overflow correctly.
    const epoch = Date.UTC(y, mo, d, localHour + TZ_OFFSET_HOURS, minute, rand(60));
    const ts = new Date(epoch);

    // Soft weekday weighting: damp Sundays / Saturdays via reject-sampling.
    const localDow = new Date(epoch - TZ_OFFSET_HOURS * 3_600_000).getUTCDay();
    const keep = localDow === 0 ? 0.4 : localDow === 6 ? 0.7 : 1;
    if (Math.random() <= keep) return ts.toISOString();
  }
  return new Date().toISOString();
}

// ---- row builder ------------------------------------------------------------

function buildRow() {
  const intent = weighted(INTENTS.map((i) => [i, i.w]));
  const args = { ...intent.args, _seed: true };

  // Status. Unmet → no_results. Otherwise mostly success, with a slice of
  // no_results (over-constrained queries) and a few error/timeout.
  let status;
  if (intent.unmet) {
    status = "no_results";
  } else {
    status = weighted([
      ["success", 80],
      ["no_results", 12],
      ["error", 5],
      ["timeout", 3],
    ]);
  }

  let resultCount = null;
  let inStock = null;
  let outOfStock = null;
  let errorMessage = null;

  if (status === "success") {
    resultCount = 2 + rand(8); // 2–9 products matched
    // ~12% of successful searches had matches but nothing in stock.
    const allOut = Math.random() < 0.12;
    outOfStock = allOut ? resultCount : rand(Math.floor(resultCount / 2) + 1);
    inStock = resultCount - outOfStock;
  } else if (status === "no_results") {
    resultCount = 0;
    inStock = 0; // stock data known (M5-era row): 0 products, 0 in/out.
    outOfStock = 0;
  } else if (status === "error") {
    errorMessage = "external searcher unavailable (seed)";
  } else if (status === "timeout") {
    errorMessage = "external searcher exceeded budget (seed)";
  }

  const durationMs =
    status === "timeout"
      ? 20_000 + rand(2_000)
      : status === "error"
        ? 200 + rand(800)
        : 120 + rand(900);

  return {
    created_at: randomTimestamp(),
    tool_name: "buscar_productos",
    arguments: args,
    status,
    result_count: resultCount,
    duration_ms: durationMs,
    norm_query: normalize(args.query),
    req_color: normalize(args.color),
    req_coleccion: normalize(args.coleccion),
    in_stock_count: inStock,
    out_of_stock_count: outOfStock,
    error_message: errorMessage,
  };
}

// ---- run --------------------------------------------------------------------

console.log(`Project: ${url}`);

if (RESET) {
  const { error: delError, count } = await supabase
    .from("mcp_request_logs")
    .delete({ count: "exact" })
    .filter("arguments->>_seed", "eq", "true");
  if (delError) {
    console.error("✖ reset (delete seed rows) failed:", delError.message);
    process.exit(1);
  }
  console.log(`Reset: deleted ${count ?? 0} previously-seeded row(s).`);
}

const rows = Array.from({ length: TOTAL }, buildRow);

// Insert in batches to stay well within request limits.
const BATCH = 100;
let inserted = 0;
for (let i = 0; i < rows.length; i += BATCH) {
  const batch = rows.slice(i, i + BATCH);
  const { error } = await supabase.from("mcp_request_logs").insert(batch);
  if (error) {
    console.error(`✖ insert batch ${i / BATCH + 1} failed:`, error.message);
    process.exit(1);
  }
  inserted += batch.length;
}

// Summary by status for a quick sanity check.
const byStatus = rows.reduce((acc, r) => {
  acc[r.status] = (acc[r.status] ?? 0) + 1;
  return acc;
}, {});

console.log(`✔ Inserted ${inserted} seed row(s).`);
console.log("  Status split:", byStatus);
console.log(
  "  Note: seed rows are tagged arguments._seed=true and are NOT auto-deleted (cleared in M2).",
);
