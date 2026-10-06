"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { Job } from "@/features/jobs/types/job.types";
import { JobSchedulingTab } from "@/features/jobs/components/job-scheduling-tab";
import { CheckmarkSelect } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  jobs: Job[];
};

export function QuotationScheduleTab({ jobs }: Props) {
  const t = useTranslations("Dashboard.quotations.relatedTabs");
  const [jobId, setJobId] = React.useState(() => (jobs[0] ? String(jobs[0].id) : ""));

  React.useEffect(() => {
    if (jobs.length === 0) {
      setJobId("");
      return;
    }
    if (!jobs.some((job) => String(job.id) === jobId)) {
      setJobId(String(jobs[0]!.id));
    }
  }, [jobs, jobId]);

  const selected = jobs.find((job) => String(job.id) === jobId) ?? jobs[0] ?? null;

  if (!selected) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {jobs.length > 1 ? (
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-1 py-2 dark:border-slate-800">
          <span className="text-sm text-slate-500 dark:text-slate-400">{t("scheduleJob")}</span>
          <CheckmarkSelect
            listLabel={t("scheduleJob")}
            buttonAriaLabel={t("scheduleJob")}
            options={jobs.map((job) => ({
              value: String(job.id),
              label: job.job_serial_number?.trim() || job.title?.trim() || `#${job.id}`,
            }))}
            value={jobId}
            className={cn("w-full max-w-xs")}
            onChange={(value) => setJobId(value ?? "")}
          />
        </div>
      ) : null}
      <JobSchedulingTab detail={selected} />
    </div>
  );
}
