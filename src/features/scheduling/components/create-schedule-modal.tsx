"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, Briefcase } from "lucide-react";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import {
  getJobAssignedWorkerId,
  getJobProjectId,
  parseJobDurationMinutes,
} from "@/features/jobs/utils/job-nested-fields.util";
import { createSchedule, updateSchedule } from "@/features/scheduling/api/schedule.api";
import {
  jobSelectLabel,
  loadUnassignedJobsForClient,
  useSchedulingCatalog,
} from "@/features/scheduling/hooks/use-scheduling-catalog";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
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
  SurfaceDateInput,
  surfaceInputClassName,
} from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { cn } from "@/core/utils/http.util";

export type CreateScheduleTechnician = Pick<SchedulingTechnician, "id" | "name" | "title" | "initials">;

export type CreateSchedulePrefill = {
  clientId?: number;
  jobId?: number;
  workerId?: number;
  dateKey?: string;
  startTime?: string;
  endTime?: string;
  /** Lock client + job (job detail scheduling tab). */
  lockJob?: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  technician: CreateScheduleTechnician | null;
  defaultDateKey: string;
  prefill?: CreateSchedulePrefill | null;
  existingSchedule?: Schedule | null;
  getBookingConflict?: (input: {
    workerId: number;
    startAt: string;
    endAt: string;
    ignoreScheduleId?: number;
  }) => string | null;
  onCreated?: (scheduleId: number) => void;
};

function isUnassignedJob(job: Job): boolean {
  const id = getJobAssignedWorkerId(job);
  return id == null || id <= 0;
}

function addMinutesToDateTime(dateKey: string, timeValue: string, minutesToAdd: number): { date: string; time: string } | null {
  if (!dateKey || !timeValue || !Number.isFinite(minutesToAdd)) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }
  const next = new Date(year, month - 1, day, hours, minutes + minutesToAdd, 0, 0);
  const nextDate = [
    String(next.getFullYear()).padStart(4, "0"),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
  const nextTime = `${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
  return { date: nextDate, time: nextTime };
}

export function CreateScheduleModal({
  open,
  onClose,
  technician,
  defaultDateKey,
  prefill,
  existingSchedule,
  getBookingConflict,
  onCreated,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const isReschedule = Boolean(existingSchedule);
  const { catalog, loading: catalogLoading } = useSchedulingCatalog(t("modal.technicianFallbackTitle"), {
    includeFilters: open,
  });

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
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const lockClientJob = Boolean(prefill?.lockJob || (prefill?.clientId && prefill?.jobId)) || isReschedule;
  const includeJobId = existingSchedule?.job_id ?? prefill?.jobId;

  const clientOptions = React.useMemo(() => {
    if (!catalog) return [];
    return catalog.clients.map((c) => ({ value: String(c.id), label: c.name }));
  }, [catalog]);

  const workerOptions = React.useMemo<CheckmarkSelectOption[]>(() => {
    if (!catalog) return [];
    return catalog.technicians.map((w) => ({ value: String(w.id), label: w.name }));
  }, [catalog]);

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
    if (existingSchedule) {
      const start = splitApiDateTime(existingSchedule.start_at);
      const end = splitApiDateTime(existingSchedule.end_at);
      setWorkerId(String(existingSchedule.worker_id));
      setClientId(String(existingSchedule.client_id));
      setJobId(String(existingSchedule.job_id));
      setStartDate(start.date || defaultDateKey);
      setEndDate(end.date || start.date || defaultDateKey);
      setStartTime(start.time || "09:00");
      setEndTime(end.time || "17:00");
      setAllDay(Boolean(existingSchedule.all_day));
      setErrors({});
      return;
    }
    const dateKey = prefill?.dateKey || defaultDateKey || toDateKey(new Date());
    setWorkerId(prefill?.workerId ? String(prefill.workerId) : technician ? String(technician.id) : "");
    setClientId(prefill?.clientId ? String(prefill.clientId) : "");
    setJobId(prefill?.jobId ? String(prefill.jobId) : "");
    setStartDate(dateKey);
    setEndDate(dateKey);
    setStartTime(prefill?.startTime || "09:00");
    setEndTime(prefill?.endTime || "17:00");
    setAllDay(false);
    setErrors({});
  }, [open, defaultDateKey, prefill, technician?.id, existingSchedule]);

  React.useEffect(() => {
    if (!open || !clientId) {
      setJobOptions([]);
      setJobsById({});
      if (!includeJobId) setJobId("");
      return;
    }
    const clientNum = Number(clientId);
    if (!Number.isFinite(clientNum) || clientNum <= 0) return;

    let cancelled = false;
    setLoadingJobs(true);
    if (!includeJobId) setJobId("");
    (async () => {
      try {
        const items = await loadUnassignedJobsForClient(clientNum);
        if (cancelled) return;
        let extra = includeJobId ? items.find((j) => j.id === includeJobId) : undefined;
        if (includeJobId && !extra) {
          try {
            extra = await fetchJob(includeJobId, { silent: true });
          } catch {
            extra = undefined;
          }
        }
        const candidates = extra
          ? [...items.filter(isUnassignedJob), extra].filter(
              (j, i, arr) => arr.findIndex((x) => x.id === j.id) === i,
            )
          : items.filter(isUnassignedJob);
        const byId: Record<number, Job> = {};
        for (const job of candidates) byId[job.id] = job;
        setJobsById(byId);
        setJobOptions(candidates.map((job) => ({ value: String(job.id), label: jobSelectLabel(job) })));
        if (includeJobId && byId[includeJobId]) {
          setJobId(String(includeJobId));
          if (!existingSchedule) applyJobDefaults(String(includeJobId), byId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- include job applied once per open
  }, [open, clientId, includeJobId, existingSchedule?.id]);

  function applyJobDefaults(nextJobId: string, map: Record<number, Job> = jobsById) {
    setJobId(nextJobId);
    const job = map[Number(nextJobId)];
    if (!job) return;
    const durationMinutes = parseJobDurationMinutes(job.job_time);
    const keepCalendarStart = Boolean(prefill?.dateKey || prefill?.startTime || startDate || startTime);
    if (!allDay && durationMinutes && durationMinutes > 0 && keepCalendarStart) {
      const baseDate = startDate || prefill?.dateKey || defaultDateKey;
      const baseTime = startTime || prefill?.startTime || "09:00";
      const next = addMinutesToDateTime(baseDate, baseTime, durationMinutes);
      if (baseDate) setStartDate(baseDate);
      if (baseTime) setStartTime(baseTime);
      if (next) {
        setEndDate(next.date);
        setEndTime(next.time);
        return;
      }
    }
    if (prefill?.dateKey || prefill?.startTime) return;
    const start = splitApiDateTime(job.start_date);
    const end = splitApiDateTime(job.end_date || job.start_date);
    if (start.date) setStartDate(start.date);
    if (end.date) setEndDate(end.date);
    if (start.time) setStartTime(start.time);
    if (end.time) setEndTime(end.time);
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
    if (!next.startTime && !next.endTime && !allDay && selectedWorker && getBookingConflict) {
      const startIso = combineDateAndTimeToIso(startDate, startTime, false);
      const endIso = combineDateAndTimeEndToIso(endDate, endTime, false);
      const conflict = getBookingConflict({
        workerId: selectedWorker.id,
        startAt: startIso,
        endAt: endIso,
        ignoreScheduleId: existingSchedule?.id,
      });
      if (conflict) next.time = conflict;
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

    setSaving(true);
    try {
      const startIso = combineDateAndTimeToIso(startDate, startTime, allDay);
      const endIso = combineDateAndTimeEndToIso(endDate, endTime, allDay);

      const payload = {
        job_id: jobNum,
        worker_id: selectedWorker.id,
        worker_ids: [selectedWorker.id],
        client_id: clientNum,
        project_id: (job ? getJobProjectId(job.project) : null) ?? existingSchedule?.project_id ?? null,
        start_at: startIso,
        end_at: endIso,
        notes: null,
        recurrence: "none" as const,
        recurrence_end_at: null,
        all_day: allDay,
      };

      const row = existingSchedule
        ? await updateSchedule(existingSchedule.id, payload)
        : await createSchedule(payload);
      toastSuccess(isReschedule ? t("modal.successRescheduleToast") : t("modal.successToast"));
      onCreated?.(row.id);
      onClose();
    } catch (error) {
      toastApiError(error, isReschedule ? t("modal.errorRescheduleToast") : t("modal.errorToast"));
    } finally {
      setSaving(false);
    }
  }

  const techTitle = selectedWorker?.title?.trim() || t("modal.technicianFallbackTitle");

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={isReschedule ? t("modal.rescheduleTitle") : t("modal.title")}
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
            {saving
              ? isReschedule
                ? t("modal.savingReschedule")
                : t("modal.saving")
              : isReschedule
                ? t("modal.saveReschedule")
                : t("modal.save")}
          </AppButton>
        </div>
      }
    >
      {selectedWorker && technician ? (
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
              disabled={saving || catalogLoading}
              locked={lockClientJob}
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
            {lockClientJob ? null : (
              <Building2
                className="pointer-events-none absolute right-9 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
            )}
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
              disabled={saving || !clientId || loadingJobs}
              locked={lockClientJob}
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
            {lockClientJob ? null : (
              <Briefcase
                className="pointer-events-none absolute right-9 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
            )}
          </div>
          <FieldErrorText>{errors.job}</FieldErrorText>
        </FieldGroup>

        <div>
          <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("fields.date")} <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceDateInput
              type="date"
              value={startDate}
              disabled={saving}
              aria-label={t("fields.startDate")}
              className={cn(surfaceInputClassName, "min-w-[9.5rem] flex-1")}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <span className="text-sm text-slate-500">{t("fields.to")}</span>
            <SurfaceDateInput
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
              <SurfaceDateInput
                type="time"
                value={startTime}
                disabled={saving}
                aria-label={t("fields.startTime")}
                className={cn(surfaceInputClassName, "min-w-[8rem] flex-1")}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <span className="text-sm text-slate-500">{t("fields.to")}</span>
              <SurfaceDateInput
                type="time"
                value={endTime}
                disabled={saving}
                aria-label={t("fields.endTime")}
                className={cn(surfaceInputClassName, "min-w-[8rem] flex-1")}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <FieldErrorText>{errors.startTime || errors.endTime || errors.time}</FieldErrorText>
          </div>
        ) : null}
      </div>
    </AppModal>
  );
}
