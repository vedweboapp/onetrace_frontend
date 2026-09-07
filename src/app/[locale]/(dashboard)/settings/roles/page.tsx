import { getTranslations } from "next-intl/server";
import { RolesPanel } from "@/features/settings/roles/components/roles-panel";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.roles");
  return {
    title: t("title"),
  };
}

export default function SettingsRolesPage() {
  return <RolesPanel />;
}
