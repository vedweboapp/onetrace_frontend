import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PublicQrCodeScreen } from "@/features/public/qr-code/components/public-qr-code-screen";
import { isPublicQrCodeRoute } from "@/features/public/qr-code/utils/public-qr-code-route.util";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ locale: string; orgId: string; qrUuid: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orgId, qrUuid } = await params;
  const t = await getTranslations("Public.qrCode");

  if (!isPublicQrCodeRoute(orgId, qrUuid)) {
    return { title: t("pageTitle") };
  }

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function PublicQrCodePage({ params }: PageProps) {
  const { orgId, qrUuid } = await params;
  if (!isPublicQrCodeRoute(orgId, qrUuid)) notFound();

  return <PublicQrCodeScreen />;
}
