"use client";

import FormBuilderForm from "@/features/form-builder/components/form-builder-form";
import React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { projectJobFormHandlers } from "@/features/projects/api/project-job-form.handlers";

const PROJECT_RETURN_TABS = new Set([
  "details",
  "forms",
  "drawings",
  "jobs",
  "location",
  "quotations",
  "jobsheets",
  "docs",
  "approvals",
]);

/**
 * Renders the FormBuilder for both create and edit project job form purposes.
 *
 * For create_project_job_form:
 *   - The project ID (from the route segment [id]) is forwarded to the handler
 *     via ctx.projectTypeId so createForm can inject { project: projectId }.
 *
 * For edit_project_job_form:
 *   - FormBuilder reads layout_id from the URL itself (resolvedLayoutId).
 *   - Optional `return_tab` keeps Close / Save and Close on the originating
 *     project detail tab (e.g. Locations → `location`).
 */
const ProjectJobFormsDetails = () => {
  // The dynamic route segment: /dashboard/projects/[id]/job-forms
  const { id: projectId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const returnTabRaw = searchParams.get("return_tab")?.trim() ?? "";
  const returnTab = PROJECT_RETURN_TABS.has(returnTabRaw) ? returnTabRaw : null;
  const backUrl = returnTab
    ? `/projects/${projectId}?tab=${returnTab}`
    : `/projects/${projectId}`;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <FormBuilderForm
        activeModule="project-form"
        apiHandlers={projectJobFormHandlers}
        projectTypeId={projectId}
        BackUrl={backUrl}
      />
    </div>
  );
};

export default ProjectJobFormsDetails;
