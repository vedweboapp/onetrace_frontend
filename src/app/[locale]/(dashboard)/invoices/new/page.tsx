import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { InvoiceFormScreen } from "@/features/invoices/components/invoice-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.invoices");
  return { title: t("page.createTitle") };
}

export default function DashboardInvoiceCreatePage() {
  return <InvoiceFormScreen mode="create" />;
}
