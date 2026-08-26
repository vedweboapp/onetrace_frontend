"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
  /** Adds spacing when not the first block in a list. */
  separated?: boolean;
  className?: string;
};

/** Soft card wrapper for each address in multi-address detail sections. */
export function DetailAddressBlock({ children, separated = false, className }: Props) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-slate-200/90 bg-slate-50/40 p-4 sm:p-5",
        "dark:border-slate-800 dark:bg-slate-900/30",
        separated && "mt-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
