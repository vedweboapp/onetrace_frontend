"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@teispace/next-themes";
import { useLocale, useTranslations } from "next-intl";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { useDashboardAppearanceStore } from "../store/dashboard-appearance.store";
import { fetchPersonalProfile, updatePersonalProfile } from "../api/personal-profile.api";
import type { PersonalProfileResponse } from "../types/types";
import PersonalProfileHeader from "./personal-profile-header";
import PersonalProfileForm, { PersonalProfileFormHandle } from "./personal-profile-form";
import { AppearancePanel } from "./appearance-panel";
import {
  buildApiAppearancePreferences,
  captureAppearanceStoreSnapshot,
  type AppearanceStoreSlice,
  type ApiAppearancePreferences,
} from "../utils/appearance-preferences.util";
import { hydrateAppearanceFromProfile } from "../utils/hydrate-appearance-from-profile";

function readAppearanceSlice(): AppearanceStoreSlice {
  const s = useDashboardAppearanceStore.getState();
  return {
    accentKind: s.accentKind,
    accent: s.accent,
    customAccentHex: s.customAccentHex,
    fontFamily: s.fontFamily,
    fontSize: s.fontSize,
    sidebarLayout: s.sidebarLayout,
    formLabelPlacement: s.formLabelPlacement,
    requiredIndicator: s.requiredIndicator,
    detailRowLineWidth: s.detailRowLineWidth,
    detailRowLineStyle: s.detailRowLineStyle,
  };
}

function applyAppearanceSnapshot(snapshot: AppearanceStoreSlice) {
  useDashboardAppearanceStore.setState((state) => ({ ...state, ...snapshot }));
}

const PersonalProfileDetails = () => {
  const t = useTranslations("Dashboard.settingsPersonalProfile");
  const userId = useAuthStore((s) => s.user?.id);
  const [params] = useUrlParams({ tab: "profile" });
  const activeTab = String(params.tab || "profile");
  const locale = useLocale();
  const { theme, setTheme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PersonalProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<PersonalProfileFormHandle>(null);
  const appearanceSnapshotRef = useRef<AppearanceStoreSlice | null>(null);
  const savedErrorMessageRef = useRef<ApiAppearancePreferences["error_message"]>(undefined);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setError(t("mustSignIn"));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchPersonalProfile(String(userId));
      const resolved =
        data && typeof data === "object" && "data" in data
          ? (data as { data: PersonalProfileResponse }).data
          : (data as PersonalProfileResponse);
      setProfile(resolved);

      const prefs = (resolved as { appearance_settings?: { preferences?: ApiAppearancePreferences } })
        ?.appearance_settings?.preferences;
      savedErrorMessageRef.current = prefs?.error_message;
      hydrateAppearanceFromProfile(prefs);
      if (prefs?.theme_mode === "light" || prefs?.theme_mode === "dark") {
        setTheme(prefs.theme_mode);
      }
      appearanceSnapshotRef.current = captureAppearanceStoreSnapshot(readAppearanceSlice());

      const detail = resolved?.user_detail;
      const nested = detail?.user;
      const first =
        nested?.first_name?.trim() ||
        (detail as { first_name?: string } | undefined)?.first_name?.trim() ||
        "";
      const last =
        nested?.last_name?.trim() ||
        (detail as { last_name?: string } | undefined)?.last_name?.trim() ||
        "";
      if (first || last) {
        useAuthStore.getState().patchUser({
          first_name: first || undefined,
          last_name: last || undefined,
        });
      }
    } catch (err) {
      console.error("Failed to load personal profile", err);
      setError(t("loadError"));
    } finally {
      setIsLoading(false);
    }
  }, [userId, t, setTheme]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSuccess = () => {
    loadProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (activeTab === "appearance") {
      if (appearanceSnapshotRef.current) {
        applyAppearanceSnapshot(appearanceSnapshotRef.current);
      }
      const prefs = (profile as { appearance_settings?: { preferences?: ApiAppearancePreferences } } | null)
        ?.appearance_settings?.preferences;
      if (prefs?.theme_mode === "light" || prefs?.theme_mode === "dark") {
        setTheme(prefs.theme_mode);
      }
      return;
    }
    formRef.current?.reset();
    setIsEditing(false);
  };

  const saveAppearance = async () => {
    if (!profile?.id) return;
    setIsSaving(true);
    try {
      const preferences = buildApiAppearancePreferences({
        store: readAppearanceSlice(),
        themeMode: theme === "dark" ? "dark" : "light",
        language: locale,
        errorMessage: savedErrorMessageRef.current,
      });
      await updatePersonalProfile(String(profile.id), {
        appearance_settings: { preferences },
      });
      appearanceSnapshotRef.current = captureAppearanceStoreSnapshot(readAppearanceSlice());
      savedErrorMessageRef.current = preferences.error_message;
      toastSuccess(t("updatedToast"));
    } catch (err) {
      console.error("Failed to save appearance settings", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = () => {
    if (activeTab === "appearance") {
      void saveAppearance();
      return;
    }
    formRef.current?.submit();
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <PersonalProfileHeader
        activeTab={activeTab}
        isEditing={isEditing}
        onEdit={() => setIsEditing(true)}
        onCancel={handleCancel}
        onSave={handleSave}
        isSaving={isSaving}
      />

      {activeTab === "appearance" ? (
        <AppearancePanel />
      ) : isLoading ? (
        <div className="flex w-full items-center justify-center p-20">
          <div className="size-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : error ? (
        <p className="text-sm font-medium text-red-500">{error}</p>
      ) : (
        <PersonalProfileForm
          ref={formRef}
          isEditing={isEditing}
          initialData={profile}
          isLoading={isLoading}
          onSuccess={handleSuccess}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
        />
      )}
    </div>
  );
};

export default PersonalProfileDetails;
