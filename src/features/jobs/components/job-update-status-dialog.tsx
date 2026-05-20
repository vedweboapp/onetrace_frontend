"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import { AppButton, AppModal, CheckmarkSelect } from "@/shared/ui";

type Props = {
  open: boolean;
  currentStatusId: number | null;
  jobTitle: string;
  saving: boolean;
  onClose: () => void;
  onConfirm: (jobStatusId: number) => void;
};

export function JobUpdateStatusDialog({
  open,
  currentStatusId,
  jobTitle,
  saving,
  onClose,
  onConfirm,
}: Props) {
  const t = useTranslations("Dashboard.jobs");
  const [statuses, setStatuses] = React.useState<WorkflowColourStatus[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<string>("");

  React.useEffect(() => {
    if (!open) return;
    setSelected(currentStatusId != null ? String(currentStatusId) : "");
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { items } = await fetchJobStatusesPage(1, 500);
        if (!cancelled) setStatuses(items);
      } catch {
        if (!cancelled) setStatuses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, currentStatusId]);

  const options = React.useMemo(
    () => statuses.map((s) => ({ value: String(s.id), label: s.status_name })),
    [statuses],
  );

  const selectedRow = statuses.find((s) => String(s.id) === selected) ?? null;

  function handleConfirm() {
    const id = Number.parseInt(selected, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    onConfirm(id);
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("updateStatus.title")}
      size="md"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={saving}
            disabled={!selected || loading}
            onClick={handleConfirm}
          >
            {t("updateStatus.confirm")}
          </AppButton>
        </>
      }
    >
      <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
        {t("updateStatus.body", { title: jobTitle })}
      </p>
      <CheckmarkSelect
        id="job-status-select"
        label={t("fields.jobStatus")}
        options={options}
        value={selected}
        onChange={setSelected}
        emptyLabel={loading ? t("updateStatus.loading") : t("updateStatus.placeholder")}
        disabled={loading || saving}
        listLabel={t("fields.jobStatus")}
        portaled
      />
      {selectedRow ? (
        <div className="mt-3">
          <WorkflowColourStatusChip row={selectedRow} />
        </div>
      ) : null}
    </AppModal>
  );
}
