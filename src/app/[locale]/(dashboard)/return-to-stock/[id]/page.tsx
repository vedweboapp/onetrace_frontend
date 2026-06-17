import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ReturnToStockDetailScreen } from "@/features/dispatches/components/return-to-stock-detail-screen";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.dispatches");
  return { title: t("return.detail.metaTitle") };
}

export default async function DashboardReturnToStockDetailPage({ params }: PageProps) {
  const { id: rawId } = await params;
  const requestId = Number.parseInt(rawId, 10);
  return <ReturnToStockDetailScreen requestId={requestId} />;
}
