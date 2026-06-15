"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ROUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

/**
 * Email/password sign-in (Supabase Auth). No open registration — accounts are
 * created by us. Uses the browser client (anon key only; never the service role,
 * ERRORES.md #6). On success the middleware-refreshed session lets the panel
 * load; we navigate there and refresh so Server Components re-read the session.
 */
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
      return;
    }

    router.replace(ROUTES.LOGS);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-sm font-medium text-bayon-navy"
        >
          Correo
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-10 rounded-md border border-bayon-navy/20 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-bayon-blue focus:ring-2 focus:ring-bayon-blue/30"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-sm font-medium text-bayon-navy"
        >
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-10 rounded-md border border-bayon-navy/20 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-bayon-blue focus:ring-2 focus:ring-bayon-blue/30"
        />
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-md bg-bayon-red/10 px-3 py-2 text-sm text-bayon-red"
        >
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="mt-2 bg-bayon-red text-white hover:bg-bayon-red/90"
      >
        {loading ? "Entrando…" : "Entrar"}
      </Button>
    </form>
  );
}
