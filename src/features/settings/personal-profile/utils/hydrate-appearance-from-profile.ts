import { useDashboardAppearanceStore } from "../store/dashboard-appearance.store";
import { appearanceStoreFromApiPreferences, type ApiAppearancePreferences } from "./appearance-preferences.util";
import { useTabLayoutsStore } from "@/shared/store/tab-layouts.store";
import { writeStoredTabLayout } from "@/shared/utils/tab-layout.util";
import { useAuthStore } from "@/features/auth/store/auth.store";

/** Write hydrated layouts into per-user localStorage so first paint after reload matches profile. */
function syncLayoutsToLocalStorage(layouts: Record<string, { order: string[]; hidden: string[] }>) {
  const userId = useAuthStore.getState().user?.id;
  if (userId == null) return;
  for (const [scope, layout] of Object.entries(layouts)) {
    writeStoredTabLayout(`ot.ui.tabOrder.${scope}.${userId}`, layout);
  }
}

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
  // Always replace (never merge previous user). Empty → appearance catalog defaults apply.
  useTabLayoutsStore.getState().hydrateFromApi(preferences?.tab_layouts ?? {});
  const layouts = useTabLayoutsStore.getState().layouts;
  if (Object.keys(layouts).length > 0) {
    syncLayoutsToLocalStorage(layouts);
  }

  return {
    themeMode:
      preferences?.theme_mode === "dark" || preferences?.theme_mode === "light"
        ? preferences.theme_mode
        : undefined,
    language: preferences?.language?.trim() || undefined,
  };
}
