"use client";

import FormBuilderForm from "@/features/form-builder/components/form-builder-form";
import React from "react";
import { useParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { projectFormHandlers } from "../api/project-form.handlers";
import { routes } from "@/shared/config/routes";
import { readBackHrefForPath } from "@/shared/utils/detail-from-list.util";

export const CreateProjectTypeForm = () => {
  const { id } = useParams<{ id: string }>();
  const pathname = usePathname();
  const backUrl = readBackHrefForPath(pathname) ?? routes.dashboard.settingsProjectForms;

  return (
    <div>
      <FormBuilderForm
        activeModule="project-form"
        apiHandlers={projectFormHandlers}
        projectTypeId={id}
        BackUrl={backUrl}
      />
    </div>
  );
};
