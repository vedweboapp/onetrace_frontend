"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@teispace/next-themes";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { dashboardFillPageFrameClassName } from "@/shared/config/dashboard-shell";
import { useSettingsPageTab } from "@/shared/hooks/use-settings-page-tab";
import { cn } from "@/core/utils/http.util";
import { fetchPersonalProfile } from "../api/personal-profile.api";
import type { PersonalProfileResponse } from "../types/types";
import PersonalProfileHeader from "./personal-profile-header";
import PersonalProfileForm, { PersonalProfileFormHandle } from "./personal-profile-form";
import { AppearancePanel, type AppearancePanelHandle } from "./appearance-panel";
import { hydrateAppearanceFromProfile } from "../utils/hydrate-appearance-from-profile";

const PROFILE_TABS = [
  { id: "profile", label: "PERSONAL PROFILE" },
  { id: "appearance", label: "APPEARANCE" },
] as const;

const PersonalProfileDetails = () => {
  const t = useTranslations("Dashboard.settingsPersonalProfile");
  const userId = useAuthStore((s) => s.user?.id);
  const { setTheme } = useTheme();
  const { activeTab, setTab } = useSettingsPageTab("profile");

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PersonalProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<PersonalProfileFormHandle>(null);
  const appearanceRef = useRef<AppearancePanelHandle>(null);
  /** Tab we are leaving — used so cancel restores the correct panel. */
  const previousTabRef = useRef(activeTab);

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

      const hydrated = hydrateAppearanceFromProfile(resolved?.appearance_settings?.preferences);
      if (hydrated.themeMode) {
        setTheme(hydrated.themeMode);
      }

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
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setIsEditing(false);
    setIsSaving(false);
    previousTabRef.current = activeTab;
  }, [activeTab]);

  const handleSuccess = () => {
    void loadProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (previousTabRef.current === "appearance" || activeTab === "appearance") {
      appearanceRef.current?.cancel();
    }
  };

  const handleSubmit = () => {
    if (activeTab === "appearance") {
      void appearanceRef.current?.submit();
      return;
    }
    formRef.current?.submit();
  };

  const handleTabChange = (next: string) => {
    if (next === activeTab) return;
    previousTabRef.current = activeTab;
    setTab(next);
  };

  return (
    <div className={cn(dashboardFillPageFrameClassName, "w-full")}>
      <PersonalProfileHeader
        tabs={[...PROFILE_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        showEdit={activeTab === "profile" || activeTab === "appearance"}
        submitHandler={handleSubmit}
        cancelHandler={handleCancel}
        isSaving={isSaving}
      />

      <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain pb-4 pt-1 sm:pb-5">
        {activeTab === "appearance" ? (
          isLoading ? (
            <div className="flex w-full items-center justify-center p-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
            </div>
          ) : (
            <AppearancePanel
              ref={appearanceRef}
              isEditing={isEditing}
              isSaving={isSaving}
              setIsSaving={setIsSaving}
              onSaved={() => setIsEditing(false)}
              initialErrorMessage={profile?.appearance_settings?.preferences?.error_message}
            />
          )
        ) : isLoading ? (
          <div className="flex w-full items-center justify-center p-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
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
    </div>
  );
};

export default PersonalProfileDetails;
