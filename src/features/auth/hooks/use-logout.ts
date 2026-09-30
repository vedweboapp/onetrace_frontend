"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { logoutRequest } from "@/features/auth/api/auth.api";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { clearAllDrawingGeometry, clearAllPinFocus } from "@/features/projects/utils/pin-geometry.util";
import { clearSessionCatalogCaches } from "@/shared/catalog/clear-session-catalog-caches";
import { routes } from "@/shared/config/routes";

export function useLogout() {
  const router = useRouter();
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);
    try {
      await logoutRequest();
    } catch {
    
    } finally {
      clearAllPinFocus();
      clearAllDrawingGeometry();
      clearSessionCatalogCaches();
      clearAuth();
      setIsLoggingOut(false);
      router.replace(routes.auth.login);
    }
  }

  return { logout, isLoggingOut };
}
