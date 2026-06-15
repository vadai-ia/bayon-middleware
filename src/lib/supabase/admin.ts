import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Admin Supabase client (service role key — bypasses RLS).
 *
 * SERVER-ONLY: only import from Route Handlers, Server Components/Actions, or
 * standalone scripts. NEVER from a Client Component or anything that reaches
 * the browser bundle (ERRORES.md #6).
 *
 * Intentionally NOT marked with `server-only` so backfill/maintenance scripts
 * run outside the Next.js runtime can reuse it (ERRORES.md #2).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing Supabase admin env vars: NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
