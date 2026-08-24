"use client";

import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { WorkerTimeOff } from "@/features/scheduling/types/schedule.types";
import { formatTimeRange } from "@/features/scheduling/utils/scheduling-week.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  timeOff: WorkerTimeOff;
  onRemove?: () => void;
  compact?: boolean;
  detailed?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function TimeOffChip({ timeOff, onRemove, compact, detailed, className, style }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const locale = useLocale();
  const label = timeOff.reason.trim() || t("timeOff.blocked");

  return (
    <div
      data-timeoff-chip
      className={cn(
        "group/chip relative overflow-hidden border border-amber-300 bg-amber-50 text-left shadow-sm",
        "dark:border-amber-800 dark:bg-amber-950/40",
        compact ? "rounded-none" : "rounded-md",
        className,
      )}
      style={style}
    >
      <div className={cn("block h-full w-full px-2 text-left", compact ? "py-1" : "py-1.5")}>
        <p className="truncate pr-5 text-[11px] font-semibold text-amber-950 dark:text-amber-100">{label}</p>
        <p className="truncate text-[10px] text-amber-900/80 dark:text-amber-200/80">
          {formatTimeRange(timeOff.start_at, timeOff.end_at, locale)}
        </p>
        {detailed ? (
          <p className="mt-1 truncate text-[10px] text-amber-900/80 dark:text-amber-200/80">
            {t("agenda.assignToLine", { name: timeOff.worker_name || "—" })}
          </p>
        ) : !compact && timeOff.reason.trim() ? (
          <p className="truncate text-[10px] text-amber-800/70 dark:text-amber-300/70">{t("legendTimeOff")}</p>
        ) : null}
      </div>
      {onRemove ? (
        <button
          type="button"
          title={t("timeOff.remove")}
          aria-label={t("timeOff.remove")}
          className={cn(
            "absolute right-1 top-1 inline-flex size-5 items-center justify-center rounded text-amber-800/70",
            "hover:bg-red-50 hover:text-red-600 dark:text-amber-200/80 dark:hover:bg-red-950/50 dark:hover:text-red-300",
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
