import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic-only check (Next 16 guidance: Proxy shouldn't do full session
// validation) — gates page loads on cookie presence. The dashboard layout
// re-validates the real session server-side, so a forged/stale cookie still
// can't reach any data.
export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/contacts/:path*", "/pipeline/:path*", "/leads/:path*"],
};
