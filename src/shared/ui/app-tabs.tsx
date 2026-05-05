"use client";

import * as React from "react";
import { cn } from "@/core/utils/http.util";

export type AppTabItem = {
  id: string;
  label: React.ReactNode;
};

export type AppTabsProps = {
  tabs: readonly AppTabItem[];
  value: string;
  onValueChange: (id: string) => void;
  className?: string;
  /** Accessible name for the tab list (e.g. "Project sections"). */
  ariaLabel?: string;

  panelIdPrefix?: string;
};

export function AppTabs({
  tabs,
  value,
  onValueChange,
  className,
  ariaLabel,
  panelIdPrefix,
}: AppTabsProps) {
  const listRef = React.useRef<HTMLDivElement>(null);

  const focusTabAt = React.useCallback((index: number) => {
    const el = listRef.current?.querySelector<HTMLButtonElement>(`[data-app-tab-index="${index}"]`);
    el?.focus();
  }, []);

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (tabs.length === 0) return;
    const i = tabs.findIndex((t) => t.id === value);
    if (i < 0) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const next = (i + 1) % tabs.length;
      onValueChange(tabs[next]!.id);
      queueMicrotask(() => focusTabAt(next));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (i - 1 + tabs.length) % tabs.length;
      onValueChange(tabs[next]!.id);
      queueMicrotask(() => focusTabAt(next));
    } else if (e.key === "Home") {
      e.preventDefault();
      onValueChange(tabs[0]!.id);
      queueMicrotask(() => focusTabAt(0));
    } else if (e.key === "End") {
      e.preventDefault();
      const last = tabs.length - 1;
      onValueChange(tabs[last]!.id);
      queueMicrotask(() => focusTabAt(last));
    }
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        "flex gap-0.5 overflow-x-auto border-b border-slate-200/90 [-ms-overflow-style:none] [scrollbar-width:none] dark:border-slate-800",
        "[&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        const triggerId = panelIdPrefix ? `${panelIdPrefix}-trigger-${tab.id}` : undefined;
        const panelId = panelIdPrefix ? `${panelIdPrefix}-${tab.id}` : undefined;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={triggerId}
            data-app-tab-index={index}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(tab.id)}
            className={cn(
              "relative shrink-0 whitespace-nowrap px-3 py-2.5 text-sm font-medium outline-none transition-colors",
              "focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
              selected
                ? "text-[color:var(--dash-accent,#111111)]"
                : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
            )}
          >
            {tab.label}
            <span
              className={cn(
                "pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full transition-opacity",
                "bg-[color:var(--dash-accent,#111111)]",
                selected ? "opacity-100" : "opacity-0",
              )}
              aria-hidden
            />
          </button>
        );
      })}
    </div>
  );
}
