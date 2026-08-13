"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";

type Props = {
  hint?: string;
  className?: string;
};

function Swatch({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-medium leading-none text-slate-500 dark:text-slate-400">
      <span className={cn("size-2 shrink-0 rounded-sm ring-1 ring-black/5 dark:ring-white/10", className)} aria-hidden />
      {label}
    </span>
  );
}

export function SchedulingLegend({ hint, className }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  return (
    <div className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5", className)}>
      <Swatch className="bg-emerald-200 dark:bg-emerald-800" label={t("legendAvailable")} />
      <Swatch className="bg-slate-200 dark:bg-slate-700" label={t("legendUnavailable")} />
      <Swatch className="bg-sky-200 dark:bg-sky-800" label={t("legendScheduled")} />
      <Swatch className="bg-amber-200 dark:bg-amber-800" label={t("legendTimeOff")} />
      {hint ? <p className="text-[11px] text-slate-400 dark:text-slate-500">{hint}</p> : null}
    </div>
  );
}
