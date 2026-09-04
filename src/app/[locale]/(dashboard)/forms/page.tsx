import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { WorkerFormsPanel } from "@/features/job-forms/components/worker-forms-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.workerForms");
  return { title: t("metaTitle") };
}

export default async function DashboardWorkerFormsPage() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <WorkerFormsPanel />
      </Suspense>
    </div>
  );
}
