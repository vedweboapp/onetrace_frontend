import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserGroupFormScreen } from "@/features/user-groups/components/user-group-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.userGroups");
  return { title: t("page.createTitle") };
}

export default function DashboardUserGroupCreatePage() {
  return <UserGroupFormScreen mode="create" />;
}
