import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ClientDetailScreen } from "@/features/clients/components/client-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.clients");
  return { title: t("detailMetaTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardClientDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <ClientDetailScreen clientId={numericId} className="min-h-0 flex-1 pb-0 sm:pb-0" />
    </div>
  );
}
