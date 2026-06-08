import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobFormFillScreen } from "@/features/job-forms/components/job-form-fill-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.jobs.forms");
  return { title: t("pageTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ formId?: string; name?: string }>;
};

export default async function DashboardJobFormFillPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { formId: rawFormId, name } = await searchParams;
  const jobId = Number.parseInt(id, 10);
  const formId = Number.parseInt(rawFormId ?? "", 10);
  if (!Number.isFinite(jobId) || jobId <= 0 || !Number.isFinite(formId) || formId <= 0) {
    notFound();
  }

  return (
    <JobFormFillScreen
      jobId={jobId}
      formId={formId}
      formNameHint={typeof name === "string" ? name : null}
    />
  );
}
