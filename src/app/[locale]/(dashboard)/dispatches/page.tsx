import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { DispatchesPanel } from "@/features/dispatches/components/dispatches-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.dispatches");
  return { title: t("pageTitle") };
}

export default function DashboardDispatchesPage() {
  return <DispatchesPanel />;
}
