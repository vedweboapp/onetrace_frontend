const AUTH_PATH_FRAGMENTS = ["/login", "/register", "/forgot-password", "/reset-password"];

function isOnAuthPath(pathname: string) {
  return AUTH_PATH_FRAGMENTS.some((f) => pathname.includes(f));
}

export function navigateToLoginIfBrowser() {
  if (typeof window === "undefined") return;
  if (isOnAuthPath(window.location.pathname)) return;
  window.location.assign("/login");
}
