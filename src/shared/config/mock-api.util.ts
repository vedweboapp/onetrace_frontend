/**
 * Reads a NEXT_PUBLIC_* env flag for mock vs real API.
 * Defaults to mock enabled when unset (backend not ready).
 * Mock modules still emit HTTP to `/api/mock/v1/<path>` so payload + endpoint
 * show in DevTools → Network (see emitMockApiNetworkRequest).
 */
export function isMockApiEnabledFromEnv(envKey: string, defaultEnabled = true): boolean {
  const raw = process.env[envKey]?.trim().toLowerCase();
  if (raw === "false" || raw === "0" || raw === "no") return false;
  if (raw === "true" || raw === "1" || raw === "yes") return true;
  return defaultEnabled;
}
