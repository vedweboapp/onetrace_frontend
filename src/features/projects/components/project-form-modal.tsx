"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { createProject, updateProject } from "@/features/projects/api/project.api";
import { createProjectFormSchema, type ProjectFormValues } from "@/features/projects/schemas/project-form-schema";
import type { Project } from "@/features/projects/types/project.types";
import {
  emptyProjectFormDefaults,
  mapProjectFormToPayload,
  projectToFormDefaults,
} from "@/features/projects/utils/project-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  surfaceInputClassName,
} from "@/shared/ui";

const FORM_DOM_ID = "project-upsert-form";

export type ProjectClientOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  project: Project | null;
  clientOptions: ProjectClientOption[];
  onSaved: () => void;
};

export function ProjectFormModal({ open, onClose, mode, project, clientOptions, onSaved }: Props) {
  const t = useTranslations("Dashboard.projects");
  const organizations = useAuthStore((s) => s.organizations);
  const [saving, setSaving] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createProjectFormSchema({
        name: t("validation.name"),
        client: t("validation.client"),
        description: t("validation.description"),
        startDate: t("validation.startDate"),
        endDate: t("validation.endDate"),
        dateOrder: t("validation.dateOrder"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProjectFormDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) reset(projectToFormDefaults(project));
    else reset(emptyProjectFormDefaults());
  }, [open, mode, project, reset]);

  async function submit(values: ProjectFormValues) {
    const organizationId =
      getSessionOrganizationId(organizations) ??
      (mode === "edit" && project ? project.organization : null);
    if (organizationId == null) {
      toastError(t("missingOrganization"));
      return;
    }
    const payload = mapProjectFormToPayload(values, organizationId);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && project) {
        await updateProject(project.id, payload);
        toastSuccess(t("updatedToast"));
      } else {
        await createProject(payload);
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  function handleCloseAttempt() {
    if (!saving) onClose();
  }

  const noClients = clientOptions.length === 0;

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={mode === "edit" ? t("modal.editTitle") : t("modal.createTitle")}
      titleId="project-modal-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      size="2xl"
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => handleCloseAttempt()}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form={FORM_DOM_ID}
            variant="primary"
            size="md"
            loading={saving}
            disabled={noClients}
          >
            {mode === "edit" ? t("modal.saveChanges") : t("modal.save")}
          </AppButton>
        </>
      }
    >
      <form id={FORM_DOM_ID} className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
        {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null}

        <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
          <FieldGroup label={t("fields.name")} htmlFor="project-name" required>
            <input
              id="project-name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "project-name-err" : undefined}
              className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
              {...register("name")}
            />
            <FieldErrorText id="project-name-err">{errors.name?.message}</FieldErrorText>
          </FieldGroup>

          <FieldGroup label={t("fields.client")} htmlFor="project-client" required>
            <Controller
              control={control}
              name="client"
              render={({ field }) => (
                <CheckmarkSelect
                  id="project-client"
                  portaled
                  listLabel={t("fields.client")}
                  options={clientOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.client")}
                  disabled={saving || noClients}
                  invalid={!!errors.client}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                />
              )}
            />
            <FieldErrorText>{errors.client?.message}</FieldErrorText>
          </FieldGroup>
        </FormFieldRow>

        <FieldGroup label={t("fields.description")} htmlFor="project-description" required>
          <textarea
            id="project-description"
            rows={4}
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? "project-desc-err" : undefined}
            className={cn(
              surfaceInputClassName,
              "min-h-[100px] resize-y",
              errors.description && "border-red-500 dark:border-red-500",
            )}
            {...register("description")}
          />
          <FieldErrorText id="project-desc-err">{errors.description?.message}</FieldErrorText>
        </FieldGroup>

        <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
          <FieldGroup label={t("fields.startDate")} htmlFor="project-start" required>
            <input
              id="project-start"
              type="date"
              aria-invalid={errors.start_date ? true : undefined}
              aria-describedby={errors.start_date ? "project-start-err" : undefined}
              className={cn(surfaceInputClassName, errors.start_date && "border-red-500 dark:border-red-500")}
              {...register("start_date")}
            />
            <FieldErrorText id="project-start-err">{errors.start_date?.message}</FieldErrorText>
          </FieldGroup>
          <FieldGroup label={t("fields.endDate")} htmlFor="project-end" required>
            <input
              id="project-end"
              type="date"
              aria-invalid={errors.end_date ? true : undefined}
              aria-describedby={errors.end_date ? "project-end-err" : undefined}
              className={cn(surfaceInputClassName, errors.end_date && "border-red-500 dark:border-red-500")}
              {...register("end_date")}
            />
            <FieldErrorText id="project-end-err">{errors.end_date?.message}</FieldErrorText>
          </FieldGroup>
        </FormFieldRow>
      </form>
    </AppModal>
  );
}
