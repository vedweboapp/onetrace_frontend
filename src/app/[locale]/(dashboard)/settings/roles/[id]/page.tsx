import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { RoleDetailScreen } from "@/features/settings/roles/components/role-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.roles");
  return { title: t("detailMetaTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function SettingsRoleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <RoleDetailScreen roleId={numericId} />;
}
