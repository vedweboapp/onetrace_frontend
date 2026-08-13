"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import {
  buildDayHourLabels,
  formatHourLabel,
  scheduleTimelineSpan,
  SCHEDULE_DAY_END_HOUR,
  SCHEDULE_DAY_START_HOUR,
} from "@/features/scheduling/utils/scheduling-time.util";
import {
  apiDateToKey,
  formatTimeRange,
  toDateKey,
} from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

const HOUR_WIDTH_PX = 72;
const ROW_HEIGHT_PX = 56;

type Props = {
  day: Date;
  technicians: SchedulingTechnician[];
  schedules: Schedule[];
  onCreateSchedule: (tech: SchedulingTechnician, day: Date) => void;
  onScheduleClick: (schedule: Schedule) => void;
  onWorkerClick: (tech: SchedulingTechnician) => void;
};

export function SchedulingDayTimeline({
  day,
  technicians,
  schedules,
  onCreateSchedule,
  onScheduleClick,
  onWorkerClick,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const dayKey = toDateKey(day);
  const hours = buildDayHourLabels();
  const timelineWidth = hours.length * HOUR_WIDTH_PX;

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

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max">
        <div className="sticky top-0 z-20 flex border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <div className="sticky left-0 z-30 w-[220px] shrink-0 border-r border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-950">
            <span className="text-xs font-bold uppercase tracking-wide text-slate-500">{t("workerColumn")}</span>
          </div>
          <div className="flex" style={{ width: timelineWidth }}>
            {hours.map((hour) => (
              <div
                key={hour}
                className="shrink-0 border-r border-slate-100 px-1 py-3 text-center text-[11px] font-semibold text-slate-500 dark:border-slate-800"
                style={{ width: HOUR_WIDTH_PX }}
              >
                {formatHourLabel(hour, locale)}
              </div>
            ))}
          </div>
        </div>

        {technicians.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">{t("emptyTechnicians")}</p>
        ) : (
          technicians.map((tech) => {
            const cellSchedules = schedulesByWorker.get(tech.id) ?? [];
            return (
              <div
                key={tech.id}
                className="group/row flex border-b border-slate-100 dark:border-slate-800/80"
                style={{ minHeight: ROW_HEIGHT_PX }}
              >
                <div className="sticky left-0 z-10 flex w-[220px] shrink-0 items-start gap-2 border-r border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-950">
                  <div
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
                    aria-hidden
                  >
                    {tech.initials}
                  </div>
                  <div className="min-w-0">
                    <button
                      type="button"
                      className="truncate text-left text-sm font-semibold text-sky-700 hover:underline dark:text-sky-400"
                      onClick={() => onWorkerClick(tech)}
                    >
                      {tech.name}
                    </button>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">{tech.title}</p>
                  </div>
                </div>

                <div
                  className="group/cell relative shrink-0 hover:bg-sky-50/60 dark:hover:bg-sky-950/20"
                  style={{ width: timelineWidth, minHeight: ROW_HEIGHT_PX }}
                >
                  <div className="pointer-events-none absolute inset-0 flex">
                    {hours.map((hour) => (
                      <div
                        key={hour}
                        className="shrink-0 border-r border-slate-100 dark:border-slate-800/60"
                        style={{ width: HOUR_WIDTH_PX }}
                      />
                    ))}
                  </div>

                  {cellSchedules.map((schedule) => {
                    const { leftPct, widthPct } = scheduleTimelineSpan(
                      schedule.start_at,
                      schedule.end_at,
                      SCHEDULE_DAY_START_HOUR,
                      SCHEDULE_DAY_END_HOUR,
                    );
                    return (
                      <button
                        key={schedule.id}
                        type="button"
                        className={cn(
                          "absolute top-1.5 z-[1] h-[calc(100%-12px)] min-h-[40px] overflow-hidden rounded-md border px-2 py-1 text-left shadow-sm",
                          "border-sky-300 bg-sky-100 hover:border-sky-400 hover:bg-sky-200/90",
                          "dark:border-sky-800 dark:bg-sky-950/70 dark:hover:bg-sky-900/80",
                        )}
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        onClick={() => onScheduleClick(schedule)}
                      >
                        <p className="truncate text-[11px] font-semibold text-sky-950 dark:text-sky-100">
                          {schedule.job_title}
                        </p>
                        <p className="truncate text-[10px] text-sky-900/80 dark:text-sky-200/80">
                          {schedule.all_day
                            ? t("detail.allDay")
                            : formatTimeRange(schedule.start_at, schedule.end_at, locale)}
                        </p>
                      </button>
                    );
                  })}

                  <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-2 opacity-0 transition group-hover/cell:opacity-100">
                    <button
                      type="button"
                      className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-sky-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-sky-700"
                      onClick={() => onCreateSchedule(tech, day)}
                    >
                      <Plus className="size-3.5" strokeWidth={2.25} />
                      {t("createSchedule")}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
