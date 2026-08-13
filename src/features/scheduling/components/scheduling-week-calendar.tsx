"use client";

import * as React from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  availabilityHeaderBarClass,
  availabilityToneClass,
  buildDayTimeSegments,
  dayTone,
  formatMinutesLabel,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  isRangeFree,
  isRangeWithinAvailability,
  minuteIsBookable,
  minutesToTime,
  occupiedRangesForDay,
} from "@/features/scheduling/utils/scheduling-availability.util";
import {
  formatHourLabel,
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
} from "@/features/scheduling/utils/scheduling-time.util";
import { formatWeekdayShort, isSameLocalDay, toDateKey } from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

const HOUR_PX = 48;
const MIN_HOUR_PX = 40;
const TOP_PAD = 14;
const TIME_COL_PX = 72;
const START_HOUR = SCHEDULE_DAY_START_HOUR;
const END_HOUR = SCHEDULE_DAY_END_HOUR;

type Props = {
  days: Date[];
  technician: SchedulingTechnician;
  schedules: Schedule[];
  timeOffs: WorkerTimeOff[];
  dragMode?: "book" | "timeoff";
  hideDayHeaders?: boolean;
  fillHeight?: boolean;
  onDayHeaderClick?: (day: Date) => void;
  onCreate: (day: Date, startTime: string, endTime: string) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
};

type DragState = {
  dayKey: string;
  startMin: number;
  endMin: number;
};

function timezoneLabel() {
  const offset = -new Date().getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hours = String(Math.floor(abs / 60)).padStart(2, "0");
  const minutes = String(abs % 60).padStart(2, "0");
  return `GMT${sign}${hours}:${minutes}`;
}

export function SchedulingWeekCalendar({
  days,
  technician,
  schedules,
  timeOffs,
  dragMode = "book",
  hideDayHeaders = false,
  fillHeight = false,
  onDayHeaderClick,
  onCreate,
  onScheduleClick,
  onRemoveSchedule,
  onRemoveTimeOff,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const [drag, setDrag] = React.useState<DragState | null>(null);

  const hours = React.useMemo(() => {
    const list: number[] = [];
    for (let hour = START_HOUR; hour < END_HOUR; hour += 1) list.push(hour);
    return list;
  }, []);
  const labelHours = React.useMemo(() => [...hours, END_HOUR], [hours]);

  const totalMinutes = (END_HOUR - START_HOUR) * 60;
  const hourPx = fillHeight ? MIN_HOUR_PX : HOUR_PX;
  const gridHeight = hours.length * hourPx;

  const dayModels = React.useMemo(() => {
    return days.map((day) => {
      const dayKey = toDateKey(day);
      const window = getDayAvailabilityWindow(technician.availableDays, day);
      const known = hasAvailabilityData(technician.availableDays);
      const daySchedules = schedules.filter((row) => row.worker_id === technician.id);
      const dayTimeOffs = timeOffs.filter((row) => row.worker_id === technician.id);
      const occupied = [...occupiedRangesForDay(daySchedules, dayKey), ...occupiedRangesForDay(dayTimeOffs, dayKey)];
      const segments = buildDayTimeSegments({
        dayKey,
        window,
        knownAvailability: known,
        schedules: daySchedules,
        timeOffs: dayTimeOffs,
        spanStartMinutes: START_HOUR * 60,
        spanEndMinutes: END_HOUR * 60,
      });
      return { day, dayKey, window, known, segments, occupied };
    });
  }, [days, technician, schedules, timeOffs]);

  function timeFromClientY(clientY: number, track: HTMLElement): number {
    const rect = track.getBoundingClientRect();
    const ratio = rect.height <= 0 ? 0 : Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    const minutes = START_HOUR * 60 + Math.round((ratio * totalMinutes) / 15) * 15;
    return Math.min(END_HOUR * 60 - 15, Math.max(START_HOUR * 60, minutes));
  }

  function canStartAt(model: (typeof dayModels)[number], minute: number) {
    if (dragMode === "timeoff") {
      if (model.known && !model.window) return false;
      return isRangeFree(minute, minute + 15, model.occupied);
    }
    return minuteIsBookable(minute, model.window, model.known, model.occupied);
  }

  function rangeValid(model: (typeof dayModels)[number], startMin: number, endMin: number) {
    const start = Math.min(startMin, endMin);
    const end = Math.max(startMin, endMin);
    if (end - start < 15) return false;
    if (!isRangeFree(start, end, model.occupied)) return false;
    if (dragMode === "book") return isRangeWithinAvailability(start, end, model.window, model.known);
    if (model.known && !model.window) return false;
    return true;
  }

  const colTemplate = `${TIME_COL_PX}px repeat(${days.length}, minmax(0, 1fr))`;
  const labelCount = Math.max(1, labelHours.length - 1);

  function bandStyle(startMin: number, endMin: number): React.CSSProperties {
    if (fillHeight) {
      const start = ((startMin - START_HOUR * 60) / totalMinutes) * 100;
      const span = Math.max(1.5, ((endMin - startMin) / totalMinutes) * 100);
      return { top: `${start}%`, height: `${span}%` };
    }
    return {
      top: ((startMin - START_HOUR * 60) / totalMinutes) * gridHeight,
      height: Math.max(18, ((endMin - startMin) / totalMinutes) * gridHeight),
    };
  }

  return (
    <div className={cn("min-h-0 flex-1", fillHeight ? "flex flex-col overflow-hidden" : "overflow-auto")}>
      <div
        className={cn(
          fillHeight ? "flex min-h-0 flex-1 flex-col" : null,
          days.length === 1 ? "min-w-0 w-full" : "min-w-[720px]",
        )}
      >
        {hideDayHeaders ? null : (
          <div
            className="sticky top-0 z-20 grid shrink-0 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
            style={{ gridTemplateColumns: colTemplate }}
          >
            <div className="flex items-end justify-end border-r border-slate-200 px-3 pb-2 text-[10px] font-semibold text-slate-400 dark:border-slate-800">
              {timezoneLabel()}
            </div>
            {dayModels.map((model) => {
              const isToday = isSameLocalDay(model.day, new Date());
              const tone = dayTone(model.window, model.known, model.occupied);
              return (
                <button
                  key={model.dayKey}
                  type="button"
                  className="flex min-w-0 flex-col overflow-hidden border-r border-slate-200 text-center last:border-r-0 dark:border-slate-800"
                  onClick={() => onDayHeaderClick?.(model.day)}
                >
                  <span className={cn("block h-1.5 w-full shrink-0", availabilityHeaderBarClass(tone))} />
                  <span
                    className={cn(
                      "px-2 py-2",
                      availabilityToneClass(tone) || (isToday ? "bg-sky-50 dark:bg-sky-950/30" : ""),
                    )}
                  >
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      {formatWeekdayShort(model.day, locale)}
                    </span>
                    <span
                      className={cn(
                        "mx-auto mt-1 inline-flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                        isToday ? "bg-sky-600 text-white" : "text-slate-800 dark:text-slate-100",
                      )}
                    >
                      {model.day.getDate()}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className={cn(fillHeight && "min-h-0 flex-1 overflow-auto")}>
        <div
          className={cn("grid", fillHeight && "h-full")}
          style={{
            gridTemplateColumns: colTemplate,
            minHeight: fillHeight ? gridHeight : gridHeight + TOP_PAD + 16,
          }}
        >
          <div
            className="relative border-r border-slate-200 dark:border-slate-800"
            style={fillHeight ? undefined : { height: gridHeight + TOP_PAD + 16 }}
          >
            {labelHours.map((hour, index) => (
              <div
                key={hour}
                className={cn(
                  "absolute right-2 text-[11px] font-medium tabular-nums text-slate-500",
                  fillHeight
                    ? index === 0
                      ? "top-1"
                      : index === labelCount
                        ? "bottom-1 top-auto"
                        : "-translate-y-1/2"
                    : "-translate-y-1/2",
                )}
                style={
                  fillHeight
                    ? index === 0 || index === labelCount
                      ? undefined
                      : { top: `${(index / labelCount) * 100}%` }
                    : { top: TOP_PAD + index * hourPx }
                }
              >
                {formatHourLabel(hour, locale)}
              </div>
            ))}
          </div>

          {dayModels.map((model) => {
            const activeDrag = drag?.dayKey === model.dayKey ? drag : null;
            const dragStart = activeDrag ? Math.min(activeDrag.startMin, activeDrag.endMin) : 0;
            const dragEnd = activeDrag ? Math.max(activeDrag.startMin, activeDrag.endMin) : 0;
            const dragOk = activeDrag ? rangeValid(model, dragStart, dragEnd) : false;
            return (
              <div
                key={model.dayKey}
                className="relative cursor-crosshair border-r border-slate-100 last:border-r-0 dark:border-slate-800/80"
                style={
                  fillHeight
                    ? undefined
                    : { height: gridHeight, marginTop: TOP_PAD }
                }
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  if ((e.target as HTMLElement).closest("button")) return;
                  const startMin = timeFromClientY(e.clientY, e.currentTarget);
                  if (!canStartAt(model, startMin)) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setDrag({ dayKey: model.dayKey, startMin, endMin: startMin + 15 });
                }}
                onPointerMove={(e) => {
                  if (!drag || drag.dayKey !== model.dayKey) return;
                  setDrag({
                    ...drag,
                    endMin: timeFromClientY(e.clientY, e.currentTarget),
                  });
                }}
                onPointerUp={(e) => {
                  if (!drag || drag.dayKey !== model.dayKey) return;
                  const start = Math.min(drag.startMin, drag.endMin);
                  const end = Math.max(drag.startMin, drag.endMin);
                  const valid = rangeValid(model, start, end);
                  setDrag(null);
                  if (!valid) return;
                  onCreate(model.day, minutesToTime(start), minutesToTime(Math.max(end, start + 15)));
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={() => setDrag(null)}
              >
                {hours.map((hour, index) => (
                  <div
                    key={hour}
                    className="pointer-events-none absolute inset-x-0 border-t border-slate-100 dark:border-slate-800/70"
                    style={
                      fillHeight
                        ? { top: `${(index / hours.length) * 100}%`, height: `${100 / hours.length}%` }
                        : { top: index * hourPx, height: hourPx }
                    }
                  />
                ))}

                {model.segments.map((segment) => {
                  const style = bandStyle(segment.startMinutes, segment.endMinutes);
                  if (segment.kind === "available" || segment.kind === "unavailable") {
                    return (
                      <div
                        key={`${segment.kind}-${segment.startMinutes}`}
                        className={cn(
                          "pointer-events-none absolute inset-x-1 rounded-sm",
                          segment.kind === "available"
                            ? "bg-emerald-100/80 dark:bg-emerald-950/35"
                            : "bg-slate-200/70 dark:bg-slate-800/55",
                        )}
                        style={style}
                      />
                    );
                  }
                  if (segment.kind === "timeoff" && segment.timeOff) {
                    return (
                      <div
                        key={`off-${segment.timeOff.id}-${segment.startMinutes}`}
                        className="absolute inset-x-1 z-[1] overflow-hidden rounded-md border border-amber-300 bg-amber-100 px-1.5 py-1 text-left dark:border-amber-800 dark:bg-amber-950/60"
                        style={style}
                      >
                        <p className="truncate pr-4 text-[11px] font-semibold text-amber-950 dark:text-amber-100">
                          {segment.timeOff.reason || t("legendTimeOff")}
                        </p>
                        <p className="truncate text-[10px] text-amber-800/80">
                          {formatMinutesLabel(segment.startMinutes, locale)} –{" "}
                          {formatMinutesLabel(segment.endMinutes, locale)}
                        </p>
                        {onRemoveTimeOff ? (
                          <button
                            type="button"
                            title={t("timeOff.remove")}
                            aria-label={t("timeOff.remove")}
                            className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded text-amber-800/70 hover:bg-red-50 hover:text-red-600 dark:text-amber-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                            onClick={() => onRemoveTimeOff(segment.timeOff!)}
                          >
                            <X className="size-3" strokeWidth={2.5} />
                          </button>
                        ) : null}
                      </div>
                    );
                  }
                  if (segment.kind === "scheduled" && segment.schedule) {
                    return (
                      <div
                        key={`job-${segment.schedule.id}-${segment.startMinutes}`}
                        className="absolute inset-x-1 z-[1] overflow-hidden rounded-md border border-sky-300 bg-sky-200 px-1.5 py-1 text-left shadow-sm dark:border-sky-800 dark:bg-sky-900/70"
                        style={style}
                      >
                        <button
                          type="button"
                          className="block w-full truncate text-left"
                          onClick={() => onScheduleClick(segment.schedule!)}
                        >
                          <p className="truncate pr-4 text-[11px] font-semibold text-sky-950 dark:text-sky-100">
                            {segment.schedule.job_title}
                          </p>
                          <p className="truncate text-[10px] text-sky-800/80 dark:text-sky-200/80">
                            {formatMinutesLabel(segment.startMinutes, locale)} –{" "}
                            {formatMinutesLabel(segment.endMinutes, locale)}
                          </p>
                          <p className="truncate text-[10px] text-sky-800/70">{segment.schedule.client_name}</p>
                        </button>
                        {onRemoveSchedule ? (
                          <button
                            type="button"
                            title={t("removeSchedule")}
                            aria-label={t("removeSchedule")}
                            className="absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded text-sky-800/70 hover:bg-red-50 hover:text-red-600 dark:text-sky-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300"
                            onClick={() => onRemoveSchedule(segment.schedule!)}
                          >
                            <X className="size-3" strokeWidth={2.5} />
                          </button>
                        ) : null}
                      </div>
                    );
                  }
                  return null;
                })}

                {activeDrag ? (
                  <div
                    className={cn(
                      "pointer-events-none absolute inset-x-1 z-[2] rounded-md border px-1.5 py-1 text-[10px] font-semibold",
                      dragOk
                        ? dragMode === "timeoff"
                          ? "border-amber-400 bg-amber-200/80 text-amber-950"
                          : "border-sky-400 bg-sky-200/80 text-sky-950"
                        : "border-red-400 bg-red-100/80 text-red-800",
                    )}
                    style={bandStyle(dragStart, dragEnd)}
                  >
                    {formatMinutesLabel(dragStart, locale)} – {formatMinutesLabel(dragEnd, locale)}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );
}
