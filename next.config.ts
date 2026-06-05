import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { DISPATCH_USE_MOCK } from "./src/features/dispatches/api/dispatch.mock.config";
import { MATERIAL_REQUEST_USE_MOCK } from "./src/features/material-requests/api/material-request.mock.config";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const backendOrigin =
  process.env.BACKEND_API_ORIGIN?.replace(/\/$/, "") ??
  "http://110.225.254.51:5050";


const explicitPublicApi = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "");
const nextPublicApiUrl =
  explicitPublicApi ||
  (process.env.NODE_ENV === "development"
    ? "/api/v1"
    : `${backendOrigin}/api/v1`);

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: nextPublicApiUrl,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsKey,
  },
  async rewrites() {
    const mockPrefixes = [
      MATERIAL_REQUEST_USE_MOCK ? "material-requests" : null,
      DISPATCH_USE_MOCK ? "dispatches" : null,
      DISPATCH_USE_MOCK ? "dispatch-return-requests" : null,
    ].filter(Boolean) as string[];
    const source =
      mockPrefixes.length > 0
        ? `/api/v1/:path((?!${mockPrefixes.join("|")}).*)`
        : "/api/v1/:path*";
    return [
      {
        source,
        destination: `${backendOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
