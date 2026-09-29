import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { JobFormScreen } from "@/features/jobs/components/job-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.jobs");
  return { title: t("page.createTitle") };
}

export default function DashboardJobCreatePage() {
  return <JobFormScreen mode="create" />;
}
