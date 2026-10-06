"use client";

import { useAuthStore } from "@/features/auth/store/auth.store";
import { updatePersonalProfile } from "@/features/settings/personal-profile/api/personal-profile.api";
import { useDashboardAppearanceStore } from "@/features/settings/personal-profile/store/dashboard-appearance.store";
import {
  buildApiAppearancePreferences,
  type ApiAppearancePreferences,
} from "@/features/settings/personal-profile/utils/appearance-preferences.util";
import { useTabLayoutsStore } from "@/shared/store/tab-layouts.store";

const DEBOUNCE_MS = 700;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistInFlight = false;
let persistQueued = false;

export function mergeAppearancePreferencesWithTabLayouts(
  base: ApiAppearancePreferences | null | undefined,
): ApiAppearancePreferences {
  const store = useDashboardAppearanceStore.getState();
  const cache = base ?? useTabLayoutsStore.getState().apiPreferencesCache;
  const fromStore = buildApiAppearancePreferences({
    store: {
      accentKind: store.accentKind,
      accent: store.accent,
      customAccentHex: store.customAccentHex,
      fontFamily: store.fontFamily,
      fontSize: store.fontSize,
      sidebarLayout: store.sidebarLayout,
      formLabelPlacement: store.formLabelPlacement,
      requiredIndicator: store.requiredIndicator,
      detailRowLineWidth: store.detailRowLineWidth,
      detailRowLineStyle: store.detailRowLineStyle,
    },
    themeMode: cache?.theme_mode === "dark" ? "dark" : "light",
    language: cache?.language?.trim() || "en",
    errorMessage: cache?.error_message,
  });
  return {
    ...(cache ?? fromStore),
    tab_layouts: useTabLayoutsStore.getState().layouts,
  };
}

async function flushTabLayoutsToBackend() {
  const userId = useAuthStore.getState().user?.id;
  if (!userId) return;
  persistInFlight = true;
  try {
    const preferences = mergeAppearancePreferencesWithTabLayouts(
      useTabLayoutsStore.getState().apiPreferencesCache,
    );
    await updatePersonalProfile(String(userId), {
      appearance_settings: { preferences },
    });
    useTabLayoutsStore.getState().setApiPreferencesCache(preferences);
  } catch {
    /* keep local layout; next change retries */
  } finally {
    persistInFlight = false;
    if (persistQueued) {
      persistQueued = false;
      scheduleTabLayoutsPersist(0);
    }
  }
}

export function scheduleTabLayoutsPersist(delayMs = DEBOUNCE_MS) {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    persistTimer = null;
    if (persistInFlight) {
      persistQueued = true;
      return;
    }
    void flushTabLayoutsToBackend();
  }, delayMs);
}
