"use client";

import * as React from "react";
import { ChevronLeft, Search, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { CheckmarkSelect } from "@/shared/ui";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import type { SchedulingTechnician } from "@/features/scheduling/utils/scheduling-technician.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  groupOptions: CheckmarkSelectOption[];
  groupValue: string;
  search: string;
  focusedWorker?: SchedulingTechnician | null;
  prominent?: boolean;
  onBack?: () => void;
  onGroupChange: (value: string) => void;
  onSearchChange: (value: string) => void;
};

export function SchedulingPeopleHeader({
  groupOptions,
  groupValue,
  search,
  focusedWorker,
  prominent = false,
  onBack,
  onGroupChange,
  onSearchChange,
}: Props) {
  const t = useTranslations("Dashboard.scheduling");
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const expanded = searchOpen || search.trim() !== "";

  React.useEffect(() => {
    if (!expanded) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [expanded]);

  if (focusedWorker) {
    return (
      <div className={cn("flex min-w-0 items-center gap-2", prominent && "gap-3")}>
        {onBack ? (
          <button
            type="button"
            title={t("backToUsers")}
            aria-label={t("backToUsers")}
            className={cn(
              "inline-flex shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600",
              prominent ? "size-8" : "size-7",
              "hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
            )}
            onClick={onBack}
          >
            <ChevronLeft className={prominent ? "size-5" : "size-4"} strokeWidth={2.25} />
          </button>
        ) : null}
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-slate-800 font-semibold uppercase text-white dark:bg-slate-200 dark:text-slate-900",
              prominent ? "size-9 text-sm" : "size-7 text-[10px]",
            )}
            aria-hidden
          >
            {focusedWorker.initials}
          </div>
          <p
            className={cn(
              "min-w-0 truncate font-semibold text-slate-800 dark:text-slate-100",
              prominent ? "text-sm" : "text-[13px]",
            )}
          >
            {focusedWorker.name}
            {focusedWorker.title ? (
              <span className="font-normal text-slate-500 dark:text-slate-400"> · {focusedWorker.title}</span>
            ) : null}
          </p>
        </div>
      </div>
    );
  }

  const groupLabel = groupOptions.find((opt) => opt.value === groupValue)?.label ?? t("allUserGroups");

  const groupButton = (
    <div className="relative size-8 shrink-0" title={groupLabel}>
      <CheckmarkSelect
        listLabel={t("allUserGroups")}
        buttonAriaLabel={groupLabel}
        options={groupOptions}
        value={groupValue}
        searchable
        portaled
        size="sm"
        menuMinWidth={280}
        emptyLabel=" "
        className={cn(
          "absolute inset-0 w-8",
          "[&_button]:size-8 [&_button]:min-h-8 [&_button]:w-8 [&_button]:justify-center [&_button]:px-0",
          "[&_button>span]:invisible [&_button>svg]:hidden",
          groupValue && "[&_button]:border-sky-400 [&_button]:bg-sky-50 dark:[&_button]:border-sky-700 dark:[&_button]:bg-sky-950/40",
        )}
        onChange={onGroupChange}
      />
      <Users className="pointer-events-none absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-300" />
      {groupValue ? (
        <span className="pointer-events-none absolute right-0.5 top-0.5 size-1.5 rounded-full bg-sky-600" aria-hidden />
      ) : null}
    </div>
  );

  return (
    <div className="flex w-full min-w-0 items-center gap-1.5">
      <span className="min-w-0 shrink-0 text-xs font-bold uppercase tracking-wide text-slate-500">
        {t("usersColumn")}
      </span>
      {expanded ? (
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            placeholder={t("searchUsers")}
            aria-label={t("searchUsers")}
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
        <span className="min-w-0 flex-1" aria-hidden />
      )}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {groupButton}
        {expanded ? null : (
          <button
            type="button"
            title={t("searchUsers")}
            aria-label={t("searchUsers")}
            className={cn(
              "inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500",
              "hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800",
            )}
            onClick={() => setSearchOpen(true)}
          >
            <Search className="size-3.5" strokeWidth={2} />
          </button>
        )}
      </div>
    </div>
  );
}
