"use client";

import { AppButton, AppTabs } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import React from "react";

type TabItem = { id: string; label: string };

type Props = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  isEditing: boolean;
  setIsEditing: (val: boolean) => void;
  onSave?: () => void;
  showEdit?: boolean;
  ariaLabel?: string;
};

const CompanySettingsHeader = ({
  tabs,
  activeTab,
  onTabChange,
  isEditing,
  setIsEditing,
  onSave,
  showEdit = true,
  ariaLabel = "Company settings sections",
}: Props) => {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 isolate -mx-1 flex items-end justify-between gap-3 px-1 pb-3 pt-1",
        // Match page chrome exactly (opaque) so form content cannot show through while sticky.
        "bg-slate-50 dark:bg-slate-950",
      )}
    >
      <AppTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={onTabChange}
        ariaLabel={ariaLabel}
        className="relative z-10 min-w-0 flex-1"
      />
      {showEdit ? (
        <div className="relative z-10 flex shrink-0 items-center gap-2 self-center pb-1.5">
          {isEditing ? (
            <AppButton type="button" variant="primary" onClick={onSave}>
              Save
            </AppButton>
          ) : null}
          <AppButton
            type="button"
            variant={isEditing ? "ghost" : "primary"}
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? "Close" : "Edit"}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
};

export default CompanySettingsHeader;
