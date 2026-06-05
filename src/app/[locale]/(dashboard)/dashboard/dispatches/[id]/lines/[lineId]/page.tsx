import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { DispatchLineDetailScreen } from "@/features/dispatches/components/dispatch-line-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.dispatches");
  return { title: t("detail.lineMetaTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; lineId: string }>;
};

export default async function DashboardDispatchLineDetailPage({ params }: PageProps) {
  const { id, lineId } = await params;
  const numericDispatchId = Number.parseInt(id, 10);
  const numericLineId = Number.parseInt(lineId, 10);
  if (
    !Number.isFinite(numericDispatchId) ||
    numericDispatchId <= 0 ||
    !Number.isFinite(numericLineId) ||
    numericLineId <= 0
  ) {
    notFound();
  }

  return <DispatchLineDetailScreen dispatchId={numericDispatchId} lineId={numericLineId} />;
}
