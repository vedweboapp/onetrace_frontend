"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { fetchPersonalProfile } from "../api/personal-profile.api";
import type { PersonalProfileResponse } from "../types/types";
import PersonalProfileHeader from "./personal-profile-header";
import PersonalProfileForm, { PersonalProfileFormHandle } from "./personal-profile-form";
import { AppearancePanel } from "./appearance-panel";
import { useTranslations } from "next-intl";

const PersonalProfileDetails = () => {
  const t = useTranslations("Dashboard.settingsPersonalProfile");
  const userId = useAuthStore((s) => s.user?.id);
  const [params] = useUrlParams({ tab: "profile" });
  const activeTab = (params.tab as string) || "profile";

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PersonalProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const formRef = useRef<PersonalProfileFormHandle>(null);

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
  }, [userId, t]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSuccess = () => {
    loadProfile();
    setIsEditing(false);
  };
  
  return (
    <div className="flex flex-col gap-4 w-full">
      <PersonalProfileHeader
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        showEdit={activeTab === "profile"}
        submitHandler={() => formRef.current?.submit()}
        isSaving={isSaving}
      />

      {activeTab === "appearance" ? (
        <AppearancePanel />
      ) : isLoading ? (
        <div className="flex items-center justify-center p-20 w-full">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
