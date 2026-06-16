"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { JobChecklistItemTitle, jobChecklistItemLabel } from "@/features/jobs/components/job-checklist-item-title";
import type { JobChecklistItem } from "@/features/jobs/types/job.types";
import { requiredJobChecklistsComplete } from "@/features/jobs/utils/job-nested-fields.util";
import { AppButton, AppModal } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  open: boolean;
  formLabel: string;
  checklists: JobChecklistItem[];
  saving: boolean;
  onClose: () => void;
  onConfirm: (items: JobChecklistItem[]) => void;
};

export function JobFormChecklistGateModal({
  open,
  formLabel,
  checklists,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("Dashboard.jobs.checklists");
  const [items, setItems] = React.useState(checklists);

  React.useEffect(() => {
    if (open) setItems(checklists);
  }, [open, checklists]);

  const canContinue = requiredJobChecklistsComplete(items);

  function toggleItem(id: number) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_checked: !item.is_checked } : item)),
    );
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("gateTitle")}
      size="md"
      closeOnBackdrop={!saving}
      isBusy={saving}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("cancel")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!canContinue}
            onClick={() => onConfirm(items)}
          >
            {t("continueToForm")}
          </AppButton>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {t("gateBody", { form: formLabel })}
      </p>
      {!canContinue ? (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">{t("gateRequiredHint")}</p>
      ) : null}
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className={cn(
              "flex items-start gap-3 rounded-lg border px-3 py-2.5",
              "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40",
            )}
          >
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border-slate-300"
              checked={item.is_checked}
              disabled={saving}
              onChange={() => toggleItem(item.id)}
              aria-label={jobChecklistItemLabel(item)}
            />
            <div className="min-w-0 flex-1">
              <JobChecklistItemTitle item={item} />
            </div>
          </li>
        ))}
      </ul>
    </AppModal>
  );
}
