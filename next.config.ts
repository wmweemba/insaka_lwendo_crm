import type { NextConfig } from "next";

// Security headers adapted from wsm-second-brain/scaffold/security-baseline/security-headers.nextjs.js
// ADAPT: connect-src and img-src will need the Coolify Postgres/API origins
// once ingest endpoints and any external asset hosts are wired up.
const nextConfig: NextConfig = {
  poweredByHeader: false,

  // Route-level fade+rise transitions (ui_spec.md §5.1) use the browser's
  // native View Transitions API via this flag, not a client animation
  // library — see ui_spec.md §5 for why that split exists.
  experimental: {
    viewTransition: true,
  },

  // Content-Security-Policy is set in src/proxy.ts instead of here: it needs a
  // fresh nonce per request, and this headers() config only runs once at
  // build/route-definition time — see the comment in proxy.ts for why.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
    ];
  },
};

export default nextConfig;
