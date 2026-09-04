"use client";

import { useTranslations } from "next-intl";
import { AppButton, AppModal } from "@/shared/ui";

export type ScheduleBulkSkipRow = {
  workerId: number;
  workerName: string;
  reason: string;
};

type Props = {
  open: boolean;
  scheduledCount: number;
  skipped: ScheduleBulkSkipRow[];
  onClose: () => void;
};

export function ScheduleBulkResultModal({ open, scheduledCount, skipped, onClose }: Props) {
  const t = useTranslations("Dashboard.scheduling.bulk");

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("resultTitle")}
      size="md"
      footer={
        <AppButton type="button" size="sm" onClick={onClose}>
          {t("close")}
        </AppButton>
      }
    >
      <div className="space-y-4">
        {scheduledCount > 0 ? (
          <p className="text-sm text-emerald-700 dark:text-emerald-300">
            {t("scheduledCount", { count: scheduledCount })}
          </p>
        ) : (
          <p className="text-sm text-slate-600 dark:text-slate-300">{t("noneScheduled")}</p>
        )}

        {skipped.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t("notScheduledHeading")}
            </p>
            <ul className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/60">
              {skipped.map((row) => (
                <li
                  key={`${row.workerId}-${row.reason}`}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950"
                >
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
                    {row.workerName || t("unknownWorker", { id: row.workerId })}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.reason}</p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
