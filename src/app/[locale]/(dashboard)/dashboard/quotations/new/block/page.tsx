import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";


export const metadata: Metadata = { title: "Block scope" };

export default function QuotationNewBlockScopePage() {
  redirect(mergeUrlQueryParam(`${routes.dashboard.quotations}/new`, "tab", "pricing"));
}
