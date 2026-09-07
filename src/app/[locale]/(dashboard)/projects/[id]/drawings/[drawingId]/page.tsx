import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProjectDrawingEditorScreen } from "@/features/projects/components/project-drawing-editor-screen";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard.projects.drawings.editor");
  return { title: t("title") };
}

type PageProps = {
  params: Promise<{ locale: string; id: string; drawingId: string }>;
};

export default async function DashboardProjectDrawingEditorPage({ params }: PageProps) {
  const { id, drawingId } = await params;
  const projectId = Number.parseInt(id, 10);
  const levelId = Number.parseInt(drawingId, 10);
  if (!Number.isFinite(projectId) || projectId <= 0) notFound();
  if (!Number.isFinite(levelId) || levelId <= 0) notFound();

  return <ProjectDrawingEditorScreen projectId={projectId} drawingId={levelId} />;
}

