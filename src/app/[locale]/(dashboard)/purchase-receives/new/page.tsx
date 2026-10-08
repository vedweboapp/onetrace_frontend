import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PurchaseReceiveFormScreen } from "@/features/purchase-receives/components/purchase-receive-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.purchaseReceives");
  return { title: t("page.createTitle") };
}

export default function DashboardPurchaseReceiveCreatePage() {
  return <PurchaseReceiveFormScreen mode="create" />;
}
