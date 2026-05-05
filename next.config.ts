import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
