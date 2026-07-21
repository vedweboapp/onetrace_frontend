import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  "http://110.225.254.51:5050/api/v1";

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ["ineffectual-stephania-immemorially.ngrok-free.dev"],
  env: {
    NEXT_PUBLIC_API_URL: nextPublicApiUrl,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsKey,
  },
  async redirects() {
    return [
      {
        source: "/:locale(en|es)/dashboard/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/:locale(en|es)/dashboard",
        destination: "/home",
        permanent: true,
      },
      {
        source: "/dashboard/:path*",
        destination: "/:path*",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/home",
        permanent: true,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
