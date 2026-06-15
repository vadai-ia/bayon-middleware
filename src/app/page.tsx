import { redirect } from "next/navigation";

import { ROUTES } from "@/lib/constants";
import { createClient } from "@/lib/supabase/server";

/**
 * Root entry point. There is no public homepage: authenticated users go to the
 * panel, everyone else goes to login.
 */
export default async function Home() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? ROUTES.LOGS : ROUTES.LOGIN);
}
