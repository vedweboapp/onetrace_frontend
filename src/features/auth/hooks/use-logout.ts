"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { logoutRequest } from "@/features/auth/api/auth-api";
import { useAuthStore } from "@/features/auth/store/auth-store";
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
      clearAuth();
      setIsLoggingOut(false);
      router.replace(routes.auth.login);
    }
  }

  return { logout, isLoggingOut };
}
