import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { JobDetailScreen } from "@/features/jobs/components/job-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.jobs");
  return { title: t("detailMetaTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardJobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <JobDetailScreen jobId={numericId} />;
}
