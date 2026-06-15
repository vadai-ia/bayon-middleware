// Inspects mcp_request_logs to verify M3 logging landed correctly.
// Prints the total row count and the latest N rows with the columns that
// matter for the M3 checklist: status, result_count, duration_ms, the three
// derived columns (norm_query / req_color / req_coleccion), error_message and
// the full arguments. Works for both local and PRODUCTION verification — it
// reads whatever Supabase project .env.local points at.
//
// Uses the service role key (server-side script — ERRORES.md #2). Not part of
// the app bundle; CLI only.
//
// Run with:        node --env-file=.env.local scripts/check-logs.mjs
// Limit rows:      node --env-file=.env.local scripts/check-logs.mjs 5

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
  console.error(
    "✖ Set real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.",
  );
  process.exit(1);
}

const limit = Number.parseInt(process.argv[2] ?? "10", 10) || 10;

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { count, error: countError } = await supabase
  .from("mcp_request_logs")
  .select("*", { count: "exact", head: true });

if (countError) {
  console.error("✖ count query failed:", countError.message);
  process.exit(1);
}

const { data, error } = await supabase
  .from("mcp_request_logs")
  .select(
    "created_at, tool_name, status, result_count, duration_ms, norm_query, req_color, req_coleccion, error_message, arguments",
  )
  .order("created_at", { ascending: false })
  .limit(limit);

if (error) {
  console.error("✖ select query failed:", error.message);
  process.exit(1);
}

console.log(`Project: ${url}`);
console.log(`Total rows in mcp_request_logs: ${count ?? 0}`);
console.log(`Latest ${data.length} row(s):\n`);

for (const row of data) {
  console.log(`• ${row.created_at}  [${row.status}]  tool=${row.tool_name}`);
  console.log(
    `    result_count=${row.result_count}  duration_ms=${row.duration_ms}`,
  );
  console.log(
    `    norm_query=${JSON.stringify(row.norm_query)}  req_color=${JSON.stringify(
      row.req_color,
    )}  req_coleccion=${JSON.stringify(row.req_coleccion)}`,
  );
  if (row.error_message) console.log(`    error_message=${row.error_message}`);
  console.log(`    arguments=${JSON.stringify(row.arguments)}`);
  console.log("");
}
