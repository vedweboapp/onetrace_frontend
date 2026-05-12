import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SiteFormScreen } from "@/features/sites/components/site-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.sites");
  return { title: t("page.createTitle") };
}

export default function DashboardSiteCreatePage() {
  return <SiteFormScreen mode="create" />;
}
