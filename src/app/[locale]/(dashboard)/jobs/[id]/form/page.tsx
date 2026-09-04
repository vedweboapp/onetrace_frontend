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
  searchParams: Promise<{
    formId?: string;
    name?: string;
    job_form_id?: string;
    submission_id?: string;
    submissionId?: string;
  }>;
};

export default async function DashboardJobFormFillPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const {
    formId: rawFormId,
    name,
    job_form_id: rawJobFormId,
    submission_id: rawSubmissionId,
    submissionId: rawSubmissionIdAlt,
  } = await searchParams;
  const jobId = Number.parseInt(id, 10);
  const jobFormIdRaw = Number.parseInt(rawJobFormId ?? "", 10);
  const formIdRaw = Number.parseInt(rawFormId ?? "", 10);
  const submissionIdRaw = Number.parseInt(rawSubmissionId ?? rawSubmissionIdAlt ?? "", 10);

  const formId = Number.isFinite(formIdRaw) && formIdRaw > 0 ? formIdRaw : undefined;
  const jobFormId = Number.isFinite(jobFormIdRaw) && jobFormIdRaw > 0 ? jobFormIdRaw : undefined;
  const submissionId =
    Number.isFinite(submissionIdRaw) && submissionIdRaw > 0 ? submissionIdRaw : undefined;

  if (!Number.isFinite(jobId) || jobId <= 0) {
    notFound();
  }
  // Worker Forms tab may only have submission_id (detail API omits project_form_id).
  if (formId == null && submissionId == null) {
    notFound();
  }

  return (
    <JobFormFillScreen
      jobId={jobId}
      formId={formId}
      jobFormId={jobFormId ?? formId}
      formNameHint={typeof name === "string" ? name : null}
    />
  );
}
