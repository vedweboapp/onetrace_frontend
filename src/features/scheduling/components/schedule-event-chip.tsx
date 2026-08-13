"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import { formatTimeRange } from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  schedule: Schedule;
  onOpen: () => void;
  onRemove?: () => void;
  compact?: boolean;
  detailed?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function ScheduleEventChip({
  schedule,
  onOpen,
  onRemove,
  compact,
  detailed,
  className,
  style,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();

  return (
    <div
      data-schedule-chip
      className={cn(
        "group/chip relative overflow-hidden rounded-md border border-sky-300 bg-sky-50 text-left shadow-sm",
        "hover:border-sky-400 dark:border-sky-800 dark:bg-sky-950/40",
        className,
      )}
      style={style}
    >
      <button type="button" className="block w-full px-2 py-1.5 text-left" onClick={onOpen}>
        <p className="truncate pr-5 text-[11px] font-semibold text-sky-950 dark:text-sky-100">
          {schedule.job_title}
        </p>
        <p className="truncate text-[10px] text-sky-900/80 dark:text-sky-200/80">
          {schedule.all_day
            ? t("detail.allDay")
            : formatTimeRange(schedule.start_at, schedule.end_at, locale)}
        </p>
        {detailed ? (
          <>
            <p className="mt-1 truncate text-[10px] text-sky-900/80 dark:text-sky-200/80">
              {t("agenda.clientLine", { name: schedule.client_name || "—" })}
            </p>
            <p className="truncate text-[10px] text-sky-900/80 dark:text-sky-200/80">
              {t("agenda.assignToLine", { name: schedule.worker_name || "—" })}
            </p>
          </>
        ) : !compact ? (
          <p className="truncate text-[10px] text-sky-800/70 dark:text-sky-300/70">{schedule.client_name}</p>
        ) : null}
      </button>
      {onRemove ? (
        <button
          type="button"
          title={t("removeSchedule")}
          aria-label={t("removeSchedule")}
          className={cn(
            "absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded text-sky-800/70",
            "hover:bg-red-50 hover:text-red-600 dark:text-sky-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          <X className="size-3" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  );
}
