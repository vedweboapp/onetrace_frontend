import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GroupFormScreen } from "@/features/groups/components/group-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.groups");
  return { title: t("page.createTitle") };
}

export default function DashboardGroupCreatePage() {
  return <GroupFormScreen mode="create" />;
}
