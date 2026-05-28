"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
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
import { routes } from "@/shared/config/routes";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
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
  initialClientId?: string;
  onCreated?: (project: Project) => void;
};

export function ProjectFormModal({
  open,
  onClose,
  mode,
  project,
  clientOptions,
  onSaved,
  initialClientId,
  onCreated,
}: Props) {
  const t = useTranslations("Dashboard.projects");
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [projectTypeOptions, setProjectTypeOptions] = React.useState<ProjectClientOption[]>([]);

  const schema = React.useMemo(
    () =>
      createProjectFormSchema({
        name: t("validation.name"),
        client: t("validation.client"),
        projectType: t("validation.projectType"),
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
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProjectFormDefaults(),
  });

  React.useEffect(() => {
    if (!open) return;
    if (mode === "edit" && project) reset(projectToFormDefaults(project));
    else {
      reset({
        ...emptyProjectFormDefaults(),
        ...(initialClientId ? { client: initialClientId } : {}),
      });
    }
  }, [open, mode, project, reset, initialClientId]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectTypesPage(1, 500, { is_active: true });
        if (!cancelled) {
          setProjectTypeOptions(items.map((pt) => ({ value: String(pt.id), label: formatProjectTypeLabel(pt) })));
        }
      } catch {
        if (!cancelled) setProjectTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function submit(values: ProjectFormValues) {
    const payload = mapProjectFormToPayload(values);
    if (!Number.isFinite(payload.client) || payload.client <= 0) {
      toastError(t("validation.client"));
      return;
    }
    if (!Number.isFinite(payload.project_type) || payload.project_type <= 0) {
      toastError(t("validation.projectType"));
      return;
    }
    setSaving(true);
    try {
      if (mode === "edit" && project) {
        await updateProject(project.id, payload);
        toastSuccess(t("updatedToast"));
      } else {
        const created = await createProject(payload);
        toastSuccess(t("createdToast"));
        onCreated?.(created);
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

  const [localClientOptions, setLocalClientOptions] = React.useState(clientOptions);
  React.useEffect(() => {
    setLocalClientOptions(clientOptions);
  }, [clientOptions]);

  const noClients = localClientOptions.length === 0;
  const noProjectTypes = projectTypeOptions.length === 0;

  const clientQuickCreate = useQuickCreate({ kind: "client" });

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
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => handleCloseAttempt()}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form={FORM_DOM_ID}
            variant="primary"
            size="sm"
            loading={saving}
            disabled={noClients || noProjectTypes}
          >
            {mode === "edit" ? t("modal.saveChanges") : t("modal.save")}
          </AppButton>
        </>
      }
    >
      <>
      <form id={FORM_DOM_ID} className="space-y-6" noValidate onSubmit={handleSubmit(submit)}>
        {noClients ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noClientsHint")}
          </p>
        ) : null}
        {noProjectTypes ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noProjectTypesHint")}
          </p>
        ) : null}

        <FormFieldRow cols="1" className="gap-4 sm:grid-cols-2">
          <FieldGroup label={t("fields.name")} htmlFor="project-name" required>
            <input
              id="project-name"
              aria-invalid={errors.name ? true : undefined}
              aria-describedby={errors.name ? "project-name-err" : undefined}
              className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
              {...register("name", {
                onChange: (e) => {
                  e.target.value = capitalizeFirstLetter(e.target.value);
                },
              })}
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
                  searchable
                  listLabel={t("fields.client")}
                  options={localClientOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.client")}
                  disabled={saving || noClients}
                  invalid={!!errors.client}
                  onBlur={field.onBlur}
                  onChange={field.onChange}
                  onAdd={clientQuickCreate.onAdd}
                  addAriaLabel={clientQuickCreate.addAriaLabel}
                  addLabel={clientQuickCreate.addLabel}
                />
              )}
            />
            <FieldErrorText>{errors.client?.message}</FieldErrorText>
          </FieldGroup>

          <FieldGroup label={t("fields.projectType")} htmlFor="project-type" required>
            <Controller
              control={control}
              name="project_type"
              render={({ field }) => (
                <CheckmarkSelect
                  id="project-type"
                  portaled
                  searchable
                  listLabel={t("fields.projectType")}
                  options={projectTypeOptions}
                  value={field.value}
                  emptyLabel={t("placeholders.projectType")}
                  disabled={saving || noProjectTypes}
                  invalid={!!errors.project_type}
                  onBlur={field.onBlur}
                  onAdd={() => router.push(routes.dashboard.settingsProjectTypes)}
                  addAriaLabel="Add project type"
                  addLabel="Add project type"
                  onChange={field.onChange}
                />
              )}
            />
            <FieldErrorText>{errors.project_type?.message}</FieldErrorText>
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
              "h-auto min-h-[100px] resize-y py-3 leading-5",
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
      </>
    </AppModal>
  );
}
