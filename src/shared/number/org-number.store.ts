"use client";

import { create } from "zustand";
import {
  DEFAULT_ORG_NUMBER_FORMAT,
  normalizeOrgNumberFormat,
  type OrgNumberFormat,
} from "@/shared/number/digit-grouping.util";

type OrgNumberState = {
  numberFormat: OrgNumberFormat;
  loaded: boolean;
  setNumberFormat: (raw?: string | null) => void;
  setLoaded: (loaded: boolean) => void;
};

export const useOrgNumberStore = create<OrgNumberState>((set) => ({
  numberFormat: DEFAULT_ORG_NUMBER_FORMAT,
  loaded: false,
  setNumberFormat: (raw) =>
    set({
      numberFormat: normalizeOrgNumberFormat(raw),
      loaded: true,
    }),
  setLoaded: (loaded) => set({ loaded }),
}));

export function getOrgNumberFormat(): OrgNumberFormat {
  return useOrgNumberStore.getState().numberFormat;
}
