// Verifies the Supabase connection with a REAL query against mcp_request_logs.
// Run with:  npm run test:supabase   (loads .env.local via --env-file)
//
// Uses the service role key (server-side script — ERRORES.md #2). This is NOT
// part of the app bundle; it only runs from the CLI.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key || url.includes("placeholder") || key.includes("placeholder")) {
  console.error(
    "✖ Set real NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first."
  );
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const { count, error } = await supabase
  .from("mcp_request_logs")
  .select("*", { count: "exact", head: true });

if (error) {
  console.error("✖ Supabase query failed:", error.message);
  console.error("  (Did you run supabase/migrations/0001_init_mcp_request_logs.sql?)");
  process.exit(1);
}

console.log(`✔ Supabase OK. Project: ${url}`);
console.log(`✔ Table mcp_request_logs reachable. Row count: ${count ?? 0}`);
