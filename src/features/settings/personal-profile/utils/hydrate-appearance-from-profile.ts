import { useDashboardAppearanceStore } from "../store/dashboard-appearance.store";
import { appearanceStoreFromApiPreferences, type ApiAppearancePreferences } from "./appearance-preferences.util";
import { useTabLayoutsStore } from "@/shared/store/tab-layouts.store";

export function hydrateAppearanceFromProfile(
  preferences: ApiAppearancePreferences | null | undefined,
): { themeMode?: "light" | "dark"; language?: string } {
  const patch = appearanceStoreFromApiPreferences(preferences);
  if (Object.keys(patch).length > 0) {
    useDashboardAppearanceStore.setState((state) => ({
      ...state,
      ...patch,
    }));
  }

  useTabLayoutsStore.getState().setApiPreferencesCache(preferences ?? null);
  if (preferences?.tab_layouts) {
    useTabLayoutsStore.getState().hydrateFromApi(preferences.tab_layouts);
  }

  return {
    themeMode:
      preferences?.theme_mode === "dark" || preferences?.theme_mode === "light"
        ? preferences.theme_mode
        : undefined,
    language: preferences?.language?.trim() || undefined,
  };
}
