import { cn } from "@/core/utils/http.util";

/** Canonical border for panels, cards, and shells. */
export const surfaceBorderClassName =
  "border border-slate-200/90 dark:border-slate-800";

/** Accent-colored focus ring for interactive controls. */
export const focusRingAccentClassName = cn(
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25",
  "focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950",
);

/** Header / toolbar icon button (filter, back, settings). */
export const chromeIconButtonClassName = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition",
  "hover:bg-slate-50 hover:text-slate-900",
  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100",
  focusRingAccentClassName,
);

/** Portaled dropdown / menu panel. */
export const popoverPanelClassName = cn(
  "overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5",
  "dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
);

/** Compact bordered control (pagination, toolbar). */
export const compactControlBtnClassName = cn(
  "inline-flex h-8 min-h-8 items-center justify-center rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 shadow-sm transition",
  "hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-45",
  "dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
  focusRingAccentClassName,
);

/** Active page / accent-filled compact button. */
export const accentFilledControlClassName = cn(
  "border-[color:var(--dash-accent,#111111)] bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)]",
  "hover:brightness-110 dark:hover:brightness-110",
);

/** Empty / WIP state icon well — uses user accent. */
export const emptyStateIconWellClassName = cn(
  "inline-flex size-14 items-center justify-center rounded-2xl sm:size-16",
  "bg-[color:var(--dash-accent,#111111)]/[0.08] text-[color:var(--dash-accent,#111111)]",
  "ring-1 ring-[color:var(--dash-accent,#111111)]/12",
  "dark:bg-[color:var(--dash-accent,#ffffff)]/10 dark:text-[color:var(--dash-accent,#ffffff)] dark:ring-[color:var(--dash-accent,#ffffff)]/15",
);

/** Segmented control — selected segment. */
export const segmentedSelectedClassName = cn(
  "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200",
  "dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600",
);

/** Segmented control — unselected segment. */
export const segmentedUnselectedClassName = cn(
  "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
  "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
);

/** Sidebar nav — parent section with active child. */
export const navParentActiveClassName = cn(
  "bg-[color:var(--dash-accent,#111111)]/[0.08] font-semibold text-[color:var(--dash-accent,#111111)]",
  "dark:bg-[color:var(--dash-accent,#ffffff)]/10 dark:text-[color:var(--dash-accent,#ffffff)]",
);

/** Sidebar nav — active leaf item. */
export const navLeafActiveClassName = cn(
  "bg-[color:var(--dash-accent,#111111)]/[0.12] font-semibold text-[color:var(--dash-accent,#111111)]",
  "dark:bg-[color:var(--dash-accent,#ffffff)]/14 dark:text-[color:var(--dash-accent,#ffffff)]",
);
