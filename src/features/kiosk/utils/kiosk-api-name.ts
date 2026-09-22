/** Derive a stable API key from a human-readable label */
export function deriveApiNameFromLabel(label: string, fallback = "option"): string {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || fallback
  );
}
