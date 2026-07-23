"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { JobChecklistItemTitle } from "@/features/jobs/components/job-checklist-item-title";
import type { JobChecklistItem } from "@/features/jobs/types/job.types";
import { DetailCollapsibleSection } from "@/shared/components/layout/detail-metric-card";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "@/shared/ui";

type Props = {
  checklists: JobChecklistItem[];
  onCompleteChecks?: () => void;
};

export function JobChecklistsSection({ checklists, onCompleteChecks }: Props) {
  const t = useTranslations("Dashboard.jobs.checklists");
  const dateFmt = useDashboardDateFormat();

  if (checklists.length === 0) return null;

  const pendingRequired = checklists.filter((item) => {
    const basicChecked = item.is_checked;
    const concentricChecked = !item.concentric_point || item.concentric_point_is_checked === true;
    return item.is_required && (!basicChecked || !concentricChecked);
  }).length;

  return (
    <section className="overflow-hidden rounded-md border border-slate-200/95 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5 dark:border-slate-800">
        <div className="min-w-0 flex-1 text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {t("sectionTitle")}
        </div>
        {pendingRequired > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {pendingRequired}
          </span>
        ) : null}
        {onCompleteChecks ? (
          <AppButton type="button" variant="secondary" size="sm" onClick={onCompleteChecks}>
            Complete Checks
          </AppButton>
        ) : null}
      </div>
      <div className="px-4 py-2.5 sm:px-5 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Verify and complete all checklists and requirements.
          </p>
        </div>
        <ul className="space-y-2">
          {checklists.map((item) => (
            <li
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5",
                "border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/40",
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                  item.is_checked
                    ? "border-emerald-500 bg-emerald-500 text-white"
                    : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                )}
                aria-hidden
              >
                {item.is_checked ? <Check className="size-3" strokeWidth={3} /> : null}
              </span>
              <div className="min-w-0 flex-1">
                <JobChecklistItemTitle item={item} />
                {item.is_checked && item.checked_at ? (
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {t("checkedAt", { when: dateFmt.format(new Date(item.checked_at)) })}
                  </p>
                ) : null}
                <div className="mt-1.5 flex flex-wrap items-center gap-3">
                  {item.file ? (
                    <a
                      href={item.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View File
                    </a>
                  ) : null}
                  {item.concentric_point ? (
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                      <span
                        className={cn(
                          "flex size-3.5 items-center justify-center rounded border",
                          item.concentric_point_is_checked
                            ? "border-emerald-500 bg-emerald-500 text-white"
                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-900",
                        )}
                      >
                        {item.concentric_point_is_checked ? <Check className="size-2.5" strokeWidth={3} /> : null}
                      </span>
                      <span>Concentric Point</span>
                    </span>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
