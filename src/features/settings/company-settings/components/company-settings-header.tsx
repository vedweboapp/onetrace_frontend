"use client";

import { AppButton, AppTabs } from "@/shared/ui";
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
    <div className="flex items-end justify-between gap-3">
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
