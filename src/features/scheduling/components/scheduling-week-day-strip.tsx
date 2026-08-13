"use client";

import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ScheduleCreateCellButton } from "@/features/scheduling/components/schedule-create-cell-button";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  buildDayTimeSegments,
  formatMinutesRange,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  minutesToTime,
} from "@/features/scheduling/utils/scheduling-availability.util";
import {
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
} from "@/features/scheduling/utils/scheduling-time.util";
import { toDateKey } from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  tech: SchedulingTechnician;
  day: Date;
  schedules: Schedule[];
  timeOffs: WorkerTimeOff[];
  onCreate?: (startTime: string, endTime: string) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
};

const KIND_CLASS: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200",
  unavailable: "bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
  scheduled: "bg-sky-200 text-sky-950 dark:bg-sky-900/70 dark:text-sky-100",
  timeoff: "bg-amber-200 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100",
  free: "bg-white text-slate-400 dark:bg-slate-950 dark:text-slate-500",
};

export function SchedulingWeekDayStrip({
  tech,
  day,
  schedules,
  timeOffs,
  onCreate,
  onScheduleClick,
  onRemoveSchedule,
  onRemoveTimeOff,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const dayKey = toDateKey(day);
  const window = getDayAvailabilityWindow(tech.availableDays, day);
  const known = hasAvailabilityData(tech.availableDays);
  const segments = buildDayTimeSegments({
    dayKey,
    window,
    knownAvailability: known,
    schedules,
    timeOffs,
    spanStartMinutes: SCHEDULE_DAY_START_HOUR * 60,
    spanEndMinutes: SCHEDULE_DAY_END_HOUR * 60,
  });
  const total = segments.reduce((sum, row) => sum + Math.max(15, row.endMinutes - row.startMinutes), 0);

  if (known && !window && segments.every((segment) => segment.kind === "unavailable")) {
    return (
      <div className="flex h-full min-h-[8rem] w-full items-center justify-center rounded-md bg-slate-100 text-[10px] font-medium text-slate-400 dark:bg-slate-800/70">
        {t("offDuty")}
      </div>
    );
  }

  if (segments.length === 0) {
    return (
      <div className="group/cell relative flex h-full min-h-[8rem] w-full items-center justify-center rounded-md">
        {onCreate ? (
          <div className="opacity-0 transition group-hover/cell:opacity-100 max-sm:opacity-100">
            <ScheduleCreateCellButton iconOnly className="size-6 sm:size-7" onClick={() => onCreate("09:00", "10:00")} />
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[10rem] flex-col overflow-hidden rounded-md">
      {segments.map((segment) => {
        const flexGrow = Math.max(15, segment.endMinutes - segment.startMinutes);
        const label = formatMinutesRange(segment.startMinutes, segment.endMinutes, locale);
        const minHeight =
          segment.kind === "scheduled" || segment.kind === "timeoff"
            ? 44
            : Math.max(22, (flexGrow / Math.max(total, 1)) * 160);
        const start = minutesToTime(segment.startMinutes);

        if (segment.kind === "scheduled" && segment.schedule) {
          return (
            <div
              key={`job-${segment.schedule.id}-${segment.startMinutes}`}
              className={cn("group/job relative flex min-h-0 flex-col justify-center overflow-hidden px-1 py-0.5", KIND_CLASS.scheduled)}
              style={{ flexGrow, flexBasis: 0, minHeight }}
            >
              <button type="button" className="block w-full truncate text-left" onClick={() => onScheduleClick(segment.schedule!)}>
                <span className="block truncate pr-4 text-[10px] font-semibold leading-tight">{segment.schedule.job_title}</span>
                <span className="block truncate text-[9px] leading-tight opacity-80">{label}</span>
              </button>
              {onRemoveSchedule ? (
                <button
                  type="button"
                  title={t("removeSchedule")}
                  aria-label={t("removeSchedule")}
                  className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded text-sky-800/70 hover:bg-red-50 hover:text-red-600 dark:text-sky-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveSchedule(segment.schedule!);
                  }}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          );
        }

        if (segment.kind === "timeoff" && segment.timeOff) {
          return (
            <div
              key={`off-${segment.timeOff.id}-${segment.startMinutes}`}
              className={cn("relative flex min-h-0 flex-col justify-center overflow-hidden px-1 py-0.5", KIND_CLASS.timeoff)}
              style={{ flexGrow, flexBasis: 0, minHeight }}
            >
              <p className="truncate pr-4 text-[10px] font-semibold leading-tight">
                {segment.timeOff.reason || t("legendTimeOff")}
              </p>
              <p className="truncate text-[9px] leading-tight opacity-80">{label}</p>
              {onRemoveTimeOff ? (
                <button
                  type="button"
                  title={t("timeOff.remove")}
                  aria-label={t("timeOff.remove")}
                  className="absolute right-0.5 top-0.5 inline-flex size-4 items-center justify-center rounded text-amber-800/70 hover:bg-red-50 hover:text-red-600 dark:text-amber-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                  onClick={() => onRemoveTimeOff(segment.timeOff!)}
                >
                  <X className="size-3" strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          );
        }

        const canAdd = (segment.kind === "available" || segment.kind === "free") && Boolean(onCreate);
        const title =
          segment.kind === "available" ? t("legendAvailable") : segment.kind === "unavailable" ? t("offDuty") : "";

        return (
          <div
            key={`${segment.kind}-${segment.startMinutes}-${segment.endMinutes}`}
            className={cn(
              "group/slot relative flex min-h-0 flex-col justify-center overflow-hidden px-1 py-0.5",
              KIND_CLASS[segment.kind],
            )}
            style={{ flexGrow, flexBasis: 0, minHeight }}
            title={title ? `${title} · ${label}` : label}
          >
            <span className="truncate text-[9px] font-medium leading-tight opacity-80">{label}</span>
            {canAdd ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 z-[1] flex items-center justify-center",
                  "opacity-0 transition group-hover/slot:opacity-100 max-sm:opacity-100",
                )}
              >
                <ScheduleCreateCellButton
                  iconOnly
                  className="pointer-events-auto size-5 sm:size-6"
                  onClick={() =>
                    onCreate?.(start, minutesToTime(Math.min(segment.startMinutes + 60, segment.endMinutes)))
                  }
                />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
