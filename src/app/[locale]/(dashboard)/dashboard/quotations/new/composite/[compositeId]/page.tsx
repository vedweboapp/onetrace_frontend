import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QuotationCompositeScopeDetailScreen } from "@/features/quotations/components/quotation-composite-scope-detail-screen";
import { routes } from "@/shared/config/routes";

type PageProps = {
  params: Promise<{ locale: string; compositeId: string }>;
};

export const metadata: Metadata = { title: "Composite scope" };

export default async function QuotationNewCompositeScopePage({ params }: PageProps) {
  const { compositeId } = await params;
  const numericId = Number.parseInt(compositeId, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();
  return (
    <QuotationCompositeScopeDetailScreen
      compositeItemId={numericId}
      defaultBackHref={`${routes.dashboard.quotations}/new?tab=pricing`}
    />
  );
}
