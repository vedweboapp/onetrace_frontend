"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

type Props = {
  children: ReactNode;
  /** Adds top border + spacing when not the first block in a list. */
  separated?: boolean;
  className?: string;
};

/** Spacing wrapper for multi-address detail sections (heading lives inside the field grid). */
export function DetailAddressBlock({ children, separated = false, className }: Props) {
  return (
    <div
      className={cn(
        "min-w-0",
        separated && "mt-5 border-t border-slate-200/90 pt-5 dark:border-slate-800",
        className,
      )}
    >
      {children}
    </div>
  );
}
