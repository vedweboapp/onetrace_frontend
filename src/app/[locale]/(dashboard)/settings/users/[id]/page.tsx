import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { UserDetailScreen } from "@/features/users/components/user-detail-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.users");
  return { title: t("detailMetaTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardUserDetailPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <UserDetailScreen userId={numericId} />;
}
