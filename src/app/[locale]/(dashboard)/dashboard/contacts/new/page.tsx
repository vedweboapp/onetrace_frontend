import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactFormScreen } from "@/features/contacts/components/contact-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.contacts");
  return { title: t("page.createTitle") };
}

export default function DashboardContactCreatePage() {
  return <ContactFormScreen mode="create" />;
}
