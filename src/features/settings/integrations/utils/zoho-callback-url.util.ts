import { routes } from "@/shared/config/routes";

/** Absolute frontend URL Zoho redirects to after authorization. */
export function buildZohoFrontendCallbackUrl(): string {
  const path = routes.dashboard.settingsZohoCallback;
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return base ? `${base}${path}` : path;
}
