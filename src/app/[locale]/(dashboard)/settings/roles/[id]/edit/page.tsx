import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CreateRoleForm } from "@/features/settings/roles/components/create-role-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.roles");
  return { title: t("page.editTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function DashboardRoleEditPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <CreateRoleForm mode="edit" roleId={numericId} />;
}
