import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { VendorFormScreen } from "@/features/vendors/components/vendor-form-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.vendors");
  return { title: t("page.editTitle") };
}

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function DashboardVendorEditPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();
  return <VendorFormScreen mode="edit" vendorId={numericId} />;
}
