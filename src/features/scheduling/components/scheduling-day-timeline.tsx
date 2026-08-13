"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ScheduleCreateCellButton } from "@/features/scheduling/components/schedule-create-cell-button";
import { SchedulingEmptyUsers } from "@/features/scheduling/components/scheduling-empty-users";
import { ScheduleEventChip } from "@/features/scheduling/components/schedule-event-chip";
import { TimeOffChip } from "@/features/scheduling/components/time-off-chip";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  availabilityHeaderBarClass,
  availabilityToneClass,
  formatAvailabilityHours,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  hourTone,
  isRangeFree,
  isRangeWithinAvailability,
  mergeTones,
  minuteIsBookable,
  minutesBandPct,
  minutesToTime,
  occupiedRangesForDay,
  pointerToMinutes,
  type OccupiedRange,
} from "@/features/scheduling/utils/scheduling-availability.util";
import {
  buildDayHourLabels,
  formatHourParts,
  scheduleTimelineSpan,
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
} from "@/features/scheduling/utils/scheduling-time.util";
import { apiDateToKey, toDateKey } from "@/features/scheduling/utils/scheduling-week.util";
import { toastError } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";

const HOUR_WIDTH_PX = 88;
const END_LABEL_PX = 44;
const EMPTY_ROW_HEIGHT_PX = 56;
const SCHEDULED_ROW_HEIGHT_PX = 72;
const SINGLE_ROW_HEIGHT_PX = 112;
const WORKER_COL_PX = 228;

function HourStamp({ hour, locale, className }: { hour: number; locale: string; className?: string }) {
  const { time, period } = formatHourParts(hour, locale);
  return (
    <span className={cn("flex flex-col items-center justify-center leading-none", className)}>
      <span className="text-[11px] font-semibold tabular-nums">{time}</span>
      {period ? (
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-80">{period}</span>
      ) : null}
    </span>
  );
}

export type TimelineRangeSelect = {
  tech: SchedulingTechnician;
  day: Date;
  startTime: string;
  endTime: string;
};

type DragState = {
  techId: number;
  startMin: number;
  endMin: number;
  valid: boolean;
};

type Props = {
  day: Date;
  technicians: SchedulingTechnician[];
  schedules: Schedule[];
  timeOffs?: WorkerTimeOff[];
  hideWorkerColumn?: boolean;
  peopleHeader?: React.ReactNode;
  onClearPeopleFilters?: () => void;
  dragMode?: "book" | "timeoff";
  onCreateSchedule: (tech: SchedulingTechnician, day: Date) => void;
  onRangeSelect?: (range: TimelineRangeSelect) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
  onWorkerClick: (tech: SchedulingTechnician) => void;
};

export function SchedulingDayTimeline({
  day,
  technicians,
  schedules,
  timeOffs = [],
  hideWorkerColumn = false,
  peopleHeader,
  onClearPeopleFilters,
  dragMode = "book",
  onCreateSchedule,
  onRangeSelect,
  onScheduleClick,
  onRemoveSchedule,
  onRemoveTimeOff,
  onWorkerClick,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const dayKey = toDateKey(day);
  const hours = buildDayHourLabels();
  const timelineWidth = hours.length * HOUR_WIDTH_PX;
  const singleWorker = technicians.length === 1;
  const [drag, setDrag] = React.useState<DragState | null>(null);

  const schedulesByWorker = React.useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const row of schedules) {
      const startKey = apiDateToKey(row.start_at);
      const endKey = apiDateToKey(row.end_at) ?? startKey;
      if (!startKey) continue;
      const end = endKey && endKey >= startKey ? endKey : startKey;
      if (dayKey < startKey || dayKey > end) continue;
      const list = map.get(row.worker_id) ?? [];
      list.push(row);
      map.set(row.worker_id, list);
    }
    return map;
  }, [schedules, dayKey]);

  const timeOffByWorker = React.useMemo(() => {
    const map = new Map<number, WorkerTimeOff[]>();
    for (const row of timeOffs) {
      const startKey = apiDateToKey(row.start_at);
      const endKey = apiDateToKey(row.end_at) ?? startKey;
      if (!startKey) continue;
      const end = endKey && endKey >= startKey ? endKey : startKey;
      if (dayKey < startKey || dayKey > end) continue;
      const list = map.get(row.worker_id) ?? [];
      list.push(row);
      map.set(row.worker_id, list);
    }
    return map;
  }, [timeOffs, dayKey]);

  function occupiedFor(tech: SchedulingTechnician): OccupiedRange[] {
    return [
      ...occupiedRangesForDay(schedulesByWorker.get(tech.id) ?? [], dayKey),
      ...occupiedRangesForDay(timeOffByWorker.get(tech.id) ?? [], dayKey),
    ];
  }

  function rangeIsValid(tech: SchedulingTechnician, startMin: number, endMin: number): boolean {
    const start = Math.min(startMin, endMin);
    const end = Math.max(startMin, endMin);
    if (end - start < 15) return false;
    const window = getDayAvailabilityWindow(tech.availableDays, day);
    const known = hasAvailabilityData(tech.availableDays);
    const occupied = occupiedFor(tech);
    if (dragMode === "book" && !isRangeWithinAvailability(start, end, window, known)) return false;
    if (dragMode === "timeoff" && known && !window) return false;
    return isRangeFree(start, end, occupied);
  }

  function commitDrag(tech: SchedulingTechnician, startMin: number, endMin: number) {
    const start = Math.min(startMin, endMin);
    const end = Math.max(startMin, endMin);
    if (end - start < 15 || !onRangeSelect) return;
    if (!rangeIsValid(tech, start, end)) {
      const window = getDayAvailabilityWindow(tech.availableDays, day);
      const known = hasAvailabilityData(tech.availableDays);
      toastError(
        !isRangeWithinAvailability(start, end, window, known) ? t("conflict.unavailable") : t("conflict.booked"),
      );
      return;
    }
    onRangeSelect({
      tech,
      day,
      startTime: minutesToTime(start),
      endTime: minutesToTime(end),
    });
  }

  const headerTones = hours.map((hour) =>
    mergeTones(
      technicians.map((tech) =>
        hourTone(
          hour,
          getDayAvailabilityWindow(tech.availableDays, day),
          hasAvailabilityData(tech.availableDays),
          occupiedRangesForDay(timeOffByWorker.get(tech.id) ?? [], dayKey),
        ),
      ),
    ),
  );

  if (technicians.length === 0) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-auto">
        {peopleHeader ? (
          <div className="max-w-[15rem] border-b border-slate-200 px-2 py-2 dark:border-slate-800">
            {peopleHeader}
          </div>
        ) : null}
        <SchedulingEmptyUsers onClear={onClearPeopleFilters} />
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max">
        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white pt-1 dark:border-slate-800 dark:bg-slate-950">
          {hideWorkerColumn ? null : (
            <div
              className="sticky left-0 z-30 flex shrink-0 items-center border-r border-slate-200 bg-white px-2 py-1.5 dark:border-slate-800 dark:bg-slate-950"
              style={{ width: WORKER_COL_PX }}
            >
              {peopleHeader ?? (
                <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("usersColumn")}</span>
              )}
            </div>
          )}
          <div className="relative flex" style={{ width: timelineWidth + END_LABEL_PX }}>
            {hours.map((hour, index) => {
              const tone = headerTones[index] ?? "unknown";
              return (
                <div
                  key={hour}
                  className="relative flex shrink-0 flex-col border-r border-slate-100 dark:border-slate-800"
                  style={{ width: HOUR_WIDTH_PX }}
                >
                  <span className={cn("block h-2.5 w-full shrink-0 rounded-b-sm", availabilityHeaderBarClass(tone))} />
                  <span
                    className={cn(
                      "flex min-h-[2.75rem] items-center justify-center px-1 py-1.5",
                      availabilityToneClass(tone) || "text-slate-500",
                    )}
                  >
                    <HourStamp hour={hour} locale={locale} />
                  </span>
                </div>
              );
            })}
            <div
              className="relative flex shrink-0 flex-col"
              style={{ width: END_LABEL_PX }}
            >
              <span className="block h-2.5 w-full shrink-0 bg-transparent" />
              <span className="flex min-h-[2.75rem] items-center justify-center px-0.5 py-1.5 text-slate-500">
                <HourStamp hour={SCHEDULE_DAY_END_HOUR} locale={locale} />
              </span>
            </div>
          </div>
        </div>

        {technicians.map((tech) => {
          const cellSchedules = schedulesByWorker.get(tech.id) ?? [];
          const cellTimeOffs = timeOffByWorker.get(tech.id) ?? [];
          const window = getDayAvailabilityWindow(tech.availableDays, day);
          const knownAvailability = hasAvailabilityData(tech.availableDays);
          const occupied = occupiedFor(tech);
          const hasBlocks = cellSchedules.length > 0 || cellTimeOffs.length > 0;
          const rowHeight = singleWorker
            ? SINGLE_ROW_HEIGHT_PX
            : hasBlocks
              ? SCHEDULED_ROW_HEIGHT_PX
              : EMPTY_ROW_HEIGHT_PX;
          const activeDrag = drag?.techId === tech.id ? drag : null;
          const canCreate =
            dragMode === "book" &&
            (!knownAvailability || window != null) &&
            cellSchedules.length === 0 &&
            cellTimeOffs.length === 0;

          return (
            <div
              key={tech.id}
              className="group/row flex border-b border-slate-100 dark:border-slate-800/80"
              style={{ minHeight: rowHeight }}
            >
              {hideWorkerColumn ? null : (
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-start gap-2 border-r border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950"
                  style={{ width: WORKER_COL_PX }}
                >
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                    aria-hidden
                  >
                    {tech.initials}
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="block w-full truncate text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                      onClick={() => onWorkerClick(tech)}
                    >
                      {tech.name}
                    </button>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tech.title}</p>
                    {window ? (
                      <p className="mt-0.5 truncate text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
                        {t("availableHoursNote", { hours: formatAvailabilityHours(window, locale) })}
                      </p>
                    ) : knownAvailability ? (
                      <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{t("offDuty")}</p>
                    ) : null}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "group/cell relative shrink-0 select-none",
                  onRangeSelect ? "cursor-crosshair" : null,
                )}
                style={{ width: timelineWidth, minHeight: rowHeight, touchAction: "none" }}
                onPointerDown={(e) => {
                  if (!onRangeSelect || e.button !== 0) return;
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-schedule-chip],[data-timeoff-chip],button")) return;
                  const startMin = pointerToMinutes(e.clientX, e.currentTarget);
                  if (!minuteIsBookable(startMin, window, knownAvailability, occupied) && dragMode === "book") return;
                  if (dragMode === "timeoff" && knownAvailability && !window) return;
                  if (dragMode === "timeoff" && !isRangeFree(startMin, startMin + 15, occupied)) return;
                  setDrag({
                    techId: tech.id,
                    startMin,
                    endMin: startMin + 15,
                    valid: rangeIsValid(tech, startMin, startMin + 15),
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.techId !== tech.id) return;
                  const endMin = pointerToMinutes(e.clientX, e.currentTarget);
                  setDrag({
                    ...drag,
                    endMin,
                    valid: rangeIsValid(tech, drag.startMin, endMin),
                  });
                }}
                onPointerUp={(e) => {
                  if (!drag || drag.techId !== tech.id) return;
                  const startMin = drag.startMin;
                  const endMin = pointerToMinutes(e.clientX, e.currentTarget);
                  setDrag(null);
                  commitDrag(tech, startMin, endMin);
                }}
                onPointerCancel={() => setDrag(null)}
              >
                <div className="pointer-events-none absolute inset-0 flex">
                  {hours.map((hour) => {
                    const tone = hourTone(
                      hour,
                      window,
                      knownAvailability,
                      occupiedRangesForDay(cellTimeOffs, dayKey),
                    );
                    return (
                      <div
                        key={hour}
                        className={cn(
                          "shrink-0 border-r border-slate-100/80 dark:border-slate-800/60",
                          availabilityToneClass(tone) || "bg-white dark:bg-slate-950",
                        )}
                        style={{ width: HOUR_WIDTH_PX }}
                      />
                    );
                  })}
                </div>

                {activeDrag ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-1 z-[2] rounded-md border border-dashed",
                      activeDrag.valid
                        ? dragMode === "timeoff"
                          ? "border-amber-400 bg-amber-200/60 dark:bg-amber-900/50"
                          : "border-sky-400 bg-sky-200/60 dark:bg-sky-900/50"
                        : "border-red-400 bg-red-200/50 dark:bg-red-900/40",
                    )}
                    style={{
                      left: `${minutesBandPct(activeDrag.startMin, activeDrag.endMin).leftPct}%`,
                      width: `${minutesBandPct(activeDrag.startMin, activeDrag.endMin).widthPct}%`,
                    }}
                  />
                ) : null}

                {cellTimeOffs.map((row) => {
                  const { leftPct, widthPct } = scheduleTimelineSpan(
                    row.start_at,
                    row.end_at,
                    SCHEDULE_DAY_START_HOUR,
                    SCHEDULE_DAY_END_HOUR,
                  );
                  return (
                    <TimeOffChip
                      key={row.id}
                      timeOff={row}
                      compact
                      className="absolute top-1.5 z-[1] h-[calc(100%-12px)] min-h-[44px]"
                      style={{ left: `${leftPct}%`, width: `max(${widthPct}%, 6rem)` }}
                      onRemove={onRemoveTimeOff ? () => onRemoveTimeOff(row) : undefined}
                    />
                  );
                })}

                {cellSchedules.map((schedule) => {
                  const { leftPct, widthPct } = scheduleTimelineSpan(
                    schedule.start_at,
                    schedule.end_at,
                    SCHEDULE_DAY_START_HOUR,
                    SCHEDULE_DAY_END_HOUR,
                  );
                  return (
                    <ScheduleEventChip
                      key={schedule.id}
                      schedule={schedule}
                      compact
                      className="absolute top-1.5 z-[1] h-[calc(100%-12px)] min-h-[44px]"
                      style={{ left: `${leftPct}%`, width: `max(${widthPct}%, 7rem)` }}
                      onOpen={() => onScheduleClick(schedule)}
                      onRemove={onRemoveSchedule ? () => onRemoveSchedule(schedule) : undefined}
                    />
                  );
                })}

                {canCreate ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 left-2 z-[1] flex items-center",
                      "opacity-0 transition group-hover/cell:opacity-100 max-sm:opacity-100",
                    )}
                  >
                    <ScheduleCreateCellButton
                      className="pointer-events-auto"
                      onClick={() => onCreateSchedule(tech, day)}
                    />
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
