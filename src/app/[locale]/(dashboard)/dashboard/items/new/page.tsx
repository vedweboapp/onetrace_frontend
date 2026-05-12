import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ItemFormScreen } from "@/features/items/components/item-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.items");
  return { title: t("page.createTitle") };
}

export default function DashboardItemCreatePage() {
  return <ItemFormScreen mode="create" />;
}
