import type { Metadata } from "next";
import { redirect } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";


type PageProps = {
  params: Promise<{ locale: string }>;
};

export const metadata: Metadata = { title: "Block scope" };

export default async function QuotationNewBlockScopePage({ params }: PageProps) {
  const { locale } = await params;
  redirect({
    href: mergeUrlQueryParam(`${routes.dashboard.quotations}/new`, "tab", "pricing"),
    locale,
  });
}
