"use client";

import { create } from "zustand";
import type { ApiAppearancePreferences } from "@/features/settings/personal-profile/utils/appearance-preferences.util";
import type { TabLayoutChoice, TabLayoutsMap } from "@/shared/utils/tab-layout.util";
import { parseTabLayout } from "@/shared/utils/tab-layout.util";

type TabLayoutsState = {
  layouts: TabLayoutsMap;
  /** Last known full appearance preferences from GET/PATCH, so tab saves do not wipe other fields. */
  apiPreferencesCache: ApiAppearancePreferences | null;
  setApiPreferencesCache: (prefs: ApiAppearancePreferences | null | undefined) => void;
  hydrateFromApi: (layouts: unknown) => void;
  setScopeLayout: (scope: string, layout: TabLayoutChoice) => void;
  replaceLayouts: (layouts: TabLayoutsMap) => void;
};

function sanitizeLayouts(raw: unknown): TabLayoutsMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: TabLayoutsMap = {};
  for (const [scope, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!scope.trim()) continue;
    const parsed = parseTabLayout(value);
    if (parsed) out[scope] = parsed;
  }
  return out;
}

export const useTabLayoutsStore = create<TabLayoutsState>((set) => ({
  layouts: {},
  apiPreferencesCache: null,
  setApiPreferencesCache: (prefs) => set({ apiPreferencesCache: prefs ?? null }),
  hydrateFromApi: (layouts) =>
    set((state) => ({
      layouts: { ...state.layouts, ...sanitizeLayouts(layouts) },
    })),
  setScopeLayout: (scope, layout) =>
    set((state) => ({
      layouts: { ...state.layouts, [scope]: layout },
    })),
  replaceLayouts: (layouts) => set({ layouts }),
}));
