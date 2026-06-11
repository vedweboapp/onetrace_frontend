import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PurchaseOrderFormScreen } from "@/features/purchase-orders/components/purchase-order-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.purchaseOrders");
  return { title: t("page.createTitle") };
}

export default function DashboardPurchaseOrderCreatePage() {
  return <PurchaseOrderFormScreen mode="create" />;
}
