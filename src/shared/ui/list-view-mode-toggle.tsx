"use client";

import { LayoutGrid, List, Map } from "lucide-react";
import type { ListPageViewMode } from "@/shared/hooks/use-list-url-state";
import { cn } from "@/core/utils/http.util";

type Props = {
  viewMode: ListPageViewMode;
  onViewModeChange: (mode: ListPageViewMode) => void;
  /** Card / grid view label (maps to mode `"list"`). */
  tableViewLabel?: string;
  /** Table / rows view label (maps to mode `"table"`). */
  listViewLabel?: string;
  /** Map view label (maps to mode `"map"`). Only shown when `showMapView` is true. */
  mapViewLabel?: string;
  /** When true, show a third Map control (jobs list, etc.). */
  showMapView?: boolean;
  className?: string;
  size?: "sm" | "md";
};

/**
 * Segmented card / list / optional map view control.
 * Note: URL mode `"list"` = card grid, `"table"` = data table (historical naming).
 */
export function ListViewModeToggle({
  viewMode,
  onViewModeChange,
  tableViewLabel = "Card view",
  listViewLabel = "List view",
  mapViewLabel = "Map view",
  showMapView = false,
  className,
  size = "sm",
}: Props) {
  const buttonSize = size === "md" ? "size-8" : "size-7";
  const iconSize = size === "md" ? "size-4" : "size-3.5";

  const pressedClass =
    "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/90 dark:bg-slate-950 dark:text-slate-50 dark:ring-slate-600";
  const idleClass =
    "text-slate-500 hover:bg-white/60 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-950/40 dark:hover:text-slate-100";

  return (
    <div
      role="group"
      aria-label="View mode"
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-lg border border-slate-200/90 bg-slate-100 p-0.5",
        "dark:border-slate-700 dark:bg-slate-800/90",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onViewModeChange("list")}
        title={tableViewLabel}
        aria-label={tableViewLabel}
        aria-pressed={viewMode === "list"}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition",
          buttonSize,
          viewMode === "list" ? pressedClass : idleClass,
        )}
      >
        <LayoutGrid className={iconSize} strokeWidth={2} aria-hidden />
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange("table")}
        title={listViewLabel}
        aria-label={listViewLabel}
        aria-pressed={viewMode === "table"}
        className={cn(
          "inline-flex items-center justify-center rounded-md transition",
          buttonSize,
          viewMode === "table" ? pressedClass : idleClass,
        )}
      >
        <List className={iconSize} strokeWidth={2} aria-hidden />
      </button>
      {showMapView ? (
        <button
          type="button"
          onClick={() => onViewModeChange("map")}
          title={mapViewLabel}
          aria-label={mapViewLabel}
          aria-pressed={viewMode === "map"}
          className={cn(
            "inline-flex items-center justify-center rounded-md transition",
            buttonSize,
            viewMode === "map" ? pressedClass : idleClass,
          )}
        >
          <Map className={iconSize} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
