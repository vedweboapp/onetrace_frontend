"use client";

import { create } from "zustand";
import type { ApiAppearancePreferences } from "@/features/settings/personal-profile/utils/appearance-preferences.util";
import { DEFAULT_TAB_LAYOUTS } from "@/shared/config/default-tab-layouts";
import type { TabLayoutChoice, TabLayoutsMap } from "@/shared/utils/tab-layout.util";
import { parseTabLayout } from "@/shared/utils/tab-layout.util";

type TabLayoutsState = {
  /** User-customized layouts from profile / local edits. Empty scopes fall back to appearance defaults. */
  layouts: TabLayoutsMap;
  /** Last known full appearance preferences from GET/PATCH, so tab saves do not wipe other fields. */
  apiPreferencesCache: ApiAppearancePreferences | null;
  setApiPreferencesCache: (prefs: ApiAppearancePreferences | null | undefined) => void;
  /** Replace all layouts from profile (new login / hydrate). Does not merge previous user state. */
  hydrateFromApi: (layouts: unknown) => void;
  setScopeLayout: (scope: string, layout: TabLayoutChoice) => void;
  clearScopeLayout: (scope: string) => void;
  replaceLayouts: (layouts: TabLayoutsMap) => void;
  /** Drop in-memory layouts (logout / user switch). */
  clearLayouts: () => void;
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
  hydrateFromApi: (layouts) => set({ layouts: sanitizeLayouts(layouts) }),
  setScopeLayout: (scope, layout) =>
    set((state) => ({
      layouts: { ...state.layouts, [scope]: layout },
    })),
  clearScopeLayout: (scope) =>
    set((state) => {
      if (!(scope in state.layouts)) return state;
      const next = { ...state.layouts };
      delete next[scope];
      return { layouts: next };
    }),
  replaceLayouts: (layouts) => set({ layouts }),
  clearLayouts: () => set({ layouts: {}, apiPreferencesCache: null }),
}));

/** Appearance default for a scope (catalog). */
export function appearanceDefaultTabLayout(scope: string): TabLayoutChoice | null {
  return DEFAULT_TAB_LAYOUTS[scope] ?? null;
}
