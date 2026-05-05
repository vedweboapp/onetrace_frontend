import type { CSSProperties } from "react";
import type { DashboardAccentId } from "@/features/dashboard/store/dashboard-appearance.store";
import {
  accentActiveNavClass,
  accentHeaderStripeClass,
} from "@/features/dashboard/utils/accent-styles.util";
import { cn } from "@/core/utils/http.util";


export type AccentResolutionInput = {
  accentKind: "preset" | "custom";
  accent: DashboardAccentId;
  customAccentHex: string;
};

function normalizeHex(raw: string): string {
  let h = raw.trim();
  if (!h.startsWith("#")) h = `#${h}`;
  if (h.length === 4) {
    const r = h[1];
    const g = h[2];
    const b = h[3];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  if (h.length === 7) return h.toLowerCase();
  return "#111111";
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const h = normalizeHex(hex);
  const body = h.slice(1);
  if (body.length !== 6) return null;
  const n = parseInt(body, 16);
  if (Number.isNaN(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}


function navTextClassForHex(hex: string): string {
  const rgb = parseRgb(hex);
  if (!rgb) return "text-white";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.72 ? "text-slate-900" : "text-white";
}

export function resolveDashboardAccent(input: AccentResolutionInput): {
  navActiveClassName: string;
  navActiveStyle?: CSSProperties;
  stripeClassName: string;
  stripeStyle?: CSSProperties;
} {
  if (input.accentKind === "custom") {
    const hex = normalizeHex(input.customAccentHex);
    const text = navTextClassForHex(hex);
    return {
      navActiveClassName: cn("font-medium shadow-sm", text),
      navActiveStyle: { backgroundColor: hex },
      stripeClassName: "",
      stripeStyle: { backgroundColor: hex },
    };
  }

  return {
    navActiveClassName: accentActiveNavClass(input.accent),
    stripeClassName: accentHeaderStripeClass(input.accent),
  };
}
