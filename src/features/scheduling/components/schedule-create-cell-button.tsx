"use client";

import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";

type Props = {
  onClick: () => void;
  className?: string;
  iconOnly?: boolean;
};

export function ScheduleCreateCellButton({ onClick, className, iconOnly }: Props) {
  const t = useTranslations("Dashboard.scheduling");
  return (
    <button
      type="button"
      title={t("createSchedule")}
      aria-label={t("createSchedule")}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm transition",
        "hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
        !iconOnly && "sm:h-7 sm:w-auto sm:gap-1 sm:rounded-md sm:px-2",
        className,
      )}
      onClick={onClick}
    >
      <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
      {!iconOnly ? <span className="hidden text-[11px] font-semibold sm:inline">{t("createSchedule")}</span> : null}
    </button>
  );
}
