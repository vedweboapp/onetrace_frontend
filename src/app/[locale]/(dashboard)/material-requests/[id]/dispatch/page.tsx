import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { MaterialRequestDispatchScreen } from "@/features/material-requests/components/material-request-dispatch-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.materialRequests.dispatch");
  return { title: t("pageTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardMaterialRequestDispatchPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <MaterialRequestDispatchScreen materialRequestId={numericId} />;
}
