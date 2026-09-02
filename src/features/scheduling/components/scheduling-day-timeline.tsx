"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { ScheduleEventChip } from "@/features/scheduling/components/schedule-event-chip";
import { TimeOffChip } from "@/features/scheduling/components/time-off-chip";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { technicianMatchesWorkerId, technicianWorkerIds } from "@/features/scheduling/utils/scheduling-technician.util";
import { scheduleWorkerIds, timeOffWorkerIds } from "@/features/scheduling/utils/schedule-map.util";
import {
  availabilityHeaderBarClass,
  availabilityToneClass,
  blockRangeOnDay,
  buildDayTimeSegments,
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
  timeToMinutes,
  type OccupiedRange,
} from "@/features/scheduling/utils/scheduling-availability.util";
import { SchedulingEmptyUsers } from "@/features/scheduling/components/scheduling-empty-users";
import {
  buildDayHourLabels,
  clipMinutesRange,
  dayTimelineBandStyle,
  dayTimelineChipStyle,
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
const EMPTY_ROW_HEIGHT_PX = 64;
const SCHEDULED_ROW_HEIGHT_PX = 80;
const SINGLE_ROW_HEIGHT_PX = 120;
const WORKER_COL_PX = 240;
/** Horizontal inset for schedule/time-off blocks on the day timeline. */
const TIMELINE_CHIP_INSET_PX = 6;
const TIMELINE_CHIP_GUTTER_PX = 12;

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
  allowCreate?: boolean;
  /** When set, show Paste on worker rows that are not already on this schedule. */
  copiedSchedule?: Schedule | null;
  pasteDisabled?: boolean;
  /** Absolute minutes from local midnight — scroll timeline so this time is in view. */
  scrollToMinutes?: number | null;
  /** Prefer scrolling this worker row into view after create. */
  scrollToWorkerId?: number | null;
  onScrollTargetApplied?: () => void;
  /** Ghost range shown while create API is in flight. */
  pendingCreate?: {
    techId: number;
    dayKey: string;
    startTime: string;
    endTime: string;
  } | null;
  /** Disable drag create while create or paste is running. */
  createBusy?: boolean;
  onCreateSchedule: (tech: SchedulingTechnician, day: Date) => void;
  onRangeSelect?: (range: TimelineRangeSelect) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onCopySchedule?: (schedule: Schedule) => void;
  onPasteSchedule?: (tech: SchedulingTechnician) => void;
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
  allowCreate = true,
  copiedSchedule = null,
  pasteDisabled = false,
  scrollToMinutes = null,
  scrollToWorkerId = null,
  onScrollTargetApplied,
  pendingCreate = null,
  createBusy = false,
  onCreateSchedule: _onCreateSchedule,
  onRangeSelect,
  onScheduleClick,
  onRemoveSchedule,
  onCopySchedule,
  onPasteSchedule,
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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const workerRowRefs = React.useRef(new Map<number, HTMLDivElement>());

  const schedulesByWorker = React.useMemo(() => {
    const map = new Map<number, Schedule[]>();
    for (const row of schedules) {
      const startKey = apiDateToKey(row.start_at);
      const endKey = apiDateToKey(row.end_at) ?? startKey;
      if (!startKey) continue;
      const end = endKey && endKey >= startKey ? endKey : startKey;
      if (dayKey < startKey || dayKey > end) continue;
      for (const workerId of scheduleWorkerIds(row)) {
        const list = map.get(workerId) ?? [];
        list.push(row);
        map.set(workerId, list);
      }
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
      for (const workerId of timeOffWorkerIds(row)) {
        const list = map.get(workerId) ?? [];
        list.push(row);
        map.set(workerId, list);
      }
    }
    return map;
  }, [timeOffs, dayKey]);

  function rowsFromWorkerMap<T extends { id: number }>(
    map: Map<number, T[]>,
    tech: SchedulingTechnician,
  ): T[] {
    const seen = new Set<number>();
    const out: T[] = [];
    for (const id of technicianWorkerIds(tech)) {
      for (const row of map.get(id) ?? []) {
        if (seen.has(row.id)) continue;
        seen.add(row.id);
        out.push(row);
      }
    }
    return out;
  }

  function scheduleOccupiedFor(tech: SchedulingTechnician): OccupiedRange[] {
    return occupiedRangesForDay(rowsFromWorkerMap(schedulesByWorker, tech), dayKey);
  }

  function occupiedFor(tech: SchedulingTechnician): OccupiedRange[] {
    return [
      ...scheduleOccupiedFor(tech),
      ...occupiedRangesForDay(rowsFromWorkerMap(timeOffByWorker, tech), dayKey),
    ];
  }

  function canPasteOntoWorker(tech: SchedulingTechnician): boolean {
    if (!copiedSchedule || !onPasteSchedule) return false;
    if (scheduleWorkerIds(copiedSchedule).some((id) => technicianMatchesWorkerId(tech, id))) {
      return false;
    }
    const range = blockRangeOnDay(copiedSchedule.start_at, copiedSchedule.end_at, dayKey);
    if (!range) return false;
    const window = getDayAvailabilityWindow(tech.availableDays, day);
    const known = hasAvailabilityData(tech.availableDays);
    if (!isRangeWithinAvailability(range.startMinutes, range.endMinutes, window, known)) {
      return false;
    }
    return isRangeFree(range.startMinutes, range.endMinutes, occupiedFor(tech));
  }

  function rangeIsValid(tech: SchedulingTechnician, startMin: number, endMin: number): boolean {
    const start = Math.min(startMin, endMin);
    const end = Math.max(startMin, endMin);
    if (end - start < 15) return false;
    const window = getDayAvailabilityWindow(tech.availableDays, day);
    const known = hasAvailabilityData(tech.availableDays);
    const occupied = occupiedFor(tech);
    if (!isRangeWithinAvailability(start, end, window, known)) return false;
    return isRangeFree(start, end, occupied);
  }

  function commitDrag(tech: SchedulingTechnician, startMin: number, endMin: number) {
    const start = Math.min(startMin, endMin);
    const end = Math.max(startMin, endMin);
    if (end - start < 15 || !onRangeSelect) return;
    if (!rangeIsValid(tech, start, end)) {
      const window = getDayAvailabilityWindow(tech.availableDays, day);
      const known = hasAvailabilityData(tech.availableDays);
      const scheduleOccupied = scheduleOccupiedFor(tech);
      const fullOccupied = occupiedFor(tech);
      if (!isRangeWithinAvailability(start, end, window, known)) {
        toastError(t("conflict.unavailable"));
      } else if (!isRangeFree(start, end, scheduleOccupied)) {
        toastError(t("conflict.booked"));
      } else if (!isRangeFree(start, end, fullOccupied)) {
        toastError(t("conflict.timeOff"));
      } else {
        toastError(t("conflict.unavailable"));
      }
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
          occupiedRangesForDay(rowsFromWorkerMap(timeOffByWorker, tech), dayKey),
        ),
      ),
    ),
  );

  React.useLayoutEffect(() => {
    if (scrollToMinutes == null) return;
    const el = scrollRef.current;
    if (!el) return;

    const minutesFromStart = scrollToMinutes - SCHEDULE_DAY_START_HOUR * 60;
    const targetX = (minutesFromStart / 60) * HOUR_WIDTH_PX;
    // Keep a little lead-in so the block isn't flush against the sticky worker column.
    const leadIn = hideWorkerColumn ? 24 : Math.min(96, el.clientWidth * 0.15);
    const nextLeft = Math.max(0, targetX - leadIn);
    el.scrollTo({ left: nextLeft, top: el.scrollTop, behavior: "smooth" });

    if (scrollToWorkerId != null) {
      const match =
        technicians.find((tech) => technicianMatchesWorkerId(tech, scrollToWorkerId)) ??
        technicians.find((tech) => tech.id === scrollToWorkerId);
      const row = match ? workerRowRefs.current.get(match.id) : undefined;
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    // Defer clear so a concurrent schedules refresh can reuse the same focus once.
    const timer = window.setTimeout(() => onScrollTargetApplied?.(), 120);
    return () => window.clearTimeout(timer);
  }, [
    scrollToMinutes,
    scrollToWorkerId,
    hideWorkerColumn,
    schedules,
    technicians,
    onScrollTargetApplied,
  ]);

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
    <div ref={scrollRef} className="min-h-0 flex-1 overflow-auto">
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
          const cellSchedules = rowsFromWorkerMap(schedulesByWorker, tech);
          const cellTimeOffs = rowsFromWorkerMap(timeOffByWorker, tech);
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
          const canBook = allowCreate && !createBusy && dragMode === "book" && window != null && knownAvailability;
          const canMarkTimeOff = !createBusy && dragMode === "timeoff" && window != null && knownAvailability;
          const pendingForRow =
            pendingCreate &&
            pendingCreate.dayKey === dayKey &&
            technicianMatchesWorkerId(tech, pendingCreate.techId)
              ? pendingCreate
              : null;
          const pendingStartRaw = pendingForRow ? timeToMinutes(pendingForRow.startTime) : null;
          const pendingEndRaw = pendingForRow ? timeToMinutes(pendingForRow.endTime) : null;
          const pendingRange =
            pendingStartRaw != null && pendingEndRaw != null
              ? clipMinutesRange(pendingStartRaw, pendingEndRaw, window)
              : null;
          const pendingStartMin = pendingRange?.startMinutes ?? null;
          const pendingEndMin = pendingRange?.endMinutes ?? null;
          const availabilityBands = buildDayTimeSegments({
            dayKey,
            window,
            knownAvailability,
            schedules: cellSchedules,
            timeOffs: cellTimeOffs,
            spanStartMinutes: SCHEDULE_DAY_START_HOUR * 60,
            spanEndMinutes: SCHEDULE_DAY_END_HOUR * 60,
          }).filter((segment) => segment.kind === "available" || segment.kind === "unavailable" || segment.kind === "free");

          return (
            <div
              key={tech.id}
              ref={(node) => {
                if (node) workerRowRefs.current.set(tech.id, node);
                else workerRowRefs.current.delete(tech.id);
              }}
              className="group/row flex border-b border-slate-100 py-2 dark:border-slate-800/80"
              style={{ minHeight: rowHeight }}
            >
              {hideWorkerColumn ? null : (
                <div
                  className="sticky left-0 z-10 flex shrink-0 items-start gap-2.5 border-r border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950"
                  style={{ width: WORKER_COL_PX }}
                >
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                    aria-hidden
                  >
                    {tech.initials}
                  </div>
                  <div className="min-w-0 flex-1">
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
                    {canPasteOntoWorker(tech) ? (
                      <button
                        type="button"
                        disabled={pasteDisabled}
                        title={t("copy.pasteHere")}
                        aria-label={t("copy.pasteHere")}
                        className={cn(
                          "mt-1.5 inline-flex items-center gap-1 rounded-md border border-sky-400 bg-white px-2 py-1 text-[11px] font-semibold text-sky-700 shadow-sm",
                          "hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1",
                          "disabled:cursor-not-allowed disabled:opacity-50",
                          "dark:border-sky-600 dark:bg-slate-950 dark:text-sky-200 dark:hover:bg-sky-950",
                        )}
                        onClick={() => onPasteSchedule?.(tech)}
                      >
                        <ClipboardPaste className="size-3.5" strokeWidth={2.25} aria-hidden />
                        {t("copy.pasteHere")}
                      </button>
                    ) : null}
                  </div>
                </div>
              )}

              <div
                className={cn(
                  "group/cell relative shrink-0 select-none overflow-hidden pl-2",
                  onRangeSelect && (canMarkTimeOff || canBook) ? "cursor-crosshair" : null,
                )}
                style={{ width: timelineWidth, minHeight: rowHeight, touchAction: "none" }}
                onPointerDown={(e) => {
                  if (createBusy || !onRangeSelect || e.button !== 0) return;
                  const target = e.target as HTMLElement;
                  if (target.closest("[data-schedule-chip],[data-timeoff-chip],button")) return;
                  const startMin = pointerToMinutes(e.clientX, e.currentTarget);
                  if (dragMode === "book" && !minuteIsBookable(startMin, window, knownAvailability, occupied)) return;
                  if (dragMode === "timeoff" && !minuteIsBookable(startMin, window, knownAvailability, occupied)) return;
                  const endMin = startMin + 15;
                  setDrag({
                    techId: tech.id,
                    startMin,
                    endMin,
                    valid: rangeIsValid(tech, startMin, endMin),
                  });
                  e.currentTarget.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.techId !== tech.id) return;
                  let endMin = pointerToMinutes(e.clientX, e.currentTarget);
                  if ((dragMode === "book" || dragMode === "timeoff") && window) {
                    endMin = Math.min(window.endMinutes, Math.max(window.startMinutes, endMin));
                  }
                  setDrag({
                    ...drag,
                    endMin,
                    valid: rangeIsValid(tech, drag.startMin, endMin),
                  });
                }}
                onPointerUp={(e) => {
                  if (!drag || drag.techId !== tech.id) return;
                  const startMin = drag.startMin;
                  let endMin = pointerToMinutes(e.clientX, e.currentTarget);
                  if ((dragMode === "book" || dragMode === "timeoff") && window) {
                    endMin = Math.min(window.endMinutes, Math.max(window.startMinutes, endMin));
                  }
                  setDrag(null);
                  commitDrag(tech, startMin, endMin);
                }}
                onPointerCancel={() => setDrag(null)}
              >
                <div className="absolute inset-0">
                  {availabilityBands.map((segment) => {
                    const { leftPct, widthPct } = minutesBandPct(segment.startMinutes, segment.endMinutes);
                    return (
                      <div
                        key={`${segment.kind}-${segment.startMinutes}`}
                        className={cn(
                          "pointer-events-none absolute inset-y-0",
                          segment.kind === "available"
                            ? "bg-emerald-100/90 dark:bg-emerald-950/45"
                            : segment.kind === "unavailable"
                              ? "bg-slate-200/80 dark:bg-slate-800/80"
                              : "bg-white dark:bg-slate-950",
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                      />
                    );
                  })}
                  <div className="pointer-events-none absolute inset-0 flex">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="shrink-0 border-r border-slate-100/80 dark:border-slate-800/60"
                        style={{ width: HOUR_WIDTH_PX }}
                      />
                    ))}
                  </div>
                </div>

                {activeDrag ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-0 z-[2] border border-dashed",
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

                {pendingStartMin != null && pendingEndMin != null && pendingEndMin > pendingStartMin ? (() => {
                  const { leftPct, widthPct } = minutesBandPct(pendingStartMin, pendingEndMin, SCHEDULE_DAY_START_HOUR, SCHEDULE_DAY_END_HOUR, {
                    minSpanMinutes: 0,
                  });
                  return (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-y-1 z-[3] flex items-center gap-1.5 overflow-hidden",
                      "rounded-md border border-sky-400 bg-sky-100/90 px-2 text-sky-900 shadow-sm",
                      "dark:border-sky-500 dark:bg-sky-950/80 dark:text-sky-100",
                    )}
                    style={dayTimelineBandStyle(leftPct, widthPct)}
                    aria-busy
                    aria-label={t("creatingSchedule")}
                  >
                    <Loader2 className="size-3.5 shrink-0 animate-spin" strokeWidth={2.5} aria-hidden />
                    <span className="truncate text-[10px] font-semibold">{t("creatingSchedule")}</span>
                  </div>
                  );
                })() : null}

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
                      className="absolute inset-y-1 z-[1] min-h-0 rounded-md"
                      style={dayTimelineChipStyle(leftPct, widthPct, TIMELINE_CHIP_INSET_PX, TIMELINE_CHIP_GUTTER_PX)}
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
                      className="absolute inset-y-1 z-[1] min-h-0 rounded-md"
                      style={dayTimelineChipStyle(leftPct, widthPct, TIMELINE_CHIP_INSET_PX, TIMELINE_CHIP_GUTTER_PX)}
                      onOpen={() => onScheduleClick(schedule)}
                      onCopy={onCopySchedule ? () => onCopySchedule(schedule) : undefined}
                      onRemove={onRemoveSchedule ? () => onRemoveSchedule(schedule) : undefined}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
