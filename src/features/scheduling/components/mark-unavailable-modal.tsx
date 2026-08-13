"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createWorkerTimeOff } from "@/features/scheduling/api/schedule.api";
import type { CreateScheduleTechnician } from "@/features/scheduling/components/create-schedule-modal";
import {
  combineDateAndTimeEndToIso,
  combineDateAndTimeToIso,
} from "@/features/scheduling/utils/scheduling-week.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldErrorText, FieldGroup, surfaceInputClassName } from "@/shared/ui";

export type TimeOffPrefill = {
  dateKey: string;
  startTime: string;
  endTime: string;
};

type Props = {
  open: boolean;
  technician: CreateScheduleTechnician | null;
  prefill: TimeOffPrefill | null;
  onClose: () => void;
  onSaved?: () => void;
};

export function MarkUnavailableModal({ open, technician, prefill, onClose, onSaved }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("10:00");
  const [reason, setReason] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    const dateKey = prefill?.dateKey || "";
    setStartDate(dateKey);
    setEndDate(dateKey);
    setStartTime(prefill?.startTime || "09:00");
    setEndTime(prefill?.endTime || "10:00");
    setReason("");
    setErrors({});
  }, [open, prefill]);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!technician) next.worker = t("validation.worker");
    if (!startDate.trim()) next.startDate = t("validation.startDate");
    if (!endDate.trim()) next.endDate = t("validation.endDate");
    if (!startTime.trim()) next.startTime = t("validation.startTime");
    if (!endTime.trim()) next.endTime = t("validation.endTime");
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate() || !technician) return;
    setSaving(true);
    try {
      await createWorkerTimeOff({
        worker_id: technician.id,
        worker_name: technician.name,
        start_at: combineDateAndTimeToIso(startDate, startTime, false),
        end_at: combineDateAndTimeEndToIso(endDate, endTime, false),
        reason: reason.trim(),
      });
      toastSuccess(t("timeOff.successToast"));
      onSaved?.();
      onClose();
    } catch (error) {
      toastApiError(error, t("timeOff.errorToast"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("timeOff.title")}
      description={t("timeOff.subtitle")}
      size="md"
      isBusy={saving}
      footer={
        <>
          <AppButton type="button" variant="secondary" disabled={saving} onClick={onClose}>
            {t("timeOff.cancel")}
          </AppButton>
          <AppButton type="button" disabled={saving || !technician} onClick={() => void handleSave()}>
            {saving ? t("timeOff.saving") : t("timeOff.save")}
          </AppButton>
        </>
      }
    >
      {technician ? (
        <p className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">{technician.name}</p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <FieldGroup label={t("fields.startDate")} htmlFor="timeoff-start-date" required>
          <input
            id="timeoff-start-date"
            type="date"
            value={startDate}
            disabled={saving}
            className={surfaceInputClassName}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <FieldErrorText>{errors.startDate}</FieldErrorText>
        </FieldGroup>
        <FieldGroup label={t("fields.endDate")} htmlFor="timeoff-end-date" required>
          <input
            id="timeoff-end-date"
            type="date"
            value={endDate}
            disabled={saving}
            className={surfaceInputClassName}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <FieldErrorText>{errors.endDate}</FieldErrorText>
        </FieldGroup>
        <FieldGroup label={t("fields.startTime")} htmlFor="timeoff-start-time" required>
          <input
            id="timeoff-start-time"
            type="time"
            value={startTime}
            disabled={saving}
            className={surfaceInputClassName}
            onChange={(e) => setStartTime(e.target.value)}
          />
          <FieldErrorText>{errors.startTime}</FieldErrorText>
        </FieldGroup>
        <FieldGroup label={t("fields.endTime")} htmlFor="timeoff-end-time" required>
          <input
            id="timeoff-end-time"
            type="time"
            value={endTime}
            disabled={saving}
            className={surfaceInputClassName}
            onChange={(e) => setEndTime(e.target.value)}
          />
          <FieldErrorText>{errors.endTime}</FieldErrorText>
        </FieldGroup>
      </div>

      <FieldGroup label={t("timeOff.reason")} htmlFor="timeoff-reason" className="mt-4">
        <textarea
          id="timeoff-reason"
          value={reason}
          disabled={saving}
          rows={3}
          placeholder={t("timeOff.reasonPlaceholder")}
          className={surfaceInputClassName}
          onChange={(e) => setReason(e.target.value)}
        />
      </FieldGroup>
    </AppModal>
  );
}
