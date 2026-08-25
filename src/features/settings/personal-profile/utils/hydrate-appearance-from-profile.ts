import { useDashboardAppearanceStore } from "../store/dashboard-appearance.store";
import { appearanceStoreFromApiPreferences, type ApiAppearancePreferences } from "./appearance-preferences.util";

export function hydrateAppearanceFromProfile(
  preferences: ApiAppearancePreferences | null | undefined,
) {
  const patch = appearanceStoreFromApiPreferences(preferences);
  if (Object.keys(patch).length === 0) return;

  useDashboardAppearanceStore.setState((state) => ({
    ...state,
    ...patch,
  }));
}
