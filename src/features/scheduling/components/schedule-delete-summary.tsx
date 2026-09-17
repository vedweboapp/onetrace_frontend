"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import {
  apiDateToKey,
  formatDayHeader,
  formatTimeRange,
  parseDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";

function SummaryRow({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return (
    <div className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-0.5 text-sm">
      <dt className="font-normal text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 font-medium text-slate-800 dark:text-slate-100">{value}</dd>
    </div>
  );
}

/** Labeled summary for delete-schedule confirm (no job description). */
export function ScheduleDeleteSummary({ schedule }: { schedule: Schedule }) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();

  const dayKey = apiDateToKey(schedule.start_at);
  const dayDate = dayKey ? parseDateKey(dayKey) : new Date(schedule.start_at);
  const dateLabel = formatDayHeader(dayDate, locale, t("today"));
  const timeLabel = schedule.all_day
    ? t("detail.allDay")
    : formatTimeRange(schedule.start_at, schedule.end_at, locale);
  const dateValue = timeLabel ? `${dateLabel} · ${timeLabel}` : dateLabel;

  const jobId =
    schedule.job_serial?.trim() ||
    (schedule.job_id > 0 ? `Job #${schedule.job_id}` : "");
  const worker = schedule.worker_name?.trim() || "—";
  const client = schedule.client_name?.trim() || "—";
  const project = schedule.project_name?.trim() || "—";

  return (
    <dl className="space-y-2">
      <SummaryRow label={t("fields.assignedWorker")} value={worker} />
      <SummaryRow label={t("fields.jobId")} value={jobId || "—"} />
      <SummaryRow label={t("fields.date")} value={dateValue} />
      <SummaryRow label={t("fields.client")} value={client} />
      <SummaryRow label={t("fields.project")} value={project} />
    </dl>
  );
}
