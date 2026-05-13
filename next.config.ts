import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const backendOrigin =
  process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "") ??
  "http://110.225.254.51:5050";

/**
 * In development, default to same-origin `/api/v1` so requests use Next rewrites.
 * That way opening the app as http://192.168.x.x:3000 (LAN) still hits your machine,
 * not `localhost` on the client device. Set NEXT_PUBLIC_API_URL to override.
 */
const explicitPublicApi = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
const nextPublicApiUrl =
  explicitPublicApi ||
  (process.env.NODE_ENV === "development"
    ? "/api/v1"
    : `${backendOrigin}/api/v1`);

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
