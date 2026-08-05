/**
 * Dimensions typing helpers for item / composite-item forms (L*W*H).
 * Separators `*`, `x`, `×`, `/`, and spaces are normalized to `*`.
 */

export function parseDimensionsInput(raw: string): { length: string; width: string; height: string } {
  const parts = raw
    .split(/[xX*×/]/g)
    .map((p) => p.trim())
    .filter(Boolean);
  return {
    length: parts[0] ?? "",
    width: parts[1] ?? "",
    height: parts[2] ?? "",
  };
}

export function composeDimensionsInput(lengthRaw: string, widthRaw: string, heightRaw: string): string {
  const l = lengthRaw.trim();
  const w = widthRaw.trim();
  const h = heightRaw.trim();
  if (!l || !w || !h) return "";
  return `${l}*${w}*${h}`;
}

function sanitizeDimensionSegment(segment: string): string {
  const cleaned = segment.replace(/[^0-9.]/g, "");
  const dot = cleaned.indexOf(".");
  if (dot === -1) return cleaned;
  return cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, "");
}

/**
 * Auto-inserts `*` after length / breadth as the user types separators
 * (space, x, ×, *, /), e.g. `12 ` → `12*`, `12*34 ` → `12*34*`.
 * Caps at three segments (L*W*H).
 */
export function formatDimensionsInputAsTyped(raw: string): string {
  if (!raw) return "";

  // Treat space / x / × / / as separator intent → *
  let s = raw.replace(/[×xX/\s]+/g, "*").replace(/[^0-9.*]/g, "");
  s = s.replace(/\*+/g, "*");

  // Don't allow leading *
  s = s.replace(/^\*+/, "");

  const endsWithSep = s.endsWith("*");
  const rawParts = s.split("*");
  const segments: string[] = [];

  for (let i = 0; i < rawParts.length; i++) {
    const part = rawParts[i]!;
    const isLast = i === rawParts.length - 1;
    if (part === "" && isLast && endsWithSep) continue;
    if (part === "") continue;
    segments.push(sanitizeDimensionSegment(part));
    if (segments.length >= 3) break;
  }

  if (segments.length === 0) {
    return endsWithSep ? "" : "";
  }

  if (endsWithSep && segments.length < 3) {
    return `${segments.join("*")}*`;
  }

  return segments.join("*");
}
