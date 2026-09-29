import React, { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/**
 * Flat settings/form section — single surface, no nested card chrome.
 * Appearance typography inherits from `.dash-appearance-scope`.
 */
const FormSectionCard = ({
  title,
  icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) => {
  return (
    <section
      className={cn(
        "flex w-full flex-col gap-5 border-b border-slate-200/90 py-6 first:pt-0 last:border-b-0 dark:border-slate-700/80",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {icon ? (
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {icon}
          </div>
        ) : null}
        <h2 className="min-w-0 flex-1 text-[length:var(--dash-body-size,0.875rem)] font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
};

export default FormSectionCard;
