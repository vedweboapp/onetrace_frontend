import { getTranslations } from "next-intl/server";
import { ProfilesPanel } from "@/features/settings/profiles/components/profiles-panel";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.profiles");
  return {
    title: t("title"),
  };
}

export default function SettingsProfilesPage() {
  return <ProfilesPanel />;
}
