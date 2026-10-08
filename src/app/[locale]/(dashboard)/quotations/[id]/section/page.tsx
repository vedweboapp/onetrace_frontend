import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotationSectionScopeDetailScreen } from "@/features/quotations/components/quotation-section-scope-detail-screen";
import { routes } from "@/shared/config/routes";

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata: Metadata = { title: "Quote section" };

export default async function QuotationDetailSectionScopePage({ params }: PageProps) {
  const { id } = await params;
  const quotationId = Number.parseInt(id, 10);
  if (!Number.isFinite(quotationId) || quotationId <= 0) notFound();
  return (
    <QuotationSectionScopeDetailScreen
      defaultBackHref={`${routes.dashboard.quotations}/${quotationId}?tab=pricing`}
    />
  );
}
