"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

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

export type DashboardFontSize = "small" | "medium" | "large";

export type FormLabelPlacement = "top" | "left" | "right";

export type RequiredFieldIndicator = "asterisk" | "redLine";

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

export const FONT_SIZE_ORDER: DashboardFontSize[] = ["small", "medium", "large"];

export const SIDEBAR_LAYOUT_ORDER: DashboardSidebarLayout[] = [
  "lithium",
  "hydrogen",
  "boron",
];

export const FORM_LABEL_PLACEMENT_ORDER: FormLabelPlacement[] = ["top", "left", "right"];

export const REQUIRED_INDICATOR_ORDER: RequiredFieldIndicator[] = ["asterisk", "redLine"];

const DEFAULT_HEX = "#111111";

type State = {
  accentKind: DashboardAccentKind;
  accent: DashboardAccentId;
  customAccentHex: string;
  fontFamily: DashboardFontFamily;
  fontSize: DashboardFontSize;
  sidebarLayout: DashboardSidebarLayout;
  formLabelPlacement: FormLabelPlacement;
  requiredIndicator: RequiredFieldIndicator;
  setAccentPreset: (accent: DashboardAccentId) => void;
  setAccentCustom: (hex: string) => void;
  setFontFamily: (fontFamily: DashboardFontFamily) => void;
  setFontSize: (fontSize: DashboardFontSize) => void;
  setSidebarLayout: (sidebarLayout: DashboardSidebarLayout) => void;
  setFormLabelPlacement: (formLabelPlacement: FormLabelPlacement) => void;
  setRequiredIndicator: (requiredIndicator: RequiredFieldIndicator) => void;
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
      fontSize: "medium",
      sidebarLayout: "lithium",
      formLabelPlacement: "top",
      requiredIndicator: "asterisk",
      setAccentPreset: (accent) => set({ accentKind: "preset", accent }),
      setAccentCustom: (hex) =>
        set({
          accentKind: "custom",
          customAccentHex: hex.trim() || DEFAULT_HEX,
        }),
      setFontFamily: (fontFamily) => set({ fontFamily }),
      setFontSize: (fontSize) => set({ fontSize }),
      setSidebarLayout: (sidebarLayout) => set({ sidebarLayout }),
      setFormLabelPlacement: (formLabelPlacement) => set({ formLabelPlacement }),
      setRequiredIndicator: (requiredIndicator) => set({ requiredIndicator }),
    }),
    {
      name: "SimHo-dashboard-accent",
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
          fontSize: pickEnum(p?.fontSize, FONT_SIZE_ORDER, current.fontSize),
          sidebarLayout: pickEnum(p?.sidebarLayout, SIDEBAR_LAYOUT_ORDER, current.sidebarLayout),
          formLabelPlacement: pickEnum(
            p?.formLabelPlacement,
            FORM_LABEL_PLACEMENT_ORDER,
            current.formLabelPlacement,
          ),
          requiredIndicator: pickEnum(
            p?.requiredIndicator,
            REQUIRED_INDICATOR_ORDER,
            current.requiredIndicator,
          ),
        };
      },
    },
  ),
);
