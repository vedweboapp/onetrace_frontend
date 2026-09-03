import { routes } from "@/shared/config/routes";

export type ZohoOAuthCallbackParams = {
  code: string;
  state: string;
  accountsServer: string;
};

export function buildZohoConnectionTabUrl(tab: "help" | "configure" | "webhook"): string {
  return `${routes.dashboard.settingsZohoConnection}?tab=${tab}`;
}

export function readZohoOAuthCallbackParams(
  searchParams: URLSearchParams,
): ZohoOAuthCallbackParams & { hasRequiredParams: boolean } {
  const code = searchParams.get("code")?.trim() ?? "";
  const state = searchParams.get("state")?.trim() ?? "";
  const accountsServer = searchParams.get("accounts-server")?.trim() ?? "";
  return {
    code,
    state,
    accountsServer,
    hasRequiredParams: Boolean(code && state && accountsServer),
  };
}

/** Absolute frontend URL Zoho redirects to after authorization. */
export function buildZohoFrontendCallbackUrl(): string {
  const path = buildZohoConnectionTabUrl("help");
  if (typeof window !== "undefined") {
    return `${window.location.origin}${path}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ?? "";
  return base ? `${base}${path}` : path;
}
