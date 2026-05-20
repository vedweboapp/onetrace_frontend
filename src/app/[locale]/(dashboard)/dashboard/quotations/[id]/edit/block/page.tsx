import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

/*
 * Block scope detail page (disabled). See `quotations/new/block/page.tsx`.
 *
 * import { getTranslations } from "next-intl/server";
 * import { QuotationBlockScopeDetailScreen } from "@/features/quotations/components/quotation-block-scope-detail-screen";
 */

type PageProps = {
  params: Promise<{ locale: string; id: string }>;
};

export const metadata: Metadata = { title: "Block scope" };

export default async function QuotationEditBlockScopePage({ params }: PageProps) {
  const { id } = await params;
  const quotationId = Number.parseInt(id, 10);
  if (!Number.isFinite(quotationId) || quotationId <= 0) notFound();

  redirect(mergeUrlQueryParam(`${routes.dashboard.quotations}/${quotationId}/edit`, "tab", "pricing"));
}
