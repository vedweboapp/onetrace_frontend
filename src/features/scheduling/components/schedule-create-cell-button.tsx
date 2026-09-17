"use client";

import { ClipboardPaste, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";

type Props = {
  onClick: () => void;
  /** Day view only — paste a copied schedule onto this worker. Omit on week/month. */
  onPaste?: () => void;
  pasteDisabled?: boolean;
  className?: string;
  iconOnly?: boolean;
};

export function ScheduleCreateCellButton({
  onClick,
  onPaste,
  pasteDisabled,
  className,
  iconOnly,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const createButton = (
    <button
      type="button"
      title={t("createSchedule")}
      aria-label={t("createSchedule")}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-full bg-sky-600 text-white shadow-sm transition",
        "hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
        !iconOnly && !onPaste && "sm:h-7 sm:w-auto sm:gap-1 sm:rounded-md sm:px-2",
        !onPaste && className,
      )}
      onClick={onClick}
    >
      <Plus className="size-3.5" strokeWidth={2.25} aria-hidden />
      {!iconOnly && !onPaste ? (
        <span className="hidden text-[11px] font-semibold sm:inline">{t("createSchedule")}</span>
      ) : null}
    </button>
  );

  if (!onPaste) return createButton;

  return (
    <div className={cn("inline-flex items-center gap-1", className)}>
      {createButton}
      <button
        type="button"
        disabled={pasteDisabled}
        title={t("copy.pasteHere")}
        aria-label={t("copy.pasteHere")}
        className={cn(
          "inline-flex size-7 items-center justify-center rounded-full border border-sky-400 bg-white text-sky-700 shadow-sm transition",
          "hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-sky-600 dark:bg-slate-950 dark:text-sky-200 dark:hover:bg-sky-950",
        )}
        onClick={onPaste}
      >
        <ClipboardPaste className="size-3.5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
