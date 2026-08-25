"use client";
import { AppButton, AppTabs } from "@/shared/ui";
import React from "react";
import { PersonalProfileHeaderTabKey } from "../types/types";
import { useUrlParams } from "@/shared/hooks/use-url-params";

interface PersonalProfileHeaderProps {
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  showEdit?: boolean;
  submitHandler: () => void;
  cancelHandler?: () => void;
  isSaving: boolean;
}

const PersonalProfileHeader = ({
  isEditing,
  setIsEditing,
  showEdit = true,
  submitHandler,
  cancelHandler,
  isSaving,
}: PersonalProfileHeaderProps) => {
  const [params, setParam] = useUrlParams({ tab: "profile" });
  const activeTab = String(params.tab || "profile");

  const tabs: PersonalProfileHeaderTabKey[] = [
    { id: "profile", label: "PERSONAL PROFILE" },
    { id: "appearance", label: "APPEARANCE" },
  ];

  function handleCancel() {
    cancelHandler?.();
    setIsEditing(false);
  }

  return (
    <div className="sticky -top-5 z-30 flex items-center justify-between gap-3 bg-slate-50/95 px-0 pb-0 pt-5 backdrop-blur-sm sm:-top-6 sm:-mt-6 sm:pt-6 dark:bg-slate-950/95">
      <AppTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={(value) => {
          if (value !== activeTab && isEditing) {
            cancelHandler?.();
            setIsEditing(false);
          }
          setParam("tab", value);
        }}
        ariaLabel="Personal profile sections"
        className="relative z-10 min-w-0 flex-1"
      />
      <div className="relative z-10 flex shrink-0 items-center gap-2 self-center pb-1.5">
        {showEdit && !isEditing ? (
          <AppButton variant="primary" onClick={() => setIsEditing(true)} disabled={isSaving}>
            Edit
          </AppButton>
        ) : null}

        {showEdit && isEditing ? (
          <>
            <AppButton variant="secondary" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </AppButton>
            <AppButton variant="primary" size="sm" onClick={submitHandler} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </AppButton>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PersonalProfileHeader;
