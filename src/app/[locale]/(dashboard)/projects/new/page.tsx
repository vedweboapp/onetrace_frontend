import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ProjectFormScreen } from "@/features/projects/components/project-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects");
  return { title: t("page.createTitle") };
}

export default function DashboardProjectCreatePage() {
  return <ProjectFormScreen mode="create" />;
}
