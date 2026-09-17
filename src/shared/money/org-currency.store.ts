"use client";

import { create } from "zustand";
import {
  DEFAULT_ORG_CURRENCY,
  normalizeOrgCurrencySettings,
  type OrgCurrencySettings,
} from "@/shared/money/org-currency.types";

type OrgCurrencyState = {
  settings: OrgCurrencySettings;
  loaded: boolean;
  loading: boolean;
  setSettings: (partial: Partial<OrgCurrencySettings> | null | undefined) => void;
  setLoading: (loading: boolean) => void;
  setLoaded: (loaded: boolean) => void;
};

export const useOrgCurrencyStore = create<OrgCurrencyState>((set) => ({
  settings: DEFAULT_ORG_CURRENCY,
  loaded: false,
  loading: false,
  setSettings: (partial) =>
    set({
      settings: normalizeOrgCurrencySettings(partial),
      loaded: true,
      loading: false,
    }),
  setLoading: (loading) => set({ loading }),
  setLoaded: (loaded) => set({ loaded }),
}));

export function getOrgCurrencySettings(): OrgCurrencySettings {
  return useOrgCurrencyStore.getState().settings;
}
