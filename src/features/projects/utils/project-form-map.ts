import type { ProjectFormValues } from "@/features/projects/schemas/project-form-schema";
import type { Project, ProjectUpsertPayload } from "@/features/projects/types/project.types";

export function mapProjectFormToPayload(values: ProjectFormValues, organizationId: number): ProjectUpsertPayload {
  const clientId = Number.parseInt(values.client, 10);
  return {
    organization: organizationId,
    name: values.name.trim(),
    client: Number.isFinite(clientId) ? clientId : 0,
    description: values.description.trim(),
    start_date: values.start_date.trim(),
    end_date: values.end_date.trim(),
  };
}

export function emptyProjectFormDefaults(): ProjectFormValues {
  return {
    name: "",
    client: "",
    description: "",
    start_date: "",
    end_date: "",
  };
}

export function projectToFormDefaults(project: Project): ProjectFormValues {
  const start = project.start_date?.slice(0, 10) ?? "";
  const end = project.end_date?.slice(0, 10) ?? "";
  return {
    name: project.name ?? "",
    client: String(project.client),
    description: (project.description ?? "").trim(),
    start_date: start,
    end_date: end,
  };
}
