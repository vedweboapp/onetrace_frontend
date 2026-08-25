"use client";

import { CancelButton, EditButton, SaveButton } from "@/shared/ui/dashboard-action-buttons";
import { AppTabs } from "@/shared/ui";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { PersonalProfileHeaderTabKey } from "../types/types";

interface PersonalProfileHeaderProps {
  activeTab: string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  isSaving: boolean;
}

const PersonalProfileHeader = ({
  activeTab,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isSaving,
}: PersonalProfileHeaderProps) => {
  const [, setParam] = useUrlParams({ tab: "profile" });

  const tabs: PersonalProfileHeaderTabKey[] = [
    { id: "profile", label: "PERSONAL PROFILE" },
    { id: "appearance", label: "APPEARANCE" },
  ];

  const showEdit = activeTab === "profile" && !isEditing;
  const showActions = (activeTab === "profile" && isEditing) || activeTab === "appearance";

  return (
    <div className="sticky -top-5 z-30 flex items-center justify-between gap-3 bg-slate-50/95 px-0 pb-0 pt-5 backdrop-blur-sm sm:-top-6 sm:-mt-6 sm:pt-6 dark:bg-slate-950/95">
      <AppTabs
        tabs={tabs}
        value={activeTab}
        onValueChange={(value) => {
          if (value !== activeTab) {
            if (activeTab === "profile" && isEditing) onCancel();
            if (activeTab === "appearance") onCancel();
          }
          setParam("tab", value);
        }}
        ariaLabel="Personal profile sections"
        className="relative z-10 min-w-0 flex-1"
      />
      <div className="relative z-10 flex shrink-0 items-center gap-2 self-center pb-1.5">
        {showEdit ? <EditButton onClick={onEdit} /> : null}
        {showActions ? (
          <>
            <CancelButton disabled={isSaving} onClick={onCancel} />
            <SaveButton loading={isSaving} disabled={isSaving} onClick={onSave} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export default PersonalProfileHeader;
