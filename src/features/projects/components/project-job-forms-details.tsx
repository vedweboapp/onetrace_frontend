"use client";

import FormBuilderForm from "@/features/form-builder/components/form-builder-form";
import React from "react";
import { useParams } from "next/navigation";
import { projectJobFormHandlers } from "@/features/projects/api/project-job-form.handlers";

/**
 * Renders the FormBuilder for both create and edit project job form purposes.
 *
 * For create_project_job_form:
 *   - The project ID (from the route segment [id]) is forwarded to the handler
 *     via ctx.projectTypeId so createForm can inject { project: projectId }.
 *
 * For edit_project_job_form:
 *   - FormBuilder reads layout_id from the URL itself (resolvedLayoutId).
 *   - No extra context is needed here.
 */
const ProjectJobFormsDetails = () => {
  // The dynamic route segment: /dashboard/projects/[id]/job-forms
  const { id: projectId } = useParams<{ id: string }>();

  return (
    <div>
      <FormBuilderForm
        activeModule="project-form"
        apiHandlers={projectJobFormHandlers}
        projectTypeId={projectId}
      />
    </div>
  );
};

export default ProjectJobFormsDetails;