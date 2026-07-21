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
  const form_ids = (values.form_ids ?? [])
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  const manager_ids = (values.manager_ids ?? [])
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  return {
    name: values.name.trim(),
    client: Number.isFinite(clientId) ? clientId : 0,
    project_type: Number.isFinite(projectTypeId) ? projectTypeId : 0,
    description: values.description.trim(),
    sites,
    form_ids,
    manager_ids,
    start_date: values.start_date.trim(),
    end_date: values.end_date.trim(),
    project_status: values.project_status ? Number.parseInt(values.project_status, 10) : undefined,
  };
}

export function emptyProjectFormDefaults(): ProjectFormValues {
  return {
    name: "",
    client: "",
    project_type: "",
    description: "",
    sites: [],
    form_ids: [],
    start_date: "",
    end_date: "",
    project_status: "",
    manager_ids: [],
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

  // Resolve form_ids from either explicit form_ids array or nested forms array
  const formIds: string[] = Array.isArray(project.form_ids)
    ? project.form_ids.map(String)
    : Array.isArray(project.forms)
      ? project.forms
          .map((f) => (typeof f === "number" ? f : f?.id))
          .filter((id): id is number => Number.isFinite(id) && id > 0)
          .map(String)
      : [];

  const projectStatusId =
    typeof project.project_status === "object" && project.project_status !== null
      ? project.project_status.id
      : project.project_status;

  let managerIds: string[] = [];
  if (Array.isArray(project.manager_ids)) {
    managerIds = project.manager_ids.map(String);
  } else if (Array.isArray(project.manager_detail)) {
    managerIds = project.manager_detail
      .map((entry) => entry?.manager?.id)
      .filter((id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0)
      .map(String);
  } else if (Array.isArray(project.managers)) {
    managerIds = project.managers
      .map((m: any) => (typeof m === "number" ? m : m?.id))
      .filter((id): id is number => Number.isFinite(id) && id > 0)
      .map(String);
  }

  return {
    name: project.name ?? "",
    client: clientId ? String(clientId) : "",
    project_type: projectTypeId ? String(projectTypeId) : "",
    description: (project.description ?? "").trim(),
    sites: siteIds,
    form_ids: formIds,
    start_date: start,
    end_date: end,
    project_status: projectStatusId ? String(projectStatusId) : "",
    manager_ids: managerIds,
  };
}
