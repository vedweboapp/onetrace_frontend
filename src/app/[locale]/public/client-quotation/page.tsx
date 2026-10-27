import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { QuotationPinDetails } from "@/features/public/quotation/components/quotation-pin-details";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Public.quotation");

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function PublicQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolved = await searchParams;
  const token =
    typeof resolved?.token === "string"
      ? resolved.token
      : typeof resolved?.id === "string"
        ? resolved.id
        : undefined;

  return (
    <Suspense fallback={null}>
      <QuotationPinDetails initialToken={token} />
    </Suspense>
  );
}
