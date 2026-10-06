"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Eye, EyeOff, GripVertical, RotateCcw, SlidersHorizontal } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { AppTabs, type AppTabItem, type AppTabsProps } from "@/shared/ui/app-tabs";
import { usePersistedTabLayout } from "@/shared/hooks/use-persisted-tab-layout";

const DND_TYPE = "application/x-app-tab-order";

export type CustomizableAppTabsLabels = {
  customizeAria: string;
  arrangeTitle: string;
  arrangeHint: string;
  reset: string;
  moveUpAria: string;
  moveDownAria: string;
  dragHandleAria: string;
  showAria: string;
  hideAria: string;
  pinnedHint: string;
};

export type CustomizableAppTabsProps = Omit<AppTabsProps, "tabs"> & {
  /** Default tab definitions (order used when user has not customized). */
  tabs: readonly AppTabItem[];
  /** localStorage key — include user id so preferences are personal (see `useTabOrderStorageKey`). */
  storageKey: string;
  /** Tabs that cannot be hidden (defaults to the first tab). */
  pinnedTabIds?: readonly string[];
  /** Override copy; defaults to `Dashboard.common.customizeTabs`. */
  labels?: Partial<CustomizableAppTabsLabels>;
};

export function CustomizableAppTabs({
  tabs,
  storageKey,
  pinnedTabIds: pinnedTabIdsProp,
  labels: labelsProp,
  value,
  onValueChange,
  className,
  ariaLabel,
  panelIdPrefix,
}: CustomizableAppTabsProps) {
  const t = useTranslations("Dashboard.common.customizeTabs");
  const labels: CustomizableAppTabsLabels = {
    customizeAria: labelsProp?.customizeAria ?? t("aria"),
    arrangeTitle: labelsProp?.arrangeTitle ?? t("title"),
    arrangeHint: labelsProp?.arrangeHint ?? t("hint"),
    reset: labelsProp?.reset ?? t("reset"),
    moveUpAria: labelsProp?.moveUpAria ?? t("moveUp"),
    moveDownAria: labelsProp?.moveDownAria ?? t("moveDown"),
    dragHandleAria: labelsProp?.dragHandleAria ?? t("drag"),
    showAria: labelsProp?.showAria ?? t("show"),
    hideAria: labelsProp?.hideAria ?? t("hide"),
    pinnedHint: labelsProp?.pinnedHint ?? t("pinned"),
  };

  const defaultIds = React.useMemo(() => tabs.map((tab) => tab.id), [tabs]);
  const byId = React.useMemo(() => new Map(tabs.map((tab) => [tab.id, tab])), [tabs]);
  const pinnedTabIds = React.useMemo(() => {
    if (pinnedTabIdsProp?.length) return [...pinnedTabIdsProp];
    return defaultIds[0] ? [defaultIds[0]] : [];
  }, [defaultIds, pinnedTabIdsProp]);
  const { order, hidden, visibleIds, move, setHidden, reset, isCustom } = usePersistedTabLayout(
    storageKey,
    defaultIds,
    pinnedTabIds,
  );
  const hiddenSet = React.useMemo(() => new Set(hidden), [hidden]);

  const orderedTabs = React.useMemo(
    () => order.map((id) => byId.get(id)).filter((tab): tab is AppTabItem => tab != null),
    [order, byId],
  );
  const visibleTabs = React.useMemo(
    () => visibleIds.map((id) => byId.get(id)).filter((tab): tab is AppTabItem => tab != null),
    [visibleIds, byId],
  );

  React.useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (visibleTabs.some((tab) => tab.id === value)) return;
    onValueChange(visibleTabs[0]!.id);
  }, [onValueChange, value, visibleTabs]);

  const [open, setOpen] = React.useState(false);
  const [dragFrom, setDragFrom] = React.useState<number | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelPos, setPanelPos] = React.useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 288,
  });

  const updatePanelPos = React.useCallback(() => {
    const el = buttonRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const width = 320;
    const pad = 8;
    let left = r.right - width;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));
    const spaceBelow = window.innerHeight - r.bottom - pad;
    const openUp = spaceBelow < 280 && r.top > spaceBelow;
    const top = openUp ? Math.max(pad, r.top - 8) : r.bottom + 6;
    setPanelPos({ top, left, width });
  }, []);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePanelPos();
    window.addEventListener("resize", updatePanelPos);
    window.addEventListener("scroll", updatePanelPos, true);
    return () => {
      window.removeEventListener("resize", updatePanelPos);
      window.removeEventListener("scroll", updatePanelPos, true);
    };
  }, [open, updatePanelPos]);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={labels.arrangeTitle}
            className="z-[220] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
            style={{
              position: "fixed",
              top: panelPos.top,
              left: panelPos.left,
              width: panelPos.width,
              maxHeight: "min(22rem, calc(100vh - 1rem))",
              transform:
                panelPos.top < (buttonRef.current?.getBoundingClientRect().bottom ?? 0)
                  ? "translateY(-100%)"
                  : undefined,
            }}
          >
            <div className="border-b border-slate-100 px-3.5 py-2.5 dark:border-slate-800">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">{labels.arrangeTitle}</p>
              <p className="mt-0.5 text-xs leading-snug text-slate-500 dark:text-slate-400">{labels.arrangeHint}</p>
            </div>
            <ul className="max-h-[14rem] overflow-y-auto py-1">
              {orderedTabs.map((tab, index) => {
                const labelText = typeof tab.label === "string" ? tab.label : tab.id;
                const pinned = pinnedTabIds.includes(tab.id);
                const isHidden = !pinned && hiddenSet.has(tab.id);
                return (
                  <li
                    key={tab.id}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData(DND_TYPE, String(index));
                      setDragFrom(index);
                    }}
                    onDragEnd={() => setDragFrom(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const raw = e.dataTransfer.getData(DND_TYPE);
                      const from = Number.parseInt(raw, 10);
                      if (Number.isFinite(from)) move(from, index);
                      setDragFrom(null);
                    }}
                    className={cn(
                      "flex items-center gap-1 border-b border-slate-50 px-2 py-1 last:border-b-0 dark:border-slate-800/60",
                      dragFrom === index && "bg-slate-50 opacity-60 dark:bg-slate-800/50",
                      isHidden && "opacity-55",
                    )}
                  >
                    <span
                      className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded-md text-slate-400 active:cursor-grabbing"
                      aria-label={labels.dragHandleAria}
                    >
                      <GripVertical className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {labelText}
                    </span>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label={pinned ? labels.pinnedHint : isHidden ? labels.showAria : labels.hideAria}
                        aria-pressed={!isHidden}
                        title={pinned ? labels.pinnedHint : isHidden ? labels.showAria : labels.hideAria}
                        disabled={pinned}
                        onClick={() => setHidden(tab.id, !isHidden)}
                      >
                        {isHidden ? (
                          <EyeOff className="size-3.5" aria-hidden />
                        ) : (
                          <Eye className="size-3.5" aria-hidden />
                        )}
                      </button>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label={labels.moveUpAria}
                        disabled={index === 0}
                        onClick={() => move(index, index - 1)}
                      >
                        <ChevronUp className="size-3.5" aria-hidden />
                      </button>
                      <button
                        type="button"
                        className="flex size-7 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-30 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                        aria-label={labels.moveDownAria}
                        disabled={index === orderedTabs.length - 1}
                        onClick={() => move(index, index + 1)}
                      >
                        <ChevronDown className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-slate-100 p-2 dark:border-slate-800">
              <button
                type="button"
                disabled={!isCustom}
                onClick={() => {
                  reset();
                }}
                className={cn(
                  "flex w-full items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition",
                  isCustom
                    ? "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                    : "cursor-not-allowed text-slate-400 dark:text-slate-600",
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                {labels.reset}
              </button>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className={cn("flex min-w-0 items-end gap-1", className)}>
      <AppTabs
        tabs={visibleTabs}
        value={value}
        onValueChange={onValueChange}
        ariaLabel={ariaLabel}
        panelIdPrefix={panelIdPrefix}
        className="min-w-0 flex-1"
      />
      <button
        ref={buttonRef}
        type="button"
        aria-label={labels.customizeAria}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "mb-px flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition",
          "hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2",
          "dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-600",
          (open || isCustom) &&
            "border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100",
        )}
      >
        <SlidersHorizontal className="size-3.5" strokeWidth={2.25} aria-hidden />
      </button>
      {panel}
    </div>
  );
}
