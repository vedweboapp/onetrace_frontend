import CreateModule from "@/features/modules/components/create-module-page";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function CreateModulePage() {
    return <CreateModule />;
}
