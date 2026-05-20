import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";


type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata: Metadata = { title: "Block scope" };

export default async function QuotationDetailBlockScopePage({ params }: PageProps) {
  const { id } = await params;
  const quotationId = Number.parseInt(id, 10);
  if (!Number.isFinite(quotationId) || quotationId <= 0) notFound();

  redirect(`${routes.dashboard.quotations}/${quotationId}`);
}
