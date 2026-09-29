"use client";

import * as React from "react";
import { Copy, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { technicianMatchesWorkerId } from "@/features/scheduling/utils/scheduling-technician.util";
import { scheduleJobLabel } from "@/features/scheduling/utils/schedule-map.util";
import {
  formatAvailabilityHours,
  formatMinutesRange,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  minutesToTime,
  occupiedRangesForDay,
} from "@/features/scheduling/utils/scheduling-availability.util";
import { toDateKey } from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  tech: SchedulingTechnician;
  day: Date;
  schedules: Schedule[];
  timeOffs: WorkerTimeOff[];
  onCreate?: (startTime: string, endTime: string) => void;
  pendingCreate?: {
    techId: number;
    dayKey: string;
    startTime: string;
    endTime: string;
  } | null;
  createBusy?: boolean;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onCopySchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
};

/**
 * Workforce-style week cell: tinted availability background + compact stacked
 * job/time-off cards (no tall green strips between every booking).
 */
export function SchedulingWeekDayStrip({
  tech,
  day,
  schedules,
  timeOffs,
  onCreate,
  pendingCreate = null,
  createBusy = false,
  onScheduleClick,
  onRemoveSchedule,
  onCopySchedule,
  onRemoveTimeOff,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const dayKey = toDateKey(day);
  const window = getDayAvailabilityWindow(tech.availableDays, day);
  const known = hasAvailabilityData(tech.availableDays);
  const occupied = occupiedRangesForDay([...schedules, ...timeOffs], dayKey);
  const hasBlocks = schedules.length > 0 || timeOffs.length > 0;

  const pendingHere =
    pendingCreate &&
    pendingCreate.dayKey === dayKey &&
    technicianMatchesWorkerId(tech, pendingCreate.techId)
      ? pendingCreate
      : null;

  const sortedSchedules = React.useMemo(
    () => [...schedules].sort((a, b) => a.start_at.localeCompare(b.start_at) || a.id - b.id),
    [schedules],
  );
  const sortedTimeOffs = React.useMemo(
    () => [...timeOffs].sort((a, b) => a.start_at.localeCompare(b.start_at) || a.id - b.id),
    [timeOffs],
  );

  const isOff = known && !window;
  const canCreate = Boolean(onCreate) && !createBusy && Boolean(window);

  function openDefaultSlot() {
    if (!onCreate || !window) return;
    // Prefer first free hour inside availability; fall back to window start.
    let start = window.startMinutes;
    for (const range of occupied) {
      if (start >= range.startMinutes && start < range.endMinutes) {
        start = range.endMinutes;
      }
    }
    if (start + 15 > window.endMinutes) start = window.startMinutes;
    const end = Math.min(window.endMinutes, start + 60);
    if (end - start < 15) return;
    onCreate(minutesToTime(start), minutesToTime(end));
  }

  if (isOff) {
    return (
      <div className="flex h-full min-h-[3.25rem] w-full items-center justify-center rounded-md bg-slate-100 px-1 text-[10px] font-medium text-slate-400 dark:bg-slate-800/70">
        {t("offDuty")}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full min-h-[3.25rem] w-full flex-col gap-1 overflow-hidden rounded-md p-1",
        window
          ? "bg-emerald-50/90 dark:bg-emerald-950/30"
          : known
            ? "bg-slate-100 dark:bg-slate-800/60"
            : "bg-white dark:bg-slate-950",
        canCreate && "cursor-crosshair",
      )}
      title={
        window
          ? `${t("legendAvailable")} · ${formatAvailabilityHours(window, locale)}`
          : undefined
      }
      onClick={(e) => {
        if (!canCreate) return;
        if ((e.target as HTMLElement).closest("[data-week-card],[data-week-action]")) return;
        openDefaultSlot();
      }}
    >
      {!hasBlocks && window ? (
        <p className="pointer-events-none px-0.5 text-[9px] font-semibold leading-tight text-emerald-800/80 dark:text-emerald-200/80">
          {formatAvailabilityHours(window, locale)}
        </p>
      ) : null}

      {sortedTimeOffs.map((row) => {
        const start = new Date(row.start_at);
        const end = new Date(row.end_at);
        const label =
          !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
            ? formatMinutesRange(
                start.getHours() * 60 + start.getMinutes(),
                end.getHours() * 60 + end.getMinutes(),
                locale,
              )
            : "";
        return (
          <div
            key={`off-${row.id}`}
            data-week-card
            className="relative rounded border border-amber-300 bg-amber-100 px-1.5 py-1 dark:border-amber-800 dark:bg-amber-950/60"
          >
            <p className="truncate pr-4 text-[10px] font-semibold leading-tight text-amber-950 dark:text-amber-100">
              {row.reason || t("legendTimeOff")}
            </p>
            <p className="truncate text-[9px] leading-tight text-amber-800/80">{label}</p>
            {onRemoveTimeOff ? (
              <button
                type="button"
                data-week-action
                title={t("timeOff.remove")}
                aria-label={t("timeOff.remove")}
                className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded text-amber-800/70 hover:bg-red-50 hover:text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveTimeOff(row);
                }}
              >
                <X className="size-3" strokeWidth={2.5} />
              </button>
            ) : null}
          </div>
        );
      })}

      {sortedSchedules.map((schedule) => {
        const start = new Date(schedule.start_at);
        const end = new Date(schedule.end_at);
        const label =
          !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())
            ? formatMinutesRange(
                start.getHours() * 60 + start.getMinutes(),
                end.getHours() * 60 + end.getMinutes(),
                locale,
              )
            : "";
        return (
          <div
            key={`job-${schedule.id}`}
            data-week-card
            className="group/job relative rounded border border-sky-300 bg-sky-100 px-1.5 py-1 shadow-sm dark:border-sky-800 dark:bg-sky-900/70"
          >
            <button
              type="button"
              data-week-action
              className="block w-full truncate text-left"
              onClick={(e) => {
                e.stopPropagation();
                onScheduleClick(schedule);
              }}
            >
              <span className="block truncate pr-8 text-[10px] font-semibold leading-tight text-sky-950 dark:text-sky-100">
                {scheduleJobLabel(schedule)}
              </span>
              {label ? (
                <span className="block truncate text-[9px] leading-tight text-sky-800/80 dark:text-sky-200/80">
                  {label}
                </span>
              ) : null}
            </button>
            <div className="absolute right-0.5 top-0.5 flex items-center gap-0.5">
              {onCopySchedule ? (
                <button
                  type="button"
                  data-week-action
                  title={t("copy.action")}
                  aria-label={t("copy.action")}
                  className="inline-flex size-4 items-center justify-center rounded text-sky-800/70 hover:bg-sky-50 hover:text-sky-950 dark:text-sky-200/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCopySchedule(schedule);
                  }}
                >
                  <Copy className="size-3" strokeWidth={2.5} />
                </button>
              ) : null}
              {onRemoveSchedule ? (
                <button
                  type="button"
                  data-week-action
                  title={t("removeSchedule")}
                  aria-label={t("removeSchedule")}
                  className="inline-flex size-4 items-center justify-center rounded text-sky-800/70 hover:bg-red-50 hover:text-red-600 dark:text-sky-200/80"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSchedule(schedule);
                  }}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          </div>
        );
      })}

      {pendingHere ? (
        <div
          data-week-card
          className="flex items-center justify-center gap-1 rounded border border-sky-400 bg-sky-50 px-1.5 py-1 text-sky-900 dark:border-sky-500 dark:bg-sky-950/85 dark:text-sky-100"
          aria-busy
          aria-label={t("creatingSchedule")}
        >
          <Loader2 className="size-3.5 animate-spin" strokeWidth={2.5} aria-hidden />
          <span className="truncate text-[9px] font-semibold">{t("creatingSchedule")}</span>
        </div>
      ) : null}
    </div>
  );
}
