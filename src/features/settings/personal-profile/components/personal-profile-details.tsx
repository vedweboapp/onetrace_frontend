"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { fetchPersonalProfile } from "../api/personal-profile.api";
import type { PersonalProfileResponse } from "../types/types";
import PersonalProfileHeader from "./personal-profile-header";
import PersonalProfileForm from "./personal-profile-form";
import { AppearancePanel } from "./appearance-panel";

const PersonalProfileDetails = () => {
  const userId = useAuthStore((s) => s.user?.id);
  const [params] = useUrlParams({ tab: "profile" });
  const activeTab = (params.tab as string) || "profile";

  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PersonalProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      setError("You must be signed in to view your profile.");
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
    } catch (err) {
      console.error("Failed to load personal profile", err);
      setError("Failed to load profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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
          isEditing={isEditing}
          initialData={profile}
          isLoading={isLoading}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default PersonalProfileDetails;
