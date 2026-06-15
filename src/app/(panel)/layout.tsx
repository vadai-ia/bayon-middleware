import { redirect } from "next/navigation";

import { BayonLogo } from "@/components/brand/bayon-logo";
import { BrandAccentBar } from "@/components/brand/brand-accent-bar";
import { PanelNav } from "@/components/panel/panel-nav";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Authenticated panel shell (Logs + Dashboard tabs + sign-out).
 *
 * Auth: the middleware already redirects unauthenticated visitors to /login.
 * This is a defense-in-depth server-side guard — it NEVER affects /api/mcp,
 * which is excluded from the middleware matcher and lives outside this group
 * (ERRORES.md #1). Reads use the user-scoped server client, never the service
 * role (ERRORES.md #6).
 *
 * The route group `(panel)` shares this shell across /logs and /dashboard so M5
 * only fills in the Dashboard tab — no rework of the shell.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(ROUTES.LOGIN);
  }

  /** Server Action: ends the session, then back to login. */
  async function signOut() {
    "use server";
    const client = createClient();
    await client.auth.signOut();
    redirect(ROUTES.LOGIN);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <BrandAccentBar />
      <header className="border-b border-bayon-navy/10 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
          <div className="flex items-center justify-between gap-4">
            <BayonLogo />
            <form action={signOut} className="sm:hidden">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-bayon-navy/20 text-bayon-navy hover:bg-bayon-navy/5"
              >
                Salir
              </Button>
            </form>
          </div>

          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <PanelNav />
            <form action={signOut} className="hidden sm:block">
              <Button
                type="submit"
                variant="outline"
                size="sm"
                className="border-bayon-navy/20 text-bayon-navy hover:bg-bayon-navy/5"
              >
                Salir
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  );
}
