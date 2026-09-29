"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
  /** Adds spacing when not the first block in a list. */
  separated?: boolean;
  className?: string;
};

/** @deprecated Prefer `separated` on `DetailEntityAddressFields` — kept for compatibility. */
export function DetailAddressBlock({ children, separated = false, className }: Props) {
  return (
    <div
      className={cn(
        "min-w-0",
        separated && "border-t border-slate-200/90 pt-4 dark:border-slate-800",
        className,
      )}
    >
      {children}
    </div>
  );
}
