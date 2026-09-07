import CreateLayoutForm from "@/features/layouts/components/create-layout-form";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Auth.forgotPassword");
//   return { title: t("title") };
// }

export default async function CreateLayoutPage() {
    return <CreateLayoutForm />;
}
