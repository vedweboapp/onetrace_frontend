import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import mdx from "@next/mdx";

const withMDX = mdx({ extension: /\.mdx$/ });
const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextPublicApiUrl =
  process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, "") ??
  "http://110.225.254.51:5050/api/v1";

const backendApiOrigin =
  process.env.BACKEND_API_ORIGIN?.trim().replace(/\/$/, "") ??
  "http://110.225.254.51:5050";

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
const googleMapsMapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() ?? "";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  skipTrailingSlashRedirect: true,
  allowedDevOrigins: ["ineffectual-stephania-immemorially.ngrok-free.dev"],
  env: {
    NEXT_PUBLIC_API_URL: nextPublicApiUrl,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: googleMapsKey,
    NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID: googleMapsMapId,
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
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendApiOrigin}/api/v1/:path*`,
      },
    ];
  },
};

export default withNextIntl(withMDX(nextConfig));
