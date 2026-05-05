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

const DEFAULT_HEX = "#111111";

type State = {
  accentKind: DashboardAccentKind;
  accent: DashboardAccentId;
  customAccentHex: string;
  setAccentPreset: (accent: DashboardAccentId) => void;
  setAccentCustom: (hex: string) => void;
};

export const useDashboardAppearanceStore = create<State>()(
  persist(
    (set) => ({
      accentKind: "preset",
      accent: "black",
      customAccentHex: DEFAULT_HEX,
      setAccentPreset: (accent) =>
        set({ accentKind: "preset", accent }),
      setAccentCustom: (hex) =>
        set({
          accentKind: "custom",
          customAccentHex: hex.trim() || DEFAULT_HEX,
        }),
    }),
    {
      name: "one-trace-dashboard-accent",
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
        };
      },
    },
  ),
);
