import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { QuotationFormScreen } from "@/features/quotations/components/quotation-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.quotations");
  return { title: t("page.createTitle") };
}

export default function DashboardQuotationCreatePage() {
  return <QuotationFormScreen mode="create" />;
}
