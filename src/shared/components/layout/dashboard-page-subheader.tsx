"use client";

import type { ReactNode } from "react";
import { dashboardContentHorizontalGutterClassName } from "@/shared/config/dashboard-shell";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
  className?: string;
  /** Sticks below the 56px dashboard header row when scrolling page content. */
  sticky?: boolean;
};

/**
 * Second header row attached to `DashboardHeader` — same surface, shared bottom edge.
 */
export function DashboardPageSubheader({ children, className, sticky = true }: Props) {
  return (
    <div
      className={cn(
        "-mx-4 border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950 lg:-mx-6",
        sticky && "sticky top-14 z-10",
        className,
      )}
    >
      <div className={cn(dashboardContentHorizontalGutterClassName, "min-w-0")}>{children}</div>
    </div>
  );
}
