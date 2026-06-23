"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
import { createProject, fetchProject, updateProject } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { createProjectFormSchema, type ProjectFormValues } from "@/features/projects/schemas/project-form-schema";
import {
  emptyProjectFormDefaults,
  mapProjectFormToPayload,
  projectToFormDefaults,
} from "@/features/projects/utils/project-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import { buildEntityDetailHrefAfterSave } from "@/shared/utils/detail-from-list.util";
import {
  QUICK_CREATE_CLIENT_PARAM,
  resolveFormBackUrl,
} from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  MultiCheckSelect,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  projectId?: number;
};

export function ProjectFormScreen({ mode, projectId }: Props) {
  const t = useTranslations("Dashboard.projects");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = useFormBackUrl("projects", routes.dashboard.projects);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [projectTypeOptions, setProjectTypeOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [siteOptions, setSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [formOptions, setFormOptions] = React.useState<{ value: string; label: string }[]>([]);

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
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProjectFormDefaults(),
  });

  const selectedClient = useWatch({ control, name: "client" });
  const selectedProjectType = useWatch({ control, name: "project_type" });

  const reloadClients = React.useCallback(async () => {
    try {
      const { items } = await fetchClientsPage(1, 500, { is_active: true }, { silent: true });
      setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  React.useEffect(() => {
    void reloadClients();
  }, [reloadClients]);

  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const getFormDraft = React.useCallback(() => getValues(), [getValues]);
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      reset(draft as ProjectFormValues, { keepDefaultValues: false });
    },
    [reset],
  );

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  const clientIdForQuick =
    selectedClient && /^\d+$/.test(selectedClient) ? Number.parseInt(selectedClient, 10) : undefined;

  const reloadSites = React.useCallback(async () => {
    if (!clientIdForQuick || clientIdForQuick <= 0) {
      setSiteOptions([]);
      return;
    }
    try {
      const { items } = await fetchSitesPage(1, 500, { client: clientIdForQuick, is_active: true });
      setSiteOptions(items.map((s) => ({ value: String(s.id), label: s.site_name })));
    } catch {
      setSiteOptions([]);
    }
  }, [clientIdForQuick]);

  const siteQuickCreate = useQuickCreate({
    kind: "site",
    clientId: clientIdForQuick,
    addDisabled: !clientIdForQuick,
  });

  React.useEffect(() => {
    if (isEdit) return;
    const presetClient = searchParams.get(QUICK_CREATE_CLIENT_PARAM);
    if (!presetClient || !/^\d+$/.test(presetClient)) return;
    setValue("client", presetClient, { shouldDirty: true, shouldValidate: true });
  }, [isEdit, searchParams, setValue]);

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: async () => {
      await reloadClients();
      await reloadSites();
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("sites", [], { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "site") {
        setValue("sites", [selectId], { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  React.useEffect(() => {
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
  }, []);

  // Reload forms when the selected project type changes
  React.useEffect(() => {
    if (!selectedProjectType || !/^\d+$/.test(selectedProjectType)) {
      setFormOptions([]);
      setValue("form_ids", []);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchFormsPage(1, 500, { project_type: selectedProjectType }, { silent: true });
        if (!cancelled) {
          setFormOptions(items.map((f) => ({ value: String(f.id), label: f.name })));
        }
      } catch {
        if (!cancelled) setFormOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectType, setValue]);

  React.useEffect(() => {
    if (!selectedClient || !/^\d+$/.test(selectedClient)) {
      setSiteOptions([]);
      setValue("sites", []);
      return;
    }
    void reloadSites();
  }, [selectedClient, setValue, reloadSites]);

  React.useEffect(() => {
    if (!isEdit || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchProject(projectId);
        if (!cancelled) reset(projectToFormDefaults(row));
      } catch {
        if (!cancelled) setScreenError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoadingExisting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, projectId, reset, t]);

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
      const saved = isEdit && projectId ? await updateProject(projectId, payload) : await createProject(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      if (!isEdit) clearQuickCreateFormDraft(draftReturnTo);
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.projects, saved.id, safeBack));
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;
  const noProjectTypes = projectTypeOptions.length === 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack ?? routes.dashboard.projects)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="submit"
              form="project-upsert-screen-form"
              variant="primary"
              size="sm"
              loading={saving}
              disabled={noClients || noProjectTypes}
            >
              {isEdit ? t("modal.saveChanges") : t("modal.save")}
            </AppButton>
          </div>
        }
      />
      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loadingExisting ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : screenError ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{screenError}</p>
          </div>
        ) : (
          <>
          <form id="project-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
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
                      options={clientOptions}
                      value={field.value}
                      emptyLabel={t("placeholders.client")}
                      disabled={saving || noClients}
                      invalid={!!errors.client}
                      onBlur={field.onBlur}
                      onChange={(v) => {
                        field.onChange(v);
                        setValue("sites", []);
                      }}
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
            <FieldGroup label="Forms" htmlFor="project-form-ids">
              <Controller
                control={control}
                name="form_ids"
                render={({ field }) => (
                  <MultiCheckSelect
                    id="project-form-ids"
                    options={formOptions}
                    values={field.value ?? []}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={saving || !selectedProjectType || formOptions.length === 0}
                    placeholder="Select forms..."
                    listLabel="Forms"
                  />
                )}
              />
              {selectedProjectType && formOptions.length === 0 && (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">No forms found for this project type.</p>
              )}
            </FieldGroup>
            <FieldGroup label={t("fields.sites")} htmlFor="project-sites">
              <Controller
                control={control}
                name="sites"
                render={({ field }) => (
                  <MultiCheckSelect
                    id="project-sites"
                    options={siteOptions}
                    values={field.value ?? []}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    disabled={saving || !selectedClient}
                    placeholder={t("placeholders.site")}
                    listLabel={t("fields.sites")}
                    onAdd={siteQuickCreate.onAdd}
                    addAriaLabel={siteQuickCreate.addAriaLabel}
                    addLabel={siteQuickCreate.addLabel}
                  />
                )}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t("hints.sitesMultiSelect")}</p>
            </FieldGroup>
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
                <SurfaceDateInput
                  id="project-start"
                  type="date"
                  aria-invalid={errors.start_date ? true : undefined}
                  aria-describedby={errors.start_date ? "project-start-err" : undefined}
                  invalid={!!errors.start_date}
                  {...register("start_date")}
                />
                <FieldErrorText id="project-start-err">{errors.start_date?.message}</FieldErrorText>
              </FieldGroup>
              <FieldGroup label={t("fields.endDate")} htmlFor="project-end" required>
                <SurfaceDateInput
                  id="project-end"
                  type="date"
                  aria-invalid={errors.end_date ? true : undefined}
                  aria-describedby={errors.end_date ? "project-end-err" : undefined}
                  invalid={!!errors.end_date}
                  {...register("end_date")}
                />
                <FieldErrorText id="project-end-err">{errors.end_date?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>
          </form>
          </>
        )}
      </SurfaceShell>
    </div>
  );
}
