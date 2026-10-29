import type { Metadata } from "next";
import { QuotationSectionScopeDetailScreen } from "@/features/quotations/components/quotation-section-scope-detail-screen";
import { routes } from "@/shared/config/routes";

export const metadata: Metadata = { title: "Quote section" };

export default function QuotationNewSectionScopePage() {
  return (
    <QuotationSectionScopeDetailScreen defaultBackHref={`${routes.dashboard.quotations}/new?tab=pricing`} />
  );
}
