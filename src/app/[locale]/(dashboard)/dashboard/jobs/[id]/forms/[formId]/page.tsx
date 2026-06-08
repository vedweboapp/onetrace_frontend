import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobFormFillScreen } from "@/features/job-forms/components/job-form-fill-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.jobs.forms");
  return { title: t("pageTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; formId: string }>;
  searchParams: Promise<{ name?: string }>;
};

export default async function DashboardJobFormFillPage({ params, searchParams }: PageProps) {
  const { id, formId } = await params;
  const { name } = await searchParams;
  const jobId = Number.parseInt(id, 10);
  const numericFormId = Number.parseInt(formId, 10);
  if (
    !Number.isFinite(jobId) ||
    jobId <= 0 ||
    !Number.isFinite(numericFormId) ||
    numericFormId <= 0
  ) {
    notFound();
  }

  return (
    <JobFormFillScreen
      jobId={jobId}
      formId={numericFormId}
      formNameHint={typeof name === "string" ? name : null}
    />
  );
}
