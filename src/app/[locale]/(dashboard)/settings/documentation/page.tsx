import { getTranslations } from "next-intl/server";
import { DocumentationPanel } from "@/features/settings/documentation/components/documentation-panel";

export async function generateMetadata() {
  const t = await getTranslations("Dashboard.settingsDocumentation");
  return { title: t("pageTitle") };
}

export default function SettingsDocumentationPage() {
  return <DocumentationPanel />;
}
