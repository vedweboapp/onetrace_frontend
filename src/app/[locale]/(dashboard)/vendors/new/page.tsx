import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { VendorFormScreen } from "@/features/vendors/components/vendor-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.vendors");
  return { title: t("page.createTitle") };
}

export default async function DashboardVendorCreatePage() {
  return <VendorFormScreen mode="create" />;
}
