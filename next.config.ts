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

  async headers() {
    // Next dev (Turbopack HMR, React Refresh) injects inline bootstrap scripts and
    // uses eval — a strict `script-src 'self'` blocks the app from rendering at all
    // in `next dev`. Relax script-src in development only; production keeps the
    // locked-down policy.
    const scriptSrc =
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self'";

    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              scriptSrc,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
