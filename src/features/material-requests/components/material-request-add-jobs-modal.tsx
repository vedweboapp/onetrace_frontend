"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import { AppButton, AppModal, MultiCheckSelect } from "@/shared/ui";

type Props = {
  open: boolean;
  workerId: number | null;
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (jobIds: number[]) => void;
};

export function MaterialRequestAddJobsModal({
  open,
  workerId,
  initialSelectedIds,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const [pickerIds, setPickerIds] = React.useState<string[]>([]);
  const [jobOptions, setJobOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPickerIds(initialSelectedIds);
  }, [open, initialSelectedIds]);

  React.useEffect(() => {
    if (!open || workerId == null) {
      setJobOptions([]);
      setLoadError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items } = await fetchJobsPage(
          1,
          500,
          { is_active: true, assigned_worker: workerId },
          { silent: true },
        );
        if (cancelled) return;
        setJobOptions(
          items.map((job) => ({
            value: String(job.id),
            label: job.title?.trim() || `#${job.id}`,
          })),
        );
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("jobs.loadError")));
          setJobOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, workerId, t]);

  function handleSubmit() {
    const ids = pickerIds
      .map((raw) => Number.parseInt(raw, 10))
      .filter((id) => Number.isFinite(id) && id > 0);
    onConfirm(ids);
    onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("jobs.addModalTitle")}
      size="lg"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t("jobs.selectedCount", { count: pickerIds.length })}
          </span>
          <div className="flex justify-end gap-2">
            <AppButton type="button" variant="secondary" size="sm" onClick={onClose}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              disabled={loading || workerId == null || pickerIds.length === 0}
              onClick={handleSubmit}
            >
              {t("jobs.addModalSubmit")}
            </AppButton>
          </div>
        </div>
      }
    >
      {workerId == null ? (
        <p className="text-sm text-slate-600 dark:text-slate-400">{t("jobs.selectWorkerFirst")}</p>
      ) : loading ? (
        <p className="text-sm text-slate-500">{t("jobs.loading")}</p>
      ) : loadError ? (
        <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
      ) : jobOptions.length === 0 ? (
        <p className="text-sm text-slate-500">{t("jobs.noJobsForWorker")}</p>
      ) : (
        <MultiCheckSelect
          id="mr-jobs-modal-picker"
          options={jobOptions}
          values={pickerIds}
          onChange={setPickerIds}
          placeholder={t("jobs.pickerPlaceholder")}
          listLabel={t("jobs.pickerLabel")}
          searchPlaceholder={t("jobs.pickerPlaceholder")}
          portaled
          searchable
        />
      )}
    </AppModal>
  );
}
