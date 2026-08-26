"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTheme } from "@teispace/next-themes";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { fetchPersonalProfile } from "../api/personal-profile.api";
import type { PersonalProfileResponse } from "../types/types";
import PersonalProfileHeader from "./personal-profile-header";
import PersonalProfileForm, { PersonalProfileFormHandle } from "./personal-profile-form";
import { AppearancePanel, type AppearancePanelHandle } from "./appearance-panel";
import { hydrateAppearanceFromProfile } from "../utils/hydrate-appearance-from-profile";

const PersonalProfileDetails = () => {
  const t = useTranslations("Dashboard.settingsPersonalProfile");
  const userId = useAuthStore((s) => s.user?.id);
  const { setTheme } = useTheme();
  const [params] = useUrlParams({ tab: "profile" });
  const activeTab = String(params.tab || "profile");

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PersonalProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<PersonalProfileFormHandle>(null);
  const appearanceRef = useRef<AppearancePanelHandle>(null);

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
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    setIsEditing(false);
    setIsSaving(false);
  }, [activeTab]);

  const handleSuccess = () => {
    loadProfile();
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (activeTab === "appearance") {
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

  return (
    <div className="flex w-full flex-col gap-4">
      <PersonalProfileHeader
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        showEdit={activeTab === "profile" || activeTab === "appearance"}
        submitHandler={handleSubmit}
        cancelHandler={handleCancel}
        isSaving={isSaving}
      />

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
  );
};

export default PersonalProfileDetails;
