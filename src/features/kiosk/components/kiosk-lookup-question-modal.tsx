"use client";

import React, { useEffect, useState } from "react";
import { X, List } from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { fetchGroupsPage } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
import type { KioskQuestion, LookupOptionType } from "../types/kiosk.types";
import { deriveApiNameFromLabel } from "../utils/kiosk-api-name";

interface KioskLookupQuestionModalProps {
  question?: KioskQuestion;
  onSave: (question: KioskQuestion) => void;
  onClose: () => void;
}

export const KioskLookupQuestionModal: React.FC<KioskLookupQuestionModalProps> = ({
  question,
  onSave,
  onClose,
}) => {
  const [label, setLabel] = useState(question?.label || "Items");
  const [groupId, setGroupId] = useState(String(question?.item_group_id || ""));
  const [presentation, setPresentation] = useState<LookupOptionType>(
    question?.lookup_option_type || "radio",
  );
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchGroupsPage(1, 100)
      .then(({ items: groupItems }) => {
        if (!cancelled) setGroups(groupItems);
      })
      .catch(() => {
        if (!cancelled) setError("Unable to load item groups.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleGroupChange = (selectedGroupId: string) => {
    setGroupId(selectedGroupId);
    setError(null);
  };

  const handleSave = () => {
    if (!groupId || !label.trim()) {
      setError("A question label and item group are required.");
      return;
    }

    onSave({
      ...(question || {
        q_id: `q_${Date.now()}`,
        id: null,
      }),
      label: label.trim(),
      subLabel: question?.subLabel,
      api_name: deriveApiNameFromLabel(label.trim(), "items"),
      is_lookup: true,
      item_group_id: groupId,
      lookup_option_type: presentation,
      options: [],
      groups: undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="w-full max-w-lg rounded-md border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <List className="size-4 text-blue-600" />
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Configure Items Lookup
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                This creates a question whose options come from one item group.
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Question label
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              className="mt-1.5 w-full rounded-sm border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>

          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Item group
            <select
              value={groupId}
              onChange={(event) => handleGroupChange(event.target.value)}
              className="mt-1.5 w-full rounded-sm border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">Select an item group</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name} (#{group.id})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
            Option presentation
            <select
              value={presentation}
              onChange={(event) => setPresentation(event.target.value as LookupOptionType)}
              className="mt-1.5 w-full rounded-sm border border-slate-200 px-3 py-2 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="radio">Radio buttons</option>
              <option value="checkbox">Checkbox buttons</option>
              <option value="image_radio">Image buttons</option>
            </select>
          </label>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <AppButton variant="secondary" size="sm" onClick={onClose}>Cancel</AppButton>
          <AppButton variant="primary" size="sm" onClick={handleSave}>Save Lookup Question</AppButton>
        </div>
      </div>
    </div>
  );
};
