import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MaterialRequestFormScreen } from "@/features/material-requests/components/material-request-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.materialRequests");
  return { title: t("page.editTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardMaterialRequestEditPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <MaterialRequestFormScreen mode="edit" materialRequestId={numericId} />;
}
