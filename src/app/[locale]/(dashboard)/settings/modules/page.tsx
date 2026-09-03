import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import CompanySettingsDetails from "@/features/settings/company-settings/components/company-settings-details";
import ModulesDetails from "@/features/modules/components/modules-details";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function ModulesPage() {
    return <ModulesDetails />;
}
