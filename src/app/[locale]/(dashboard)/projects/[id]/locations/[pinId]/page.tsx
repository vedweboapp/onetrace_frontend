import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LocationDetailScreen } from "@/features/projects/components/location-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects.pins");
  return { title: t("pageTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; pinId: string }>;
  searchParams: Promise<{ drawingId?: string }>;
};

export default async function DashboardProjectLocationDetailPage({ params, searchParams }: PageProps) {
  const { id, pinId } = await params;
  const { drawingId: rawDrawingId } = await searchParams;
  const projectId = Number.parseInt(id, 10);
  const numericPinId = Number.parseInt(pinId, 10);
  const drawingId = Number.parseInt(rawDrawingId ?? "", 10);
  if (
    !Number.isFinite(projectId) ||
    projectId <= 0 ||
    !Number.isFinite(numericPinId) ||
    numericPinId <= 0
  ) {
    notFound();
  }

  return (
    <LocationDetailScreen
      projectId={projectId}
      pinId={numericPinId}
      drawingIdHint={Number.isFinite(drawingId) && drawingId > 0 ? drawingId : null}
    />
  );
}
