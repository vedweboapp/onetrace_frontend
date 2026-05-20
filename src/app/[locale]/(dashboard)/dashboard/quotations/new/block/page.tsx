import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

/*
 * Block scope detail page (disabled). Composite breakdown is shown inline on Scope & Pricing.
 *
 * import { getTranslations } from "next-intl/server";
 * import { QuotationBlockScopeDetailScreen } from "@/features/quotations/components/quotation-block-scope-detail-screen";
 *
 * export async function generateMetadata(): Promise<Metadata> {
 *   const t = await getTranslations("Dashboard.quotations.blockScope");
 *   return { title: t("metaTitle") };
 * }
 *
 * export default function QuotationNewBlockScopePage() {
 *   return (
 *     <QuotationBlockScopeDetailScreen
 *       defaultBackHref={mergeUrlQueryParam(`${routes.dashboard.quotations}/new`, "tab", "pricing")}
 *     />
 *   );
 * }
 */

export const metadata: Metadata = { title: "Block scope" };

export default function QuotationNewBlockScopePage() {
  redirect(mergeUrlQueryParam(`${routes.dashboard.quotations}/new`, "tab", "pricing"));
}
