import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LabourFormScreen } from "@/features/labour-types/components/labour-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.labours");
  return { title: t("page.createTitle") };
}

export default function DashboardLabourCreatePage() {
  return <LabourFormScreen mode="create" />;
}
