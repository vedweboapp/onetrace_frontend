import { useAuthStore } from "@/features/auth/store/auth.store";

const AUTH_PATH_FRAGMENTS = ["/login", "/register", "/forgot-password", "/reset-password"];

let sessionExpireInProgress = false;

function isOnAuthPath(pathname: string) {
  return AUTH_PATH_FRAGMENTS.some((f) => pathname.includes(f));
}

export function navigateToLoginIfBrowser() {
  if (typeof window === "undefined") return;
  if (isOnAuthPath(window.location.pathname)) return;
  window.location.assign("/login");
}

/**
 * Clear session and send user to login when access token is expired/invalid.
 * Safe to call multiple times (only redirects once).
 */
export function forceSessionExpiredLogout() {
  if (typeof window === "undefined") return;
  if (sessionExpireInProgress) return;
  if (isOnAuthPath(window.location.pathname)) {
    useAuthStore.getState().clearAuth();
    return;
  }
  sessionExpireInProgress = true;
  useAuthStore.getState().clearAuth();
  navigateToLoginIfBrowser();
}
