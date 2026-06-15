import { redirect } from "next/navigation";

import { BayonLogo } from "@/components/brand/bayon-logo";
import { BrandAccentBar } from "@/components/brand/brand-accent-bar";
import { LoginForm } from "@/components/auth/login-form";
import { ROUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Login screen (public route — gated out of auth in middleware via PUBLIC_ROUTES).
 * If a session already exists, skip straight to the panel.
 */
export default async function LoginPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect(ROUTES.LOGS);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <BayonLogo className="items-center" />
          <h1 className="mt-6 font-serif text-xl font-semibold text-bayon-navy">
            Panel de administración
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Acceso exclusivo para administradores.
          </p>
        </div>

        <div className="overflow-hidden rounded-lg border border-bayon-navy/10 bg-white shadow-sm">
          <BrandAccentBar />
          <div className="p-6">
            <LoginForm />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Telas Bayón · Hecho por VADAI
        </p>
      </div>
    </main>
  );
}
