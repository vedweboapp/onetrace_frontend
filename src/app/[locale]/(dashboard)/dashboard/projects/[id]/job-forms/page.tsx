import ProjectJobFormsDetails from "@/features/projects/components/project-job-forms-details";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
    const t = await getTranslations("Dashboard.projects.formsTab");
    return { title: t("title") };
}

export default async function DashboardProjectFormsPage() {
    return (
        <div className="pb-12">
            <ProjectJobFormsDetails />
        </div>
    );
}
