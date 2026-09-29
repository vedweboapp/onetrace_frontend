"use client";

import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

export type DashboardAccentId =
  | "black"
  | "slate"
  | "indigo"
  | "emerald"
  | "rose"
  | "violet"
  | "amber"
  | "sky"
  | "fuchsia"
  | "teal"
  | "orange";

export type DashboardAccentKind = "preset" | "custom";

/** Zoho-style dashboard chrome layouts. */
export type DashboardSidebarLayout = "lithium" | "hydrogen" | "boron";

export type DashboardFontFamily =
  | "inter"
  | "roboto"
  | "sourceSans"
  | "openSans"
  | "dmSans"
  | "system";

/** Base body font size in px (Appearance → Font size). Allowed range 6–40. */
export type DashboardFontSize = number;

export const FONT_SIZE_PX_MIN = 6;
export const FONT_SIZE_PX_MAX = 40;
export const DEFAULT_FONT_SIZE_PX = 16;

/** Select options: every integer px from 6 through 40. */
export const FONT_SIZE_PX_OPTIONS: DashboardFontSize[] = Array.from(
  { length: FONT_SIZE_PX_MAX - FONT_SIZE_PX_MIN + 1 },
  (_, i) => FONT_SIZE_PX_MIN + i,
);

export function clampFontSizePx(value: unknown, fallback: DashboardFontSize = DEFAULT_FONT_SIZE_PX): DashboardFontSize {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(FONT_SIZE_PX_MAX, Math.max(FONT_SIZE_PX_MIN, Math.round(value)));
  }
  if (typeof value === "string") {
    const legacy: Record<string, number> = {
      small: 14,
      medium: 16,
      default: 16,
      large: 18,
      xlarge: 20,
    };
    if (value in legacy) return legacy[value]!;
    const parsed = Number.parseInt(value.replace(/px$/i, "").trim(), 10);
    if (Number.isFinite(parsed)) {
      return Math.min(FONT_SIZE_PX_MAX, Math.max(FONT_SIZE_PX_MIN, parsed));
    }
  }
  return fallback;
}

/** @deprecated Use FONT_SIZE_PX_OPTIONS */
export const FONT_SIZE_ORDER: DashboardFontSize[] = FONT_SIZE_PX_OPTIONS;

export type FormLabelPlacement = "top" | "left" | "right";

export type RequiredFieldIndicator = "asterisk" | "redLine";

/** Detail-page row divider thickness (CSS px). */
export type DetailRowLineWidth = "0" | "0.5" | "1" | "1.5" | "2" | "3";

/** Detail-page row divider style. */
export type DetailRowLineStyle = "solid" | "dashed" | "dotted";

export const ACCENT_ORDER: DashboardAccentId[] = [
  "black",
  "indigo",
  "emerald",
  "rose",
  "violet",
  "fuchsia",
  "teal",
  "orange",
  "amber",
  "sky",
  "slate",
];

export const FONT_FAMILY_ORDER: DashboardFontFamily[] = [
  "inter",
  "roboto",
  "sourceSans",
  "openSans",
  "dmSans",
  "system",
];

export const SIDEBAR_LAYOUT_ORDER: DashboardSidebarLayout[] = [
  "lithium",
  "hydrogen",
  "boron",
];

export const FORM_LABEL_PLACEMENT_ORDER: FormLabelPlacement[] = ["left", "top", "right"];

export const REQUIRED_INDICATOR_ORDER: RequiredFieldIndicator[] = ["asterisk", "redLine"];

export const DETAIL_ROW_LINE_WIDTH_ORDER: DetailRowLineWidth[] = [
  "0",
  "0.5",
  "1",
  "1.5",
  "2",
  "3",
];

export const DETAIL_ROW_LINE_STYLE_ORDER: DetailRowLineStyle[] = ["solid", "dashed", "dotted"];

const DEFAULT_HEX = "#111111";
const STORAGE_BASE = "SimHo-dashboard-accent";

/** Active user id for per-account local appearance (same browser, different logins). */
let appearanceUserKey: string | null = null;

export function setDashboardAppearanceUserKey(userId: string | number | null | undefined) {
  const next =
    userId != null && String(userId).trim() !== "" ? String(userId).trim() : null;
  if (appearanceUserKey === next) return;
  appearanceUserKey = next;
  void useDashboardAppearanceStore.persist.rehydrate();
}

function storageKey(name: string): string {
  return appearanceUserKey ? `${name}:u${appearanceUserKey}` : name;
}

const userScopedStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === "undefined") return null;
    const scoped = localStorage.getItem(storageKey(name));
    if (scoped != null) return scoped;
    // First login on this device: fall back to legacy unscoped key once.
    if (appearanceUserKey) {
      const legacy = localStorage.getItem(name);
      if (legacy != null) return legacy;
    }
    return null;
  },
  setItem: (name, value) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(storageKey(name), value);
  },
  removeItem: (name) => {
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey(name));
  },
};

type State = {
  accentKind: DashboardAccentKind;
  accent: DashboardAccentId;
  customAccentHex: string;
  fontFamily: DashboardFontFamily;
  fontSize: DashboardFontSize;
  sidebarLayout: DashboardSidebarLayout;
  formLabelPlacement: FormLabelPlacement;
  requiredIndicator: RequiredFieldIndicator;
  detailRowLineWidth: DetailRowLineWidth;
  detailRowLineStyle: DetailRowLineStyle;
  setAccentPreset: (accent: DashboardAccentId) => void;
  setAccentCustom: (hex: string) => void;
  setFontFamily: (fontFamily: DashboardFontFamily) => void;
  setFontSize: (fontSize: DashboardFontSize) => void;
  setSidebarLayout: (sidebarLayout: DashboardSidebarLayout) => void;
  setFormLabelPlacement: (formLabelPlacement: FormLabelPlacement) => void;
  setRequiredIndicator: (requiredIndicator: RequiredFieldIndicator) => void;
  setDetailRowLineWidth: (detailRowLineWidth: DetailRowLineWidth) => void;
  setDetailRowLineStyle: (detailRowLineStyle: DetailRowLineStyle) => void;
};

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : fallback;
}

export const useDashboardAppearanceStore = create<State>()(
  persist(
    (set) => ({
      accentKind: "preset",
      accent: "black",
      customAccentHex: DEFAULT_HEX,
      fontFamily: "inter",
      fontSize: DEFAULT_FONT_SIZE_PX,
      sidebarLayout: "lithium",
      formLabelPlacement: "left",
      requiredIndicator: "asterisk",
      detailRowLineWidth: "1",
      detailRowLineStyle: "solid",
      setAccentPreset: (accent) => set({ accentKind: "preset", accent }),
      setAccentCustom: (hex) =>
        set({
          accentKind: "custom",
          customAccentHex: hex.trim() || DEFAULT_HEX,
        }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize: clampFontSizePx(fontSize) }),
      setSidebarLayout: (sidebarLayout) => set({ sidebarLayout }),
      setFormLabelPlacement: (formLabelPlacement) => set({ formLabelPlacement }),
      setRequiredIndicator: (requiredIndicator) => set({ requiredIndicator }),
      setDetailRowLineWidth: (detailRowLineWidth) => set({ detailRowLineWidth }),
      setDetailRowLineStyle: (detailRowLineStyle) => set({ detailRowLineStyle }),
    }),
    {
      name: STORAGE_BASE,
      storage: createJSONStorage(() => userScopedStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<State> | undefined;
        return {
          ...current,
          ...p,
          accentKind:
            p?.accentKind === "custom" || p?.accentKind === "preset"
              ? p.accentKind
              : current.accentKind,
          accent: p?.accent ?? current.accent,
          customAccentHex: p?.customAccentHex ?? current.customAccentHex,
          fontFamily: pickEnum(p?.fontFamily, FONT_FAMILY_ORDER, current.fontFamily),
          fontSize: clampFontSizePx(p?.fontSize, current.fontSize),
          sidebarLayout: pickEnum(p?.sidebarLayout, SIDEBAR_LAYOUT_ORDER, current.sidebarLayout),
          formLabelPlacement: pickEnum(
            p?.formLabelPlacement,
            FORM_LABEL_PLACEMENT_ORDER,
            "left",
          ),
          requiredIndicator: pickEnum(
            p?.requiredIndicator,
            REQUIRED_INDICATOR_ORDER,
            current.requiredIndicator,
          ),
          detailRowLineWidth: pickEnum(
            p?.detailRowLineWidth,
            DETAIL_ROW_LINE_WIDTH_ORDER,
            "1",
          ),
          detailRowLineStyle: pickEnum(
            p?.detailRowLineStyle,
            DETAIL_ROW_LINE_STYLE_ORDER,
            "solid",
          ),
        };
      },
    },
  ),
);
