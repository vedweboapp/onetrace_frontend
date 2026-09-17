import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PinDetailScreen } from "@/features/projects/components/pin-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects.pins");
  return { title: t("pageTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; pinId: string }>;
  searchParams: Promise<{ drawingId?: string }>;
};

export default async function DashboardJobPinDetailPage({ params, searchParams }: PageProps) {
  const { id, pinId } = await params;
  const { drawingId: rawDrawingId } = await searchParams;
  const jobId = Number.parseInt(id, 10);
  const numericPinId = Number.parseInt(pinId, 10);
  const drawingId = Number.parseInt(rawDrawingId ?? "", 10);
  if (
    !Number.isFinite(jobId) ||
    jobId <= 0 ||
    !Number.isFinite(numericPinId) ||
    numericPinId <= 0
  ) {
    notFound();
  }

  return (
    <PinDetailScreen
      jobId={jobId}
      pinId={numericPinId}
      drawingIdHint={Number.isFinite(drawingId) && drawingId > 0 ? drawingId : null}
    />
  );
}
