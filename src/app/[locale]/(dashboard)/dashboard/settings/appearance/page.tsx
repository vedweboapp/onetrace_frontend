import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppearancePanel } from "@/features/dashboard/settings/appearance-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.appearance");
  return { title: t("metaTitle") };
}

export default async function DashboardAppearancePage() {
  return (
    <div className="pb-16">
      <AppearancePanel />
    </div>
  );
}
