"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { JobChecklistItemTitle } from "@/features/jobs/components/job-checklist-item-title";
import type { JobChecklistItem } from "@/features/jobs/types/job.types";
import { DetailCollapsibleSection } from "@/shared/components/layout/detail-metric-card";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { cn } from "@/core/utils/http.util";

type Props = {
  checklists: JobChecklistItem[];
};

export function JobChecklistsSection({ checklists }: Props) {
  const t = useTranslations("Dashboard.jobs.checklists");
  const dateFmt = useDashboardDateFormat();

  if (checklists.length === 0) return null;

  const pendingRequired = checklists.filter((item) => item.is_required && !item.is_checked).length;

  return (
    <DetailCollapsibleSection
      title={t("sectionTitle")}
      defaultOpen={false}
      toggleAriaLabel={t("toggle")}
      badge={
        pendingRequired > 0 ? (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {pendingRequired}
          </span>
        ) : null
      }
    >
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
            </div>
          </li>
        ))}
      </ul>
    </DetailCollapsibleSection>
  );
}
