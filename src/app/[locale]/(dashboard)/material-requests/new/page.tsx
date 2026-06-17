import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { MaterialRequestFormScreen } from "@/features/material-requests/components/material-request-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.materialRequests");
  return { title: t("page.createTitle") };
}

export default async function DashboardMaterialRequestCreatePage() {
  return <MaterialRequestFormScreen mode="create" />;
}
