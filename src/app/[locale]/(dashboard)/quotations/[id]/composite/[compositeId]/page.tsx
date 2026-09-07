import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotationCompositeScopeDetailScreen } from "@/features/quotations/components/quotation-composite-scope-detail-screen";
import { routes } from "@/shared/config/routes";

type PageProps = {
  params: Promise<{ locale: string; id: string; compositeId: string }>;
};

export const metadata: Metadata = { title: "Composite scope" };

export default async function QuotationDetailCompositeScopePage({ params }: PageProps) {
  const { id, compositeId } = await params;
  const quotationId = Number.parseInt(id, 10);
  const numericCompositeId = Number.parseInt(compositeId, 10);
  if (!Number.isFinite(quotationId) || quotationId <= 0) notFound();
  if (!Number.isFinite(numericCompositeId) || numericCompositeId <= 0) notFound();
  return (
    <QuotationCompositeScopeDetailScreen
      compositeItemId={numericCompositeId}
      defaultBackHref={`${routes.dashboard.quotations}/${quotationId}?tab=pricing`}
    />
  );
}
