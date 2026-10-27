"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  duplicateEntryFieldLabel,
  formatDuplicateEntryValue,
  type DuplicateEntryConflict,
} from "@/shared/form/duplicate-entry.util";
import { AppButton, AppModal } from "@/shared/ui";

type Props = {
  open: boolean;
  conflict: DuplicateEntryConflict | null;
  updating?: boolean;
  onKeepExisting: () => void;
  onUpdateExisting: () => void;
};

const HIDDEN_KEYS = new Set(["id", "uuid", "organization", "is_deleted", "deleted_at", "deleted_by"]);

export function DuplicateEntryConflictModal({
  open,
  conflict,
  updating = false,
  onKeepExisting,
  onUpdateExisting,
}: Props) {
  const t = useTranslations("Dashboard.common.duplicateEntry");

  const rows = React.useMemo(() => {
    if (!conflict) return [] as Array<{ key: string; label: string; value: string }>;
    const out: Array<{ key: string; label: string; value: string }> = [
      { key: "id", label: t("fields.id"), value: String(conflict.existingId) },
    ];
    for (const [key, value] of Object.entries(conflict.data)) {
      if (HIDDEN_KEYS.has(key)) continue;
      out.push({
        key,
        label: duplicateEntryFieldLabel(key),
        value: formatDuplicateEntryValue(value),
      });
    }
    return out;
  }, [conflict, t]);

  return (
    <AppModal
      open={open}
      onClose={() => (!updating ? onKeepExisting() : undefined)}
      title={t("title")}
      titleId="duplicate-entry-conflict-title"
      description={t("description")}
      closeOnBackdrop={!updating}
      isBusy={updating}
      size="md"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={updating} onClick={onKeepExisting}>
            {t("keepExisting")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={updating} onClick={onUpdateExisting}>
            {t("updateExisting")}
          </AppButton>
        </>
      }
    >
      <div className="space-y-3">
        {conflict?.message ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {conflict.message}
          </p>
        ) : null}
        <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700">
          {rows.map((row) => (
            <div key={row.key} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 px-3 py-2.5 sm:grid-cols-[10rem_minmax(0,1fr)]">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {row.label}
              </dt>
              <dd className="min-w-0 break-words text-sm font-medium text-slate-900 dark:text-slate-100">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </AppModal>
  );
}
