"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { JobFormRef } from "@/features/jobs/types/job.types";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobId: number;
  forms: JobFormRef[];
  backHref?: string;
};

function isSubmittedForm(form: JobFormRef): boolean {
  if (typeof form.is_submitted === "boolean") return form.is_submitted;
  return typeof form.submitted_form_id === "number" && form.submitted_form_id > 0;
}

export function JobFormsSection({ jobId, forms, backHref }: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const jobDetailHref = backHref ?? `${routes.dashboard.jobs}/${jobId}`;

  if (forms.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("sectionTitle")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {forms.map((form) => {
          const submitted = isSubmittedForm(form);
          const label = form.name?.trim() || `#${form.project_form_id}`;
          const hrefBase = `${routes.dashboard.jobFormFill(jobId, form.project_form_id, form.id)}&name=${encodeURIComponent(label)}&back=${encodeURIComponent(jobDetailHref)}`;
          const submissionId =
            typeof form.submitted_form_id === "number" && form.submitted_form_id > 0
              ? form.submitted_form_id
              : null;
          const href = submitted && submissionId ? `${hrefBase}&submissionId=${submissionId}` : hrefBase;

          return (
            <li key={`${form.id}-${form.project_form_id}`}>
              <Link
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm transition",
                  "border-slate-200 bg-slate-50 text-slate-800 hover:border-[color:var(--dash-accent)] hover:text-[color:var(--dash-accent)]",
                  "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
                )}
              >
                <span>{label}</span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    submitted
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                  )}
                >
                  {submitted ? t("statusSubmitted") : t("statusPending")}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
