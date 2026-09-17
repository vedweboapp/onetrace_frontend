"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  submitJobQualityAssurance,
  type JobQualityAssurancePayload,
} from "@/features/jobs/api/job.api";
import { QualityAssuranceStatusBadge } from "@/features/jobs/components/quality-assurance-status";
import {
  isQualityAssuranceDecided,
  type QualityAssuranceRecord,
} from "@/features/jobs/types/quality-assurance.types";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, surfaceTextareaClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobId: number;
  /** When set, QA applies to these pins (project/pin detail or bulk selection). Omit for whole service job. */
  pinIds?: number[];
  /** Existing QA from API — when decided (approved/rejected), controls are hidden. */
  existing?: QualityAssuranceRecord | null;
  className?: string;
  onSuccess?: () => void;
};

export function JobQualityAssuranceControls({
  jobId,
  pinIds,
  existing,
  className,
  onSuccess,
}: Props) {
  const t = useTranslations("Dashboard.jobs.qualityAssurance");
  const [saving, setSaving] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [remarks, setRemarks] = React.useState("");
  const [remarksError, setRemarksError] = React.useState<string | null>(null);

  const alreadySet = isQualityAssuranceDecided(existing);

  async function submit(payload: JobQualityAssurancePayload) {
    setSaving(true);
    try {
      await submitJobQualityAssurance(jobId, payload);
      toastSuccess(
        payload.status === "approved" ? t("approvedToast") : t("rejectedToast"),
      );
      setRejectOpen(false);
      setRemarks("");
      setRemarksError(null);
      onSuccess?.();
    } catch (error) {
      toastApiError(error, t("error"));
    } finally {
      setSaving(false);
    }
  }

  function handleApprove() {
    const payload: JobQualityAssurancePayload =
      pinIds != null && pinIds.length > 0
        ? { status: "approved", pin_ids: pinIds }
        : { status: "approved" };
    void submit(payload);
  }

  function handleRejectConfirm() {
    const trimmed = remarks.trim();
    if (!trimmed) {
      setRemarksError(t("remarksRequired"));
      return;
    }
    const payload: JobQualityAssurancePayload =
      pinIds != null && pinIds.length > 0
        ? { status: "rejected", remarks: trimmed, pin_ids: pinIds }
        : { status: "rejected", remarks: trimmed };
    void submit(payload);
  }

  const rejectModal = (
    <AppModal
      open={rejectOpen}
      onClose={() => {
        if (!saving) setRejectOpen(false);
      }}
      title={t("rejectTitle")}
      size="sm"
      closeOnBackdrop={!saving}
      isBusy={saving}
      footer={
        <>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={saving}
            onClick={() => setRejectOpen(false)}
          >
            {t("cancel")}
          </AppButton>
          <AppButton
            type="button"
            variant="danger"
            size="sm"
            loading={saving}
            onClick={handleRejectConfirm}
          >
            {t("rejectConfirm")}
          </AppButton>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-600 dark:text-slate-400">{t("rejectBody")}</p>
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("remarks")}
        </span>
        <textarea
          value={remarks}
          onChange={(e) => {
            setRemarks(e.target.value);
            if (remarksError) setRemarksError(null);
          }}
          rows={4}
          className={cn(surfaceTextareaClassName, "w-full")}
          placeholder={t("remarksPlaceholder")}
          disabled={saving}
        />
      </label>
      {remarksError ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{remarksError}</p>
      ) : null}
    </AppModal>
  );

  if (alreadySet) {
    return (
      <div className={cn("flex flex-wrap items-center gap-2", className)}>
        <QualityAssuranceStatusBadge record={existing} />
      </div>
    );
  }

  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
        <AppButton
          type="button"
          variant="primary"
          size="sm"
          loading={saving && !rejectOpen}
          disabled={saving}
          onClick={handleApprove}
        >
          {t("approve")}
        </AppButton>
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          disabled={saving}
          onClick={() => {
            setRemarks("");
            setRemarksError(null);
            setRejectOpen(true);
          }}
        >
          {t("reject")}
        </AppButton>
      </div>
      {rejectModal}
    </>
  );
}
