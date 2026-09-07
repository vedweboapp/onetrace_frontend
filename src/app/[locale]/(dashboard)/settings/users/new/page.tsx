import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { UserFormScreen } from "@/features/users/components/user-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.users");
  return { title: t("page.createTitle") };
}

export default function DashboardUserInvitePage() {
  return <UserFormScreen mode="create" />;
}
