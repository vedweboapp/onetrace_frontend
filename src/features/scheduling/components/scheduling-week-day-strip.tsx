"use client";

import * as React from "react";
import { Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Schedule, WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { technicianMatchesWorkerId } from "@/features/scheduling/utils/scheduling-technician.util";
import { scheduleJobLabel } from "@/features/scheduling/utils/schedule-map.util";
import {
  buildDayTimeSegments,
  formatMinutesRange,
  getDayAvailabilityWindow,
  hasAvailabilityData,
  minutesToTime,
  timeToMinutes,
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
  pendingCreate?: {
    techId: number;
    dayKey: string;
    startTime: string;
    endTime: string;
  } | null;
  createBusy?: boolean;
  onScheduleClick: (schedule: Schedule) => void;
  onRemoveSchedule?: (schedule: Schedule) => void;
  onRemoveTimeOff?: (timeOff: WorkerTimeOff) => void;
};

function snapMinutes(value: number, lo: number, hi: number) {
  const snapped = Math.round(value / 15) * 15;
  return Math.min(hi, Math.max(lo, snapped));
}

function minutesFromClientY(el: HTMLElement, clientY: number, segStart: number, segEnd: number) {
  const rect = el.getBoundingClientRect();
  const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / Math.max(rect.height, 1)));
  return snapMinutes(segStart + ratio * (segEnd - segStart), segStart, segEnd);
}

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
  pendingCreate = null,
  createBusy = false,
  onScheduleClick,
  onRemoveSchedule,
  onRemoveTimeOff,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const [slotDrag, setSlotDrag] = React.useState<{
    segStart: number;
    segEnd: number;
    startMinutes: number;
    endMinutes: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const slotDragRef = React.useRef(slotDrag);
  slotDragRef.current = slotDrag;
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
      <div className="flex h-full min-h-[4.5rem] w-full items-center justify-center rounded-md bg-slate-100 text-[10px] font-medium text-slate-400 dark:bg-slate-800/70">
        {t("offDuty")}
      </div>
    );
  }

  if (segments.length === 0) {
    return <div className="h-full min-h-[4.5rem] w-full rounded-md" />;
  }

  const hasBlocks = schedules.length > 0 || timeOffs.length > 0;

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-md",
        hasBlocks ? "min-h-[7.5rem]" : "min-h-[4.5rem]",
      )}
    >
      {segments.map((segment) => {
        const flexGrow = Math.max(15, segment.endMinutes - segment.startMinutes);
        const label = formatMinutesRange(segment.startMinutes, segment.endMinutes, locale);
        const minHeight =
          segment.kind === "scheduled" || segment.kind === "timeoff"
            ? 44
            : Math.max(12, (flexGrow / Math.max(total, 1)) * (hasBlocks ? 120 : 72));

        if (segment.kind === "scheduled" && segment.schedule) {
          return (
            <div
              key={`job-${segment.schedule.id}-${segment.startMinutes}`}
              className={cn("group/job relative flex min-h-0 flex-col justify-center overflow-hidden px-1 py-0.5", KIND_CLASS.scheduled)}
              style={{ flexGrow, flexBasis: 0, minHeight }}
            >
              <button type="button" className="block w-full truncate text-left" onClick={() => onScheduleClick(segment.schedule!)}>
                <span className="block truncate pr-4 text-[10px] font-semibold leading-tight">{scheduleJobLabel(segment.schedule)}</span>
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

        const canDragBook = segment.kind === "available" && Boolean(onCreate) && !createBusy;
        const draggingThis =
          slotDrag != null &&
          slotDrag.segStart === segment.startMinutes &&
          slotDrag.segEnd === segment.endMinutes;
        const pendingHere =
          pendingCreate &&
          pendingCreate.dayKey === dayKey &&
          technicianMatchesWorkerId(tech, pendingCreate.techId)
            ? pendingCreate
            : null;
        const pendingStart = pendingHere ? timeToMinutes(pendingHere.startTime) : null;
        const pendingEnd = pendingHere ? timeToMinutes(pendingHere.endTime) : null;
        const pendingOverlapsSegment =
          pendingStart != null &&
          pendingEnd != null &&
          pendingStart < segment.endMinutes &&
          pendingEnd > segment.startMinutes;
        const pendingTopPct =
          pendingOverlapsSegment && pendingStart != null && pendingEnd != null
            ? ((Math.max(pendingStart, segment.startMinutes) - segment.startMinutes) /
                Math.max(segment.endMinutes - segment.startMinutes, 1)) *
              100
            : 0;
        const pendingHeightPct =
          pendingOverlapsSegment && pendingStart != null && pendingEnd != null
            ? ((Math.min(pendingEnd, segment.endMinutes) - Math.max(pendingStart, segment.startMinutes)) /
                Math.max(segment.endMinutes - segment.startMinutes, 1)) *
              100
            : 0;
        const title =
          segment.kind === "available"
            ? `${t("legendAvailable")} · ${label}`
            : segment.kind === "unavailable"
              ? t("offDuty")
              : undefined;
        const dragLo = draggingThis ? Math.min(slotDrag.startMinutes, slotDrag.endMinutes) : 0;
        const dragHi = draggingThis ? Math.max(slotDrag.startMinutes, slotDrag.endMinutes) : 0;
        const dragTopPct = draggingThis
          ? ((dragLo - segment.startMinutes) / Math.max(segment.endMinutes - segment.startMinutes, 1)) * 100
          : 0;
        const dragHeightPct = draggingThis
          ? ((dragHi - dragLo) / Math.max(segment.endMinutes - segment.startMinutes, 1)) * 100
          : 0;

        return (
          <div
            key={`${segment.kind}-${segment.startMinutes}-${segment.endMinutes}`}
            className={cn(
              "relative flex min-h-0 flex-col justify-center overflow-hidden px-1 py-0.5",
              KIND_CLASS[segment.kind],
              canDragBook && "cursor-crosshair touch-none select-none",
            )}
            style={{ flexGrow, flexBasis: 0, minHeight }}
            title={title}
            onPointerDown={
              canDragBook
                ? (e) => {
                    if (e.button !== 0) return;
                    e.preventDefault();
                    const slot = e.currentTarget;
                    slot.setPointerCapture(e.pointerId);
                    const at = minutesFromClientY(slot, e.clientY, segment.startMinutes, segment.endMinutes);
                    setSlotDrag({
                      segStart: segment.startMinutes,
                      segEnd: segment.endMinutes,
                      startMinutes: at,
                      endMinutes: Math.min(segment.endMinutes, at + 15),
                      originY: e.clientY,
                      moved: false,
                    });
                  }
                : undefined
            }
            onPointerMove={
              canDragBook
                ? (e) => {
                    if (!slotDragRef.current) return;
                    const at = minutesFromClientY(
                      e.currentTarget,
                      e.clientY,
                      segment.startMinutes,
                      segment.endMinutes,
                    );
                    setSlotDrag((prev) =>
                      prev
                        ? {
                            ...prev,
                            endMinutes: at,
                            moved: prev.moved || Math.abs(e.clientY - prev.originY) > 6,
                          }
                        : prev,
                    );
                  }
                : undefined
            }
            onPointerUp={
              canDragBook
                ? () => {
                    const drag = slotDragRef.current;
                    setSlotDrag(null);
                    if (!drag) return;
                    // Click (no drag): book a 1h slot from the press point. Stay on week view.
                    const startMin = drag.moved
                      ? Math.min(drag.startMinutes, drag.endMinutes)
                      : drag.startMinutes;
                    const endMin = drag.moved
                      ? Math.max(drag.startMinutes, drag.endMinutes, startMin + 15)
                      : Math.min(drag.segEnd, startMin + 60);
                    onCreate?.(
                      minutesToTime(startMin),
                      minutesToTime(Math.min(Math.max(endMin, startMin + 15), drag.segEnd)),
                    );
                  }
                : undefined
            }
            onPointerCancel={canDragBook ? () => setSlotDrag(null) : undefined}
          >
            {draggingThis ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-[1] bg-sky-400/45 ring-1 ring-inset ring-sky-500/40"
                style={{ top: `${dragTopPct}%`, height: `${Math.max(dragHeightPct, 8)}%` }}
              />
            ) : null}
            {pendingOverlapsSegment ? (
              <div
                className={cn(
                  "pointer-events-none absolute inset-x-0.5 z-[2] flex items-center justify-center gap-1",
                  "rounded-sm border border-sky-400 bg-sky-100/95 text-sky-900",
                  "dark:border-sky-500 dark:bg-sky-950/85 dark:text-sky-100",
                )}
                style={{ top: `${pendingTopPct}%`, height: `${Math.max(pendingHeightPct, 12)}%` }}
                aria-busy
                aria-label={t("creatingSchedule")}
              >
                <Loader2 className="size-3.5 animate-spin" strokeWidth={2.5} aria-hidden />
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
