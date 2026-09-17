"use client";

import { cn } from "@/core/utils/http.util";
import { AppButton, AppTabs } from "@/shared/ui";
import React from "react";

type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  showEdit?: boolean;
  submitHandler: () => void;
  cancelHandler?: () => void;
  isSaving: boolean;
  ariaLabel?: string;
};

const PersonalProfileHeader = ({
  tabs,
  activeTab,
  onTabChange,
  isEditing,
  setIsEditing,
  showEdit = true,
  submitHandler,
  cancelHandler,
  isSaving,
  ariaLabel = "Personal profile sections",
}: Props) => {
  function handleCancel() {
    try {
      cancelHandler?.();
    } finally {
      setIsEditing(false);
    }
  }

  function handleTabChange(value: string) {
    if (value === activeTab) return;
    // Always switch first; cancel edit as a side effect so a cancel error cannot block tabs.
    onTabChange(value);
    if (isEditing) {
      try {
        cancelHandler?.();
      } finally {
        setIsEditing(false);
      }
    }
  }

  return (
    <div
      className={cn(
        "relative z-10 -mx-1 flex shrink-0 items-center justify-between gap-3 px-1 pb-3 pt-1",
        // Opaque chrome so scrolling body content never peeks above the tabs.
        "bg-slate-50 dark:bg-slate-950",
      )}
    >
      <AppTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={handleTabChange}
        ariaLabel={ariaLabel}
        className="relative z-10 min-w-0 flex-1"
      />
      <div className="relative z-10 flex shrink-0 items-center gap-2 self-center pb-1.5">
        {showEdit && !isEditing ? (
          <AppButton type="button" variant="primary" onClick={() => setIsEditing(true)} disabled={isSaving}>
            Edit
          </AppButton>
        ) : null}

        {showEdit && isEditing ? (
          <>
            <AppButton type="button" variant="secondary" onClick={handleCancel} disabled={isSaving}>
              Cancel
            </AppButton>
            <AppButton type="button" variant="primary" size="sm" onClick={submitHandler} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save"}
            </AppButton>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PersonalProfileHeader;
