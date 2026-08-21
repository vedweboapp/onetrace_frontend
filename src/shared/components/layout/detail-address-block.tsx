"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

type Props = {
  heading: ReactNode;
  primaryLabel?: ReactNode;
  isPrimary?: boolean;
  children: ReactNode;
  /** Adds top border + spacing when not the first block in a list. */
  separated?: boolean;
  className?: string;
};

export function DetailAddressBlock({
  heading,
  primaryLabel,
  isPrimary = false,
  children,
  separated = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "min-w-0",
        separated && "mt-5 border-t border-slate-200/90 pt-5 dark:border-slate-800",
        className,
      )}
    >
      <div className="mb-3.5 flex flex-wrap items-center gap-2 pt-0.5">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{heading}</h4>
        {isPrimary && primaryLabel ? (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {primaryLabel}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
