import type { DashboardAccentId } from "@/features/dashboard/store/dashboard-appearance.store";


export const ACCENT_HEX: Record<DashboardAccentId, string> = {
  black: "#111111",
  slate: "#334155",
  indigo: "#4f46e5",
  emerald: "#059669",
  rose: "#e11d48",
  violet: "#7c3aed",
  amber: "#d97706",
  sky: "#0284c7",
  fuchsia: "#c026d3",
  teal: "#0d9488",
  orange: "#ea580c",
};

export function normalizeAccentHex(raw: string): string {
  let h = raw.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  }
  if (h.length === 7) return h.toLowerCase();
  return "#111111";
}


export function accentOnAccentHex(backgroundHex: string): "#ffffff" | "#111111" {
  let h = backgroundHex.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4 && h[1] && h[2] && h[3]) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  }
  if (h.length !== 7) return "#ffffff";
  const n = Number.parseInt(h.slice(1), 16);
  if (Number.isNaN(n)) return "#ffffff";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.58 ? "#111111" : "#ffffff";
}
