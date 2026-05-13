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
    <div className={cn("mb-3 min-w-0 sm:mb-4", className)}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          {backHref ? (
            <Link
              href={backHref}
              className={cn(
                "mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-transparent text-slate-500 transition",
                "hover:border-slate-200 hover:bg-slate-50 hover:text-slate-800",
                "dark:text-slate-400 dark:hover:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )}
              aria-label={backAriaLabel}
            >
              <ArrowLeft className="size-4" strokeWidth={2} aria-hidden />
            </Link>
          ) : null}
          <div className="min-w-0 flex-1">
            <h1 className="min-w-0 truncate text-lg font-semibold leading-snug tracking-tight text-slate-900 sm:text-xl dark:text-slate-100">
              {title}
            </h1>
            {subtitle ? (
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs leading-snug text-slate-600 sm:text-sm dark:text-slate-400">
                {subtitle}
              </div>
            ) : null}
          </div>
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
