import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ClientFormScreen } from "@/features/clients/components/client-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.clients");
  return { title: t("page.createTitle") };
}

export default function DashboardClientCreatePage() {
  return <ClientFormScreen mode="create" />;
}
