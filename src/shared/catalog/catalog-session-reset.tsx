"use client";

import * as React from "react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { clearSessionCatalogCaches } from "@/shared/catalog/clear-session-catalog-caches";

/**
 * Clears role/user/scheduling dropdown caches when the access token or org changes
 * (logout → login as another account, or org switch).
 */
export function CatalogSessionReset() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const organizations = useAuthStore((s) => s.organizations);
  const orgId = getSessionOrganizationId(organizations);
  const sessionKey = `${accessToken ?? ""}:${orgId ?? ""}`;
  const prevKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (prevKeyRef.current === null) {
      // First mount after login / hard refresh: drop any caches left from a prior SPA session.
      prevKeyRef.current = sessionKey;
      clearSessionCatalogCaches();
      return;
    }
    if (prevKeyRef.current === sessionKey) return;
    prevKeyRef.current = sessionKey;
    clearSessionCatalogCaches();
  }, [sessionKey]);

  return null;
}
