"use client";

import { useDashboardChromeStore } from "@/features/dashboard/store/dashboard-chrome.store";

/** Second header row rendered flush under `DashboardHeader` (list toolbar, detail actions). */
export function DashboardChromeSlot() {
  const secondaryRow = useDashboardChromeStore((s) => s.secondaryRow);
  if (!secondaryRow) return null;
  return <div className="border-t border-slate-200 dark:border-slate-800">{secondaryRow}</div>;
}
