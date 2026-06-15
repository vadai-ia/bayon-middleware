import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Defense-in-depth (ERRORES.md #1): the MCP endpoint and any other API route
  // must NEVER be intercepted by auth. Whaapy posts here without a session and
  // must reach the handler (no 307 redirect). The matcher below already excludes
  // /api/*, this is a second guard in case the matcher is ever loosened.
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  return updateSession(request);
}

export const config = {
  /**
   * Run on everything EXCEPT:
   *  - /api/*            (MCP + future public APIs — ERRORES.md #1)
   *  - Next internals    (_next/static, _next/image)
   *  - common static files (favicon, images)
   */
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
