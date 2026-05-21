import type { ProjectFormValues } from "@/features/projects/schemas/project-form-schema";
import type { Project, ProjectUpsertPayload } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { getProjectTypeId } from "@/features/projects/utils/project-type-id.util";

export function mapProjectFormToPayload(values: ProjectFormValues): ProjectUpsertPayload {
  const clientId = Number.parseInt(values.client, 10);
  const projectTypeId = Number.parseInt(values.project_type, 10);
  const sites = (values.sites ?? [])
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  return {
    name: values.name.trim(),
    client: Number.isFinite(clientId) ? clientId : 0,
    project_type: Number.isFinite(projectTypeId) ? projectTypeId : 0,
    description: values.description.trim(),
    sites,
    start_date: values.start_date.trim(),
    end_date: values.end_date.trim(),
  };
}

export function emptyProjectFormDefaults(): ProjectFormValues {
  return {
    name: "",
    client: "",
    project_type: "",
    description: "",
    sites: [],
    start_date: "",
    end_date: "",
  };
}

export function projectToFormDefaults(project: Project): ProjectFormValues {
  const start = project.start_date?.slice(0, 10) ?? "";
  const end = project.end_date?.slice(0, 10) ?? "";
  const siteIds = Array.isArray(project.sites)
    ? project.sites
        .map((s) => (typeof s === "number" ? s : s?.id))
        .filter((id): id is number => Number.isFinite(id) && id > 0)
        .map(String)
    : [];
  const clientId = getProjectClientId(project);
  const projectTypeId = getProjectTypeId(project);
  return {
    name: project.name ?? "",
    client: clientId ? String(clientId) : "",
    project_type: projectTypeId ? String(projectTypeId) : "",
    description: (project.description ?? "").trim(),
    sites: siteIds,
    start_date: start,
    end_date: end,
  };
}
