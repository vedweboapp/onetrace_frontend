"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { fetchJobSubmittedForms } from "@/features/job-forms/api/job-form.api";
import type { JobFormSubmission } from "@/features/job-forms/types/job-form-submission.types";
import type { JobFormRef } from "@/features/jobs/types/job.types";
import { routes } from "@/shared/config/routes";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobId: number;
  forms: JobFormRef[];
  backHref?: string;
};

export function JobFormsSection({ jobId, forms, backHref }: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const [submissions, setSubmissions] = React.useState<JobFormSubmission[]>([]);
  const [loading, setLoading] = React.useState(true);

  const jobDetailHref = backHref ?? `${routes.dashboard.jobs}/${jobId}`;

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchJobSubmittedForms(jobId);
        if (!cancelled) setSubmissions(rows);
      } catch {
        if (!cancelled) setSubmissions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  const submissionByFormId = React.useMemo(() => {
    const map = new Map<number, JobFormSubmission>();
    for (const row of submissions) {
      const key = row.job_form_id ?? row.form_id;
      if (key > 0) map.set(key, row);
    }
    return map;
  }, [submissions]);

  if (forms.length === 0) return null;

  return (
    <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t("sectionTitle")}
      </p>
      <ul className="flex flex-wrap gap-2">
        {forms.map((form) => {
          const submission = submissionByFormId.get(form.id);
          const label = form.name?.trim() || `#${form.id}`;
          const href = `${routes.dashboard.jobFormFill(jobId, form.id)}?back=${encodeURIComponent(jobDetailHref)}`;

          return (
            <li key={form.id}>
              <Link
                href={href}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1 text-sm transition",
                  "border-slate-200 bg-slate-50 text-slate-800 hover:border-[color:var(--dash-accent)] hover:text-[color:var(--dash-accent)]",
                  "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
                )}
              >
                <span>{label}</span>
                {!loading ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      submission
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                    )}
                  >
                    {submission ? t("statusSubmitted") : t("statusPending")}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
