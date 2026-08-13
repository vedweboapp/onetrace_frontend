"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ScheduleCreateCellButton } from "@/features/scheduling/components/schedule-create-cell-button";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  availabilityToneClass,
  dayTone,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  mergeTones,
  occupiedRangesForDay,
} from "@/features/scheduling/utils/scheduling-availability.util";
import {
  buildWeekDays,
  formatWeekdayShort,
  isSameLocalDay,
  isSameLocalMonth,
  startOfWeekMonday,
  toDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  anchorMonth: Date;
  monthDays: Date[];
  schedulesByDay: Map<string, Schedule[]>;
  timeOffsByDay?: Map<string, WorkerTimeOff[]>;
  technicians: SchedulingTechnician[];
  loading: boolean;
  singleWorker?: SchedulingTechnician | null;
  onDayClick: (day: Date) => void;
  onCreateSchedule?: (tech: SchedulingTechnician | null, day: Date) => void;
};

export function SchedulingMonthCalendar({
  anchorMonth,
  monthDays,
  schedulesByDay,
  timeOffsByDay,
  technicians,
  loading,
  singleWorker,
  onDayClick,
  onCreateSchedule,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();

  const weekdayHeaders = React.useMemo(
    () => buildWeekDays(startOfWeekMonday(new Date(2024, 0, 1))),
    [],
  );

  if (loading) {
    return (
      <div className="space-y-2 p-4">
        <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800">
          {weekdayHeaders.map((day) => (
            <div
              key={toDateKey(day)}
              className="px-1 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-500 sm:px-2 sm:py-2.5 sm:text-[11px]"
            >
              {formatWeekdayShort(day, locale)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {monthDays.map((day) => {
            const dayKey = toDateKey(day);
            const inMonth = isSameLocalMonth(day, anchorMonth);
            const isToday = isSameLocalDay(day, new Date());
            const daySchedules = schedulesByDay.get(dayKey) ?? [];
            const dayTimeOffs = timeOffsByDay?.get(dayKey) ?? [];
            const tone = singleWorker
              ? dayTone(
                  getDayAvailabilityWindow(singleWorker.availableDays, day),
                  hasAvailabilityData(singleWorker.availableDays),
                  occupiedRangesForDay(dayTimeOffs, dayKey),
                )
              : mergeTones(
                  technicians.map((tech) =>
                    dayTone(
                      getDayAvailabilityWindow(tech.availableDays, day),
                      hasAvailabilityData(tech.availableDays),
                      occupiedRangesForDay(
                        dayTimeOffs.filter((row) => row.worker_id === tech.id),
                        dayKey,
                      ),
                    ),
                  ),
                );
            const blocked =
              Boolean(singleWorker) && (tone === "unavailable" || tone === "timeoff");
            const canCreate = Boolean(onCreateSchedule) && inMonth && !blocked;

            return (
              <div
                key={dayKey}
                className={cn(
                  "group/cell relative flex min-h-[4.75rem] flex-col border-b border-r border-slate-100 p-1 last:border-r-0 sm:min-h-[7rem] sm:p-1.5 dark:border-slate-800/80",
                  !inMonth && "bg-slate-50/80 dark:bg-slate-900/40",
                  inMonth && availabilityToneClass(tone),
                  isToday && inMonth && tone === "unknown" && "bg-sky-50/50 dark:bg-sky-950/20",
                )}
              >
                <div className="mb-1 flex items-start justify-between gap-1">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition sm:size-7",
                      isToday
                        ? "bg-sky-600 text-white"
                        : inMonth
                          ? "text-slate-800 hover:bg-black/5 dark:text-slate-100 dark:hover:bg-white/10"
                          : "text-slate-400 hover:bg-slate-100 dark:text-slate-500",
                    )}
                    onClick={() => onDayClick(day)}
                    aria-label={dayKey}
                  >
                    {day.getDate()}
                  </button>
                  {canCreate ? (
                    <div className="opacity-0 transition group-hover/cell:opacity-100 max-sm:opacity-100">
                      <ScheduleCreateCellButton
                        iconOnly
                        className="size-6"
                        onClick={() => onCreateSchedule?.(singleWorker ?? null, day)}
                      />
                    </div>
                  ) : null}
                </div>

                {inMonth ? (
                  <button
                    type="button"
                    className="flex min-h-0 flex-1 flex-col items-start gap-1 text-left"
                    onClick={() => onDayClick(day)}
                  >
                    {daySchedules.length > 0 ? (
                      <span className="inline-flex max-w-full items-center rounded-full bg-sky-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t("monthJobCount", { count: daySchedules.length })}
                      </span>
                    ) : null}
                    {dayTimeOffs.length > 0 ? (
                      <span className="inline-flex max-w-full items-center rounded-full bg-amber-500/90 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {t("monthTimeOffCount", { count: dayTimeOffs.length })}
                      </span>
                    ) : null}
                    {daySchedules.length === 0 && dayTimeOffs.length === 0 && tone === "unavailable" ? (
                      <span className="text-[10px] font-medium text-slate-400">{t("offDuty")}</span>
                    ) : null}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
