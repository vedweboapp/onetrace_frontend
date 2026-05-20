"use client";

import * as React from "react";
import { LayoutGrid, List, Funnel } from "lucide-react";
import { useTranslations } from "next-intl";
import { useDashboardChromeStore } from "@/features/dashboard/store/dashboard-chrome.store";
import type { ListPageViewMode } from "@/shared/hooks/use-list-url-state";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

type ListPageHeaderProps = {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  controls?: React.ReactNode;
  className?: string;
  controlsClassName?: string;
  showViewToggle?: boolean;
  viewMode?: ListPageViewMode;
  onViewModeChange?: (mode: ListPageViewMode) => void;
  defaultViewMode?: ListPageViewMode;
  tableViewLabel?: string;
  listViewLabel?: string;
  variant?: "toolbar" | "page";
  filtersActive?: boolean;
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
  variant = "toolbar",
  filtersActive = false,
}: ListPageHeaderProps) {
  const tList = useTranslations("Dashboard.list");
  const setSecondaryRow = useDashboardChromeStore((s) => s.setSecondaryRow);
  const filterRegionId = React.useId();
  const [internalMode, setInternalMode] = React.useState<ListPageViewMode>(defaultViewMode);
  const controlled = viewModeProp !== undefined;
  const viewMode = controlled ? viewModeProp : internalMode;

  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const filterAnchorRef = React.useRef<HTMLButtonElement>(null);
  const filterPanelRef = React.useRef<HTMLDivElement>(null);

  function setMode(mode: ListPageViewMode) {
    if (!controlled) setInternalMode(mode);
    onViewModeChange?.(mode);
  }

  React.useLayoutEffect(() => {
    if (!filtersOpen || !filterPanelRef.current) return;
    const input = filterPanelRef.current.querySelector<HTMLInputElement>('input[type="search"]');
    window.requestAnimationFrame(() => input?.focus());
  }, [filtersOpen]);

  React.useEffect(() => {
    if (!filtersOpen) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      const el = t as Element;
      if (filterAnchorRef.current?.contains(t)) return;
      if (filterPanelRef.current?.contains(t)) return;
      if (typeof el.closest === "function") {
        if (el.closest("[data-ot-checkmark-portal]")) return;
        if (el.closest("[data-ot-row-actions-trigger], [data-ot-row-actions-portal]")) return;
        if (el.closest("[role='menu']")) return;
      }
      setFiltersOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFiltersOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [filtersOpen]);

  const filterAria = tList("filterMenuAria");

  React.useEffect(() => {
    const viewToggle = showViewToggle ? (
      <div className="inline-flex h-8 shrink-0 items-center rounded-md border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
        <button
          type="button"
          onClick={() => setMode("list")}
          title={tableViewLabel}
          aria-label={tableViewLabel}
          aria-pressed={viewMode === "list"}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded transition",
            viewMode === "list"
              ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          )}
        >
          <LayoutGrid className="size-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setMode("table")}
          title={listViewLabel}
          aria-label={listViewLabel}
          aria-pressed={viewMode === "table"}
          className={cn(
            "inline-flex size-7 items-center justify-center rounded transition",
            viewMode === "table"
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          )}
        >
          <List className="size-3.5" strokeWidth={2} />
        </button>
      </div>
    ) : null;

    if (variant === "page") {
      setSecondaryRow(
        <div className={cn(dashboardContentHorizontalGutterClassName, "space-y-3 py-2.5", className)}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              {title ? (
                <h1 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
              ) : null}
              {description ? (
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
              ) : null}
            </div>
            {action ? <div className="shrink-0 self-start">{action}</div> : null}
          </div>
          {(controls || showViewToggle) && (
            <div className={cn("flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between", controlsClassName)}>
              <div className="min-w-0 flex-1">{controls}</div>
              {viewToggle}
            </div>
          )}
        </div>,
      );
      return () => setSecondaryRow(null);
    }

    const hasToolbar = Boolean(controls) || showViewToggle || action;
    if (!hasToolbar) {
      setSecondaryRow(null);
      return () => setSecondaryRow(null);
    }

    const filterButton = controls ? (
      <button
        ref={filterAnchorRef}
        type="button"
        onClick={() => setFiltersOpen((o) => !o)}
        aria-expanded={filtersOpen}
        aria-controls={filterRegionId}
        aria-label={filterAria}
        title={filterAria}
        className={cn(
          "relative inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition outline-none",
          "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900",
          "focus-visible:ring-2 focus-visible:ring-slate-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-offset-slate-950",
          filtersOpen && "border-slate-300 bg-slate-50 dark:border-slate-600 dark:bg-slate-800",
        )}
      >
        <Funnel className="size-4" strokeWidth={2} aria-hidden />
        {filtersActive ? (
          <span
            className="absolute right-1 top-1 size-1.5 rounded-full ring-2 ring-white dark:ring-slate-900"
            style={{ background: "var(--dash-accent, #111)" }}
            aria-hidden
          />
        ) : null}
      </button>
    ) : null;

    setSecondaryRow(
      <div className={className}>
        <div
          className={cn(
            dashboardContentHorizontalGutterClassName,
            "flex h-11 items-center justify-between gap-3",
          )}
        >
          <div className="flex min-w-0 items-center gap-2">
            {filterButton}
            {viewToggle}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
        {filtersOpen && controls ? (
          <div
            ref={filterPanelRef}
            id={filterRegionId}
            role="region"
            aria-label={tList("filterMenu")}
            className={cn(
              "border-t border-slate-200 dark:border-slate-800",
              dashboardContentHorizontalGutterClassName,
              "py-2.5",
              controlsClassName,
            )}
          >
            {controls}
          </div>
        ) : null}
      </div>,
    );

    return () => setSecondaryRow(null);
  }, [
    variant,
    title,
    description,
    action,
    controls,
    className,
    controlsClassName,
    showViewToggle,
    viewMode,
    filtersOpen,
    filtersActive,
    filterRegionId,
    filterAria,
    tableViewLabel,
    listViewLabel,
    tList,
    setSecondaryRow,
    controlled,
  ]);

  return null;
}
