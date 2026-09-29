import { getTranslations } from "next-intl/server";
import { ProfileFormScreen } from "@/features/settings/profiles/components/create-profile.forms";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.profiles");
  return { title: t("page.createTitle") };
}

export default function SettingsProfilesCreatePage() {
  return <ProfileFormScreen mode="create" />;
}
