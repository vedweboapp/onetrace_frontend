import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

/*
 * Composite item scope detail page (disabled). Qty / unit / total show on Scope & Pricing rows.
 *
 * import { getTranslations } from "next-intl/server";
 * import { QuotationCompositeScopeDetailScreen } from "@/features/quotations/components/quotation-composite-scope-detail-screen";
 */

type PageProps = {
  params: Promise<{ locale: string; compositeId: string }>;
};

export const metadata: Metadata = { title: "Composite scope" };

export default async function QuotationNewCompositeScopePage({ params }: PageProps) {
  const { compositeId } = await params;
  const numericId = Number.parseInt(compositeId, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  redirect(mergeUrlQueryParam(`${routes.dashboard.quotations}/new`, "tab", "pricing"));
}
