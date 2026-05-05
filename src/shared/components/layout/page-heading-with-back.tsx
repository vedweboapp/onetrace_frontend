import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";

export type PageHeadingWithBackProps = {

  backHref?: string;

  backAriaLabel?: string;

  title: string;
  description?: string;

  kicker?: string;
  
  density?: "default" | "compact";

  actions?: ReactNode;
  className?: string;
};

export function PageHeadingWithBack({
  backHref,
  backAriaLabel,
  title,
  description,
  kicker,
  density = "default",
  actions,
  className,
}: PageHeadingWithBackProps) {
  const showBack = Boolean(backHref && backAriaLabel);
  const compact = density === "compact";

  return (
    <header className={cn(compact ? "space-y-2" : "space-y-3", className)}>
      {kicker ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
          {kicker}
        </p>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
          actions && "gap-3",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-2.5">
          {showBack ? (
            <Link
              href={backHref!}
              title={backAriaLabel}
              aria-label={backAriaLabel}
              className={cn(
                "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition sm:mt-0",
                "hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-50",
                "outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600",
              )}
            >
              <ArrowLeft className="size-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
            </Link>
          ) : null}
          <h1 className="min-w-0 flex-1 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:truncate sm:text-2xl">
            {title}
          </h1>
        </div>
        {actions ? (
          <div
            className={cn(
              "flex shrink-0 flex-wrap gap-2 sm:justify-end",
              showBack && "pl-[2.5rem] sm:pl-0",
            )}
          >
            {actions}
          </div>
        ) : null}
      </div>
      {description ? (
        <p
          className={cn(
            "max-w-3xl leading-snug text-slate-600 dark:text-slate-400",
            compact ? "text-xs sm:text-sm" : "text-sm leading-relaxed sm:text-[15px]",
            showBack && "pl-[2.5rem] sm:pl-10",
          )}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}