"use client";

import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";

type Props = {
  title: ReactNode;
  /** Safe internal href from `sanitizeInternalListBack`, or null to hide back control. */
  backHref?: string | null;
  backAriaLabel: string;
  actions?: ReactNode;
  /** Secondary line under the title (e.g. contact + email + phone). */
  subtitle?: ReactNode;
  className?: string;
};

export function DetailPageHeader({ title, backHref, backAriaLabel, actions, subtitle, className }: Props) {
  return (
    <div className={cn("mb-6 space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition",
                "hover:bg-slate-100 hover:text-slate-800",
                "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )}
              aria-label={backAriaLabel}
            >
              <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          ) : null}
          <h1 className="min-w-0 truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
            {title}
          </h1>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {subtitle ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400",
            backHref && "sm:pl-10",
          )}
        >
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}
