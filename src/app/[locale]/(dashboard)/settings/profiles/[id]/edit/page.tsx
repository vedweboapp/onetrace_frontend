import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileFormScreen } from "@/features/settings/profiles/components/create-profile.forms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.profiles");
  return { title: t("page.editTitle") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export default async function SettingsProfileEditPage({ params }: PageProps) {
  const { id } = await params;
  const numericId = Number.parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  return <ProfileFormScreen mode="edit" profileId={numericId} />;
}
