import type { Metadata } from "next";
import LayoutDetails from "@/features/layouts/components/layout-details";
import EditLayoutForm from "@/features/layouts/components/edit-layout-form";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function EditLayoutPage() {
    return <EditLayoutForm />;
}
