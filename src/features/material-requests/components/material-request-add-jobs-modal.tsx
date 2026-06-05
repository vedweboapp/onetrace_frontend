"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJobsPage } from "@/features/jobs/api/job.api";
import { cn } from "@/core/utils/http.util";
import { AppButton, AppModal, surfaceInputClassName } from "@/shared/ui";

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
  const [query, setQuery] = React.useState("");
  const [jobOptions, setJobOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setPickerIds(initialSelectedIds);
    setQuery("");
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
        const { items } = await fetchJobsPage(1, 500, { is_active: true, assigned_worker: workerId }, { silent: true });
        if (cancelled) return;
        setJobOptions(
          items.map((job) => ({
            value: String(job.id),
            label: job.title?.trim() || `#${job.id}`,
          })),
        );
      } catch {
        if (!cancelled) {
          setLoadError(t("jobs.loadError"));
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

  const selectedSet = React.useMemo(() => new Set(pickerIds), [pickerIds]);

  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobOptions;
    return jobOptions.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [jobOptions, query]);

  function toggleJob(value: string) {
    setPickerIds((prev) => (prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]));
  }

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
        <div className="space-y-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("jobs.pickerPlaceholder")}
            aria-label={t("jobs.pickerLabel")}
            className={cn(surfaceInputClassName, "h-10 rounded-lg text-sm")}
          />
          <ul
            role="listbox"
            aria-label={t("jobs.pickerLabel")}
            aria-multiselectable="true"
            className="max-h-80 divide-y divide-slate-100 overflow-auto rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-700"
          >
            {filteredOptions.map((opt) => {
              const checked = selectedSet.has(opt.value);
              return (
                <li key={opt.value}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 px-3 py-2.5 text-sm transition",
                      checked
                        ? "bg-slate-50 font-medium text-slate-900 dark:bg-slate-800/60 dark:text-slate-100"
                        : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/40",
                    )}
                  >
                    <input
                      type="checkbox"
                      className="size-4 shrink-0 rounded border-slate-300 text-[color:var(--dash-accent,#111111)] focus:ring-[color:var(--dash-accent,#111111)]/25 dark:border-slate-600"
                      checked={checked}
                      onChange={() => toggleJob(opt.value)}
                    />
                    <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  </label>
                </li>
              );
            })}
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t("jobs.noSearchResults")}
              </li>
            ) : null}
          </ul>
        </div>
      )}
    </AppModal>
  );
}
