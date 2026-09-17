import { getTranslations } from "next-intl/server";
import { CreateRoleForm } from "@/features/settings/roles/components/create-role-form";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.roles");
  return {
    title: t("page.createTitle"),
  };
}

export default function CreateRolePage() {
  return <CreateRoleForm mode="create" />;
}
