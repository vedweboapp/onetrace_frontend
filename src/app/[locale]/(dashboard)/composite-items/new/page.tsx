import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CompositeItemFormScreen } from "@/features/composite-items/components/composite-item-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.compositeItems");
  return { title: t("page.createTitle") };
}

export default function DashboardCompositeItemCreatePage() {
  return <CompositeItemFormScreen mode="create" />;
}
