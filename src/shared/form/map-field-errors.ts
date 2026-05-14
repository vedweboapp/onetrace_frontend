/**
 * Normalizes common API `errors` payloads (e.g. DRF-style `{ field: ["msg"] }`)
 * into a single string per top-level field for RHF `setError` / inline display.
 */
export function mapApiErrorsToFieldStrings(errors: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!errors || typeof errors !== "object" || Array.isArray(errors)) return out;

  for (const [key, raw] of Object.entries(errors as Record<string, unknown>)) {
    const msg = firstStringInTree(raw);
    if (msg) out[key] = msg;
  }

  return out;
}

function firstStringInTree(raw: unknown): string | undefined {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const m = firstStringInTree(item);
      if (m) return m;
    }
    return undefined;
  }
  if (raw && typeof raw === "object") {
    for (const value of Object.values(raw as Record<string, unknown>)) {
      const m = firstStringInTree(value);
      if (m) return m;
    }
  }
  return undefined;
}

