"use client";

import * as React from "react";
import { ChevronLeft, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import type { SchedulingPeopleListMode } from "@/features/scheduling/utils/scheduling-people-row.util";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

/** Shared checkbox gutter so header select-all lines up with row checkboxes. */
export const SCHEDULING_PEOPLE_CHECKBOX_GUTTER_CLASS =
  "inline-flex w-5 shrink-0 items-center justify-center";

type Props = {
  search: string;
  focusedWorker?: SchedulingTechnician | null;
  onBack?: () => void;
  onSearchChange: (value: string) => void;
  peopleListMode: SchedulingPeopleListMode;
  onPeopleListModeChange: (mode: SchedulingPeopleListMode) => void;
  selectedCount?: number;
  allVisibleSelected?: boolean;
  someVisibleSelected?: boolean;
  onToggleSelectAll?: () => void;
  onScheduleSelected?: () => void;
  scheduleBusy?: boolean;
  allowBulkSchedule?: boolean;
};

export function SchedulingPeopleHeader({
  search,
  focusedWorker,
  onBack,
  onSearchChange,
  peopleListMode,
  onPeopleListModeChange,
  selectedCount = 0,
  allVisibleSelected = false,
  someVisibleSelected = false,
  onToggleSelectAll,
  onScheduleSelected,
  scheduleBusy = false,
  allowBulkSchedule = true,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const expanded = searchOpen || search.trim() !== "";
  const showBulk = allowBulkSchedule && !focusedWorker;
  const searchLabel = peopleListMode === "groups" ? t("searchGroups") : t("searchUsers");

  React.useEffect(() => {
    if (!expanded) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [expanded]);

  if (focusedWorker) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        {onBack ? (
          <button
            type="button"
            title={t("backToUsers")}
            aria-label={t("backToUsers")}
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600",
              "hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
            onClick={onBack}
          >
            <ChevronLeft className="size-4" strokeWidth={2.25} />
          </button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900"
            aria-hidden
          >
            {focusedWorker.initials}
          </div>
          <p className="min-w-0 truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {focusedWorker.name}
            {focusedWorker.title ? (
              <span className="font-normal text-slate-500 dark:text-slate-400"> · {focusedWorker.title}</span>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-0 flex-col gap-1.5">
      <div className="flex w-full min-w-0 items-center gap-1.5">
        {showBulk && onToggleSelectAll ? (
          <span className={SCHEDULING_PEOPLE_CHECKBOX_GUTTER_CLASS}>
            <input
              type="checkbox"
              className="size-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              checked={allVisibleSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
              }}
              onChange={onToggleSelectAll}
              aria-label={
                peopleListMode === "groups" ? t("bulk.selectAllGroups") : t("bulk.selectAll")
              }
              title={peopleListMode === "groups" ? t("bulk.selectAllGroups") : t("bulk.selectAll")}
            />
          </span>
        ) : null}

        <div
          role="group"
          aria-label={t("peopleListModeAria")}
          className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-700 dark:bg-slate-800/90"
        >
          <button
            type="button"
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold transition",
              peopleListMode === "users"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
            )}
            aria-pressed={peopleListMode === "users"}
            onClick={() => onPeopleListModeChange("users")}
          >
            {t("usersColumn")}
          </button>
          <button
            type="button"
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold transition",
              peopleListMode === "groups"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-50"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100",
            )}
            aria-pressed={peopleListMode === "groups"}
            onClick={() => onPeopleListModeChange("groups")}
          >
            {t("groupsColumn")}
          </button>
        </div>

        {expanded ? (
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              placeholder={searchLabel}
              aria-label={searchLabel}
              className="h-8 w-full rounded-md border border-slate-200 bg-white pl-7 pr-8 text-xs dark:border-slate-700 dark:bg-slate-900"
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  onSearchChange("");
                  setSearchOpen(false);
                }
              }}
            />
            <button
              type="button"
              className="absolute right-1 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:text-slate-700"
              aria-label={t("closeSearch")}
              onClick={() => {
                onSearchChange("");
                setSearchOpen(false);
              }}
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            title={searchLabel}
            aria-label={searchLabel}
            className={cn(
              "ml-auto inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500",
              "hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
            )}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>

      {showBulk && selectedCount > 0 && onScheduleSelected ? (
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 pl-0">
          <AppButton
            type="button"
            size="sm"
            className="h-7 px-2.5 text-[11px]"
            loading={scheduleBusy}
            disabled={scheduleBusy}
            onClick={onScheduleSelected}
          >
            {peopleListMode === "groups"
              ? t("bulk.scheduleSelectedGroups", { count: selectedCount })
              : t("bulk.scheduleSelected", { count: selectedCount })}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}
