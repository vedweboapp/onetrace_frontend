"use client";

import * as React from "react";
import { LayoutGrid, List } from "lucide-react";
import type { ListPageViewMode } from "@/shared/hooks/use-list-url-state";
import { cn } from "@/core/utils/http.util";

type ListPageHeaderProps = {
  title: string;
  description?: string;
  action?: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
  controlsClassName?: string;
  showViewToggle?: boolean;
  /** Controlled view mode (sync with URL via `useListUrlState`). */
  viewMode?: ListPageViewMode;
  onViewModeChange?: (mode: ListPageViewMode) => void;
  /** When `viewMode` is omitted, uncontrolled initial mode. */
  defaultViewMode?: ListPageViewMode;
  tableViewLabel?: string;
  listViewLabel?: string;
};

export function ListPageHeader({
  title,
  description,
  action,
  controls,
  className,
  controlsClassName,
  showViewToggle = true,
  viewMode: viewModeProp,
  onViewModeChange,
  defaultViewMode = "table",
  tableViewLabel = "Card view",
  listViewLabel = "List view",
}: ListPageHeaderProps) {
  const [internalMode, setInternalMode] = React.useState<ListPageViewMode>(defaultViewMode);
  const controlled = viewModeProp !== undefined;
  const viewMode = controlled ? viewModeProp : internalMode;

  function setMode(mode: ListPageViewMode) {
    if (!controlled) setInternalMode(mode);
    onViewModeChange?.(mode);
  }

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {description ? <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>

      {(controls || showViewToggle) && (
        <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", controlsClassName)}>
          <div className="min-w-0 flex-1">{controls}</div>
          {showViewToggle ? (
            <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
              <button
                type="button"
                onClick={() => setMode("list")}
                title={tableViewLabel}
                aria-label={tableViewLabel}
                aria-pressed={viewMode === "list"}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md transition",
                  viewMode === "list"
                    ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
              >
                <LayoutGrid className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => setMode("table")}
                title={listViewLabel}
                aria-label={listViewLabel}
                aria-pressed={viewMode === "table"}
                className={cn(
                  "inline-flex size-8 items-center justify-center rounded-md transition",
                  viewMode === "table"
                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                )}
              >
                <List className="size-4" />
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
