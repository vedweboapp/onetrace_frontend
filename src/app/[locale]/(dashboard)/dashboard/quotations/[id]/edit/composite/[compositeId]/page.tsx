import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

/*
 * Composite item scope detail page (disabled). See `quotations/new/composite/[compositeId]/page.tsx`.
 *
 * import { getTranslations } from "next-intl/server";
 * import { QuotationCompositeScopeDetailScreen } from "@/features/quotations/components/quotation-composite-scope-detail-screen";
 */

type PageProps = {
  params: Promise<{ locale: string; id: string; compositeId: string }>;
};

export const metadata: Metadata = { title: "Composite scope" };

export default async function QuotationEditCompositeScopePage({ params }: PageProps) {
  const { id, compositeId } = await params;
  const quotationId = Number.parseInt(id, 10);
  const numericCompositeId = Number.parseInt(compositeId, 10);
  if (!Number.isFinite(quotationId) || quotationId <= 0) notFound();
  if (!Number.isFinite(numericCompositeId) || numericCompositeId <= 0) notFound();

  redirect(mergeUrlQueryParam(`${routes.dashboard.quotations}/${quotationId}/edit`, "tab", "pricing"));
}
