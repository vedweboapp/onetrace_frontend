"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Briefcase } from "lucide-react";
import type { Job } from "@/features/jobs/types/job.types";
import { getJobAssignedWorkerId } from "@/features/jobs/utils/job-nested-fields.util";
import { createSchedule } from "@/features/scheduling/api/schedule.mock.api";
import {
  jobSelectLabel,
  loadUnassignedJobsForClient,
  useSchedulingCatalog,
} from "@/features/scheduling/hooks/use-scheduling-catalog";
import type { ScheduleRecurrence } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  combineDateAndTimeEndToIso,
  combineDateAndTimeToIso,
  splitApiDateTime,
  toDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { cn } from "@/core/utils/http.util";

export type CreateScheduleTechnician = Pick<SchedulingTechnician, "id" | "name" | "title" | "initials">;

export type CreateSchedulePrefill = {
  clientId?: number;
  jobId?: number;
  workerId?: number;
  dateKey?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  technician: CreateScheduleTechnician | null;
  defaultDateKey: string;
  prefill?: CreateSchedulePrefill | null;
  onCreated?: (scheduleId: number) => void;
};

function isUnassignedJob(job: Job): boolean {
  const id = getJobAssignedWorkerId(job);
  return id == null || id <= 0;
}

export function CreateScheduleModal({
  open,
  onClose,
  technician,
  defaultDateKey,
  prefill,
  onCreated,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const { catalog, loading: catalogLoading } = useSchedulingCatalog(
    t("modal.technicianFallbackTitle"),
    t("allClients"),
  );

  const [jobOptions, setJobOptions] = React.useState<CheckmarkSelectOption[]>([]);
  const [jobsById, setJobsById] = React.useState<Record<number, Job>>({});
  const [loadingJobs, setLoadingJobs] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const [workerId, setWorkerId] = React.useState("");
  const [clientId, setClientId] = React.useState("");
  const [jobId, setJobId] = React.useState("");
  const [startDate, setStartDate] = React.useState(defaultDateKey);
  const [endDate, setEndDate] = React.useState(defaultDateKey);
  const [startTime, setStartTime] = React.useState("09:00");
  const [endTime, setEndTime] = React.useState("17:00");
  const [allDay, setAllDay] = React.useState(false);
  const [recurrence, setRecurrence] = React.useState<ScheduleRecurrence>("none");
  const [recurrenceEndDate, setRecurrenceEndDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const clientOptions = React.useMemo(() => {
    if (!catalog) return [];
    return catalog.clientOptions.filter((o) => o.value !== "");
  }, [catalog]);

  const workerOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    if (!catalog) return [];
    return catalog.technicians.map((w) => ({ value: String(w.id), label: w.name }));
  }, [catalog]);

  const recurrenceOptions = React.useMemo<CheckmarkSelectOption[]>(
    () => [
      { value: "none", label: t("fields.recurrenceNone") },
      { value: "daily", label: t("fields.recurrenceDaily") },
      { value: "weekly", label: t("fields.recurrenceWeekly") },
    ],
    [t],
  );

  const selectedWorker = React.useMemo(() => {
    if (technician) return technician;
    const id = Number(workerId);
    if (!Number.isFinite(id) || id <= 0 || !catalog) return null;
    const row = catalog.technicians.find((w) => w.id === id);
    if (!row) return null;
    return { id: row.id, name: row.name, title: row.title, initials: row.initials };
  }, [technician, workerId, catalog]);

  React.useEffect(() => {
    if (!open) return;
    const dateKey = prefill?.dateKey || defaultDateKey || toDateKey(new Date());
    setWorkerId(prefill?.workerId ? String(prefill.workerId) : technician ? String(technician.id) : "");
    setClientId(prefill?.clientId ? String(prefill.clientId) : "");
    setJobId(prefill?.jobId ? String(prefill.jobId) : "");
    setStartDate(dateKey);
    setEndDate(dateKey);
    setStartTime("09:00");
    setEndTime("17:00");
    setAllDay(false);
    setRecurrence("none");
    setRecurrenceEndDate("");
    setNotes("");
    setErrors({});
  }, [open, defaultDateKey, prefill, technician?.id]);

  React.useEffect(() => {
    if (!open || !clientId) {
      setJobOptions([]);
      setJobsById({});
      if (!prefill?.jobId) setJobId("");
      return;
    }
    const clientNum = Number(clientId);
    if (!Number.isFinite(clientNum) || clientNum <= 0) return;

    let cancelled = false;
    setLoadingJobs(true);
    if (!prefill?.jobId) setJobId("");
    (async () => {
      try {
        const items = await loadUnassignedJobsForClient(clientNum);
        if (cancelled) return;
        const allowPrefill = prefill?.jobId ? items.find((j) => j.id === prefill.jobId) : null;
        const candidates = allowPrefill
          ? [...items.filter(isUnassignedJob), allowPrefill].filter(
              (j, i, arr) => arr.findIndex((x) => x.id === j.id) === i,
            )
          : items.filter(isUnassignedJob);
        const byId: Record<number, Job> = {};
        for (const job of candidates) byId[job.id] = job;
        setJobsById(byId);
        setJobOptions(candidates.map((job) => ({ value: String(job.id), label: jobSelectLabel(job) })));
        if (prefill?.jobId && byId[prefill.jobId]) {
          setJobId(String(prefill.jobId));
          applyJobDefaults(String(prefill.jobId), byId);
        }
      } catch {
        if (!cancelled) {
          setJobOptions([]);
          setJobsById({});
        }
      } finally {
        if (!cancelled) setLoadingJobs(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill job applied once per open
  }, [open, clientId, prefill?.jobId]);

  function applyJobDefaults(nextJobId: string, map: Record<number, Job> = jobsById) {
    setJobId(nextJobId);
    const job = map[Number(nextJobId)];
    if (!job) return;
    const start = splitApiDateTime(job.start_date);
    const end = splitApiDateTime(job.end_date || job.start_date);
    if (start.date) setStartDate(start.date);
    if (end.date) setEndDate(end.date);
    if (start.time) setStartTime(start.time);
    if (end.time) setEndTime(end.time);
    if (!notes.trim() && job.description?.trim()) setNotes(job.description.trim());
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!selectedWorker) next.worker = t("validation.worker");
    if (!clientId) next.client = t("validation.client");
    if (!jobId) next.job = t("validation.job");
    if (!startDate.trim()) next.startDate = t("validation.startDate");
    if (!endDate.trim()) next.endDate = t("validation.endDate");
    if (!allDay) {
      if (!startTime.trim()) next.startTime = t("validation.startTime");
      if (!endTime.trim()) next.endTime = t("validation.endTime");
    }
    if (recurrence !== "none" && !recurrenceEndDate.trim()) {
      next.recurrenceEnd = t("validation.recurrenceEnd");
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSave() {
    if (!validate() || !selectedWorker) return;
    const jobNum = Number(jobId);
    const clientNum = Number(clientId);
    if (!Number.isFinite(jobNum) || jobNum <= 0 || !Number.isFinite(clientNum)) return;

    const job = jobsById[jobNum];
    const clientLabel = clientOptions.find((o) => o.value === clientId)?.label ?? "";

    setSaving(true);
    try {
      const startIso = combineDateAndTimeToIso(startDate, startTime, allDay);
      const endIso = combineDateAndTimeEndToIso(endDate, endTime, allDay);
      const recurrenceEndIso =
        recurrence !== "none" && recurrenceEndDate.trim()
          ? combineDateAndTimeEndToIso(recurrenceEndDate, endTime, true)
          : null;

      const row = await createSchedule({
        job_id: jobNum,
        worker_id: selectedWorker.id,
        client_id: clientNum,
        client_name: clientLabel,
        job_title: job?.title?.trim() || `Job #${jobNum}`,
        job_serial: job?.job_serial_number?.trim() || null,
        worker_name: selectedWorker.name,
        worker_title: selectedWorker.title?.trim() || t("modal.technicianFallbackTitle"),
        start_at: startIso,
        end_at: endIso,
        notes: notes.trim() || null,
        recurrence,
        recurrence_end_at: recurrenceEndIso,
        all_day: allDay,
      });
      toastSuccess(t("modal.successToast"));
      onCreated?.(row.id);
      onClose();
    } catch (error) {
      toastApiError(error, t("modal.errorToast"));
    } finally {
      setSaving(false);
    }
  }

  const techTitle = selectedWorker?.title?.trim() || t("modal.technicianFallbackTitle");

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={t("modal.title")}
      size="lg"
      isBusy={saving}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="secondary" disabled={saving} onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="button"
            loading={saving}
            disabled={saving || catalogLoading}
            onClick={() => void handleSave()}
          >
            {saving ? t("modal.saving") : t("modal.save")}
          </AppButton>
        </div>
      }
    >
      {selectedWorker ? (
        <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4 dark:border-slate-700">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-sm font-semibold uppercase text-white"
            aria-hidden
          >
            {selectedWorker.initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {selectedWorker.name}
            </p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {t("modal.currentTitle", { title: techTitle })}
            </p>
          </div>
        </div>
      ) : (
        <FieldGroup label={t("fields.worker")} htmlFor="schedule-worker" required className="mb-4">
          <CheckmarkSelect
            id="schedule-worker"
            listLabel={t("fields.worker")}
            options={workerOptions}
            value={workerId}
            disabled={saving || catalogLoading}
            searchable
            portaled
            emptyLabel={t("placeholders.worker")}
            invalid={Boolean(errors.worker)}
            onChange={(v) => {
              setWorkerId(v);
              setErrors((prev) => {
                const { worker: _, ...rest } = prev;
                return rest;
              });
            }}
          />
          <FieldErrorText>{errors.worker}</FieldErrorText>
        </FieldGroup>
      )}

      <div className="space-y-4">
        <FieldGroup label={t("fields.client")} htmlFor="schedule-client" required>
          <div className="relative">
            <CheckmarkSelect
              id="schedule-client"
              listLabel={t("fields.client")}
              options={clientOptions}
              value={clientId}
              disabled={saving || catalogLoading || Boolean(prefill?.clientId)}
              searchable
              portaled
              emptyLabel={t("placeholders.client")}
              invalid={Boolean(errors.client)}
              onChange={(v) => {
                setClientId(v);
                setErrors((prev) => {
                  const { client: _, ...rest } = prev;
                  return rest;
                });
              }}
            />
            <Building2
              className="pointer-events-none absolute right-9 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
          </div>
          <FieldErrorText>{errors.client}</FieldErrorText>
        </FieldGroup>

        <FieldGroup label={t("fields.job")} htmlFor="schedule-job" required>
          <div className="relative">
            <CheckmarkSelect
              id="schedule-job"
              listLabel={t("fields.job")}
              options={jobOptions}
              value={jobId}
              disabled={saving || !clientId || loadingJobs || Boolean(prefill?.jobId)}
              searchable
              portaled
              emptyLabel={
                loadingJobs
                  ? t("modal.loadingJobs")
                  : clientId && jobOptions.length === 0
                    ? t("modal.noUnassignedJobs")
                    : t("placeholders.job")
              }
              invalid={Boolean(errors.job)}
              onChange={(v) => {
                applyJobDefaults(v);
                setErrors((prev) => {
                  const { job: _, ...rest } = prev;
                  return rest;
                });
              }}
            />
            <Briefcase
              className="pointer-events-none absolute right-9 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
          </div>
          <FieldErrorText>{errors.job}</FieldErrorText>
        </FieldGroup>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("fields.date")} <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              disabled={saving}
              aria-label={t("fields.startDate")}
              className={cn(surfaceInputClassName, "min-w-[9.5rem] flex-1")}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-slate-500">{t("fields.to")}</span>
            <input
              type="date"
              value={endDate}
              disabled={saving}
              aria-label={t("fields.endDate")}
              className={cn(surfaceInputClassName, "min-w-[9.5rem] flex-1")}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <label className="ml-1 inline-flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
              <input
                type="checkbox"
                checked={allDay}
                disabled={saving}
                className="size-4 rounded border-slate-300"
                onChange={(e) => setAllDay(e.target.checked)}
              />
              {t("fields.allDay")}
            </label>
          </div>
          <FieldErrorText>{errors.startDate || errors.endDate}</FieldErrorText>
        </div>

        {!allDay ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("fields.time")} <span className="text-red-500">*</span>
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                value={startTime}
                disabled={saving}
                aria-label={t("fields.startTime")}
                className={cn(surfaceInputClassName, "min-w-[8rem] flex-1")}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span className="text-sm text-slate-500">{t("fields.to")}</span>
              <input
                type="time"
                value={endTime}
                disabled={saving}
                aria-label={t("fields.endTime")}
                className={cn(surfaceInputClassName, "min-w-[8rem] flex-1")}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <FieldErrorText>{errors.startTime || errors.endTime}</FieldErrorText>
          </div>
        ) : null}

        <FieldGroup label={t("fields.recurrence")} htmlFor="schedule-recurrence">
          <CheckmarkSelect
            id="schedule-recurrence"
            listLabel={t("fields.recurrence")}
            options={recurrenceOptions}
            value={recurrence}
            disabled={saving}
            portaled
            onChange={(v) => setRecurrence(v as ScheduleRecurrence)}
          />
        </FieldGroup>

        {recurrence !== "none" ? (
          <FieldGroup label={t("fields.recurrenceEnd")} htmlFor="schedule-recurrence-end" required>
            <input
              id="schedule-recurrence-end"
              type="date"
              value={recurrenceEndDate}
              disabled={saving}
              className={cn(surfaceInputClassName, "w-full")}
              onChange={(e) => setRecurrenceEndDate(e.target.value)}
            />
            <FieldErrorText>{errors.recurrenceEnd}</FieldErrorText>
          </FieldGroup>
        ) : null}

        <FieldGroup label={t("fields.notes")} htmlFor="schedule-notes">
          <textarea
            id="schedule-notes"
            value={notes}
            disabled={saving}
            rows={4}
            placeholder={t("placeholders.notes")}
            className={cn(surfaceTextareaClassName, "min-h-[6rem]")}
            onChange={(e) => setNotes(e.target.value)}
          />
        </FieldGroup>
      </div>
    </AppModal>
  );
}
