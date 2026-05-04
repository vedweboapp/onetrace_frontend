import type { DashboardAccentId } from "@/features/dashboard/store/dashboard-appearance-store";

/** Hex values for preset accents (header stripe, CSS var `--dash-accent`). */
export const ACCENT_HEX: Record<DashboardAccentId, string> = {
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
  return "#4f46e5";
}
