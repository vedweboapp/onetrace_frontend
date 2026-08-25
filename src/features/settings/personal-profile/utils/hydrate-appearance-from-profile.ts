import { useDashboardAppearanceStore } from "../store/dashboard-appearance.store";
import { appearanceStoreFromApiPreferences, type ApiAppearancePreferences } from "./appearance-preferences.util";

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

  return {
    themeMode:
      preferences?.theme_mode === "dark" || preferences?.theme_mode === "light"
        ? preferences.theme_mode
        : undefined,
    language: preferences?.language?.trim() || undefined,
  };
}
