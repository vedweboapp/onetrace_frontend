import { routes } from "@/shared/config/routes";

/** Absolute frontend URL Zoho redirects to after authorization. */
export function buildZohoFrontendCallbackUrl(locale: string): string {
  const path = routes.dashboard.settingsZohoCallback;
  if (typeof window !== "undefined") {
    const normalizedLocale = locale.trim() || "en";
    return `${window.location.origin}/${normalizedLocale}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  const normalizedLocale = locale.trim() || "en";
  return base ? `${base}/${normalizedLocale}${path}` : `/${normalizedLocale}${path}`;
}
