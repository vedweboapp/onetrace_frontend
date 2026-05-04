import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Upstream API for `/api/v1/*` rewrites (used when the browser calls same-origin `/api/v1/...`).
 * Restart `next dev` after changing env.
 *
 * `env.NEXT_PUBLIC_API_URL` is set here so Turbopack reliably inlines it into the client bundle.
 * Default: `${BACKEND_API_ORIGIN}/api/v1` (browser hits the backend host directly; backend must allow CORS).
 * Override with `NEXT_PUBLIC_API_URL=/api/v1` to keep requests on localhost and use rewrites only.
 */
const backendOrigin =
  process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "") ??
  "http://110.225.254.51:5050";

const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ||
  `${backendOrigin}/api/v1`;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: nextPublicApiUrl,
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
