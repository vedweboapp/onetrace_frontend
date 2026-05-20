/** Normalizes what3words input (strips URL prefix if pasted). */
export function normalizeWhat3WordsInput(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const urlMatch = /what3words\.com\/([^/?#]+)/i.exec(t);
  if (urlMatch?.[1]) return urlMatch[1].trim();
  return t.replace(/^\/+/, "");
}

export function what3WordsHref(words: string): string {
  const normalized = normalizeWhat3WordsInput(words);
  return normalized ? `https://what3words.com/${encodeURIComponent(normalized)}` : "";
}

export function hasWhat3Words(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}
