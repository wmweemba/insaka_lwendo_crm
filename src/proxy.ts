import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const PROTECTED_PATHS = ["/", "/contacts", "/pipeline", "/leads"];

function isProtected(pathname: string) {
  return PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

// Only the nonce differs per request; the rest of the template is static, so
// it's built + whitespace-normalized once at module load instead of on every
// request, and split around a placeholder so a request only needs a cheap
// string concat (no regex, no template re-parse) to insert its nonce.
const CSP_NONCE_PLACEHOLDER = "__CSP_NONCE__";

function buildCspTemplate(isDev: boolean) {
  return `
    default-src 'self';
    script-src 'self' 'nonce-${CSP_NONCE_PLACEHOLDER}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""};
    style-src 'self' 'unsafe-inline';
    img-src 'self' data: https:;
    connect-src 'self';
    frame-ancestors 'none';
  `
    .replace(/\s{2,}/g, " ")
    .trim();
}

const [CSP_BEFORE_NONCE, CSP_AFTER_NONCE] = buildCspTemplate(
  process.env.NODE_ENV === "development",
).split(CSP_NONCE_PLACEHOLDER);

// CSP nonce must be generated per-request here (next.config.ts headers() runs
// once at build/route-definition time, so it can't produce a fresh value per
// request) — see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md.
// Every page under the broad matcher below is already dynamically rendered
// (sign-in and the dashboard layout both call headers()), so nonce-gated CSP
// doesn't cost any static optimization we'd otherwise get.
export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = CSP_BEFORE_NONCE + nonce + CSP_AFTER_NONCE;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeader);

  // Optimistic-only check (Next 16 guidance: Proxy shouldn't do full session
  // validation) — gates page loads on cookie presence. The dashboard layout
  // re-validates the real session server-side, so a forged/stale cookie still
  // can't reach any data.
  if (isProtected(request.nextUrl.pathname) && !getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", cspHeader);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
