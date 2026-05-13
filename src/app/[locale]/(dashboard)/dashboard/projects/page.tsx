import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ProjectsPanel } from "@/features/projects/components/projects-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects");
  return { title: t("metaTitle") };
}

export default async function DashboardProjectsPage() {
  return (
    <div className="pb-12">
      <Suspense
        fallback={
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        }
      >
        <ProjectsPanel />
      </Suspense>
    </div>
  );
}
