import { CreateProjectTypeForm } from "@/features/project-forms/components/create-project-type-from";
// import type { Metadata } from "next";
// import { Suspense } from "react";
// import { getTranslations } from "next-intl/server";
// import { QuotationsPanel } from "@/features/quotations/components/quotations-panel";

// export async function generateMetadata(): Promise<Metadata> {
//   const t = await getTranslations("Dashboard.quotations");
//   return { title: t("metaTitle") };
// }
export default async function ProjectTypeCreateFormPage() {
    return (
        <div className="pb-12">
            <CreateProjectTypeForm />
        </div>
    );
}
