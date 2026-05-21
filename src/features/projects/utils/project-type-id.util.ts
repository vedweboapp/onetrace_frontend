import type { ProjectTypeRef } from "@/features/projects/types/project.types";
import type { Project } from "@/features/projects/types/project.types";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { projectTypeNameFromRow } from "@/features/project-types/utils/project-type-display.util";

export function projectTypesById(items: ProjectType[]): Record<number, ProjectType> {
  const map: Record<number, ProjectType> = {};
  for (const row of items) map[row.id] = row;
  return map;
}

export function getProjectTypeId(project: Pick<Project, "project_type">): number | null {
  const pt = project.project_type;
  if (pt == null) return null;
  if (typeof pt === "number" && Number.isFinite(pt) && pt > 0) return pt;
  if (typeof pt === "object" && Number.isFinite(pt.id) && pt.id > 0) return pt.id;
  return null;
}

export function resolveProjectTypeChipData(
  project: Pick<Project, "project_type">,
  byId: Record<number, ProjectType>,
): Pick<ProjectType, "id" | "project_type" | "bg_colour" | "text_colour"> | null {
  const pt = project.project_type;
  if (pt && typeof pt === "object") {
    const ref = pt as ProjectTypeRef;
    return {
      id: ref.id,
      project_type: projectTypeNameFromRow(ref) || `Type #${ref.id}`,
      bg_colour: ref.bg_colour ?? "#DBEAFE",
      text_colour: ref.text_colour ?? "#1E40AF",
    };
  }
  const id = getProjectTypeId(project);
  if (!id) return null;
  const row = byId[id];
  if (row) return row;
  return {
    id,
    project_type: `Type #${id}`,
    bg_colour: "#DBEAFE",
    text_colour: "#1E40AF",
  };
}
