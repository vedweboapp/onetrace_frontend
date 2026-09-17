import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import LayoutDetails from "@/features/layouts/components/layout-details";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function LayoutPage() {
    return <LayoutDetails />;
}
