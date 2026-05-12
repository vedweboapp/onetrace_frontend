"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useRouter } from "@/i18n/navigation";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { getSessionOrganizationId } from "@/features/auth/utils/get-session-organization-id";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { createProject, fetchProject, updateProject } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
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
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { capitalizeFirstLetter } from "@/shared/utils/capitalize-first-letter.util";
import { AppButton, CheckmarkSelect, FieldErrorText, FieldGroup, FormFieldRow, MultiCheckSelect, SurfaceShell, surfaceInputClassName } from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  projectId?: number;
};

export function ProjectFormScreen({ mode, projectId }: Props) {
  const t = useTranslations("Dashboard.projects");
  const router = useRouter();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "projects");
  const organizations = useAuthStore((s) => s.organizations);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [siteOptions, setSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [organizationIdForEdit, setOrganizationIdForEdit] = React.useState<number | null>(null);

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
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProjectFormDefaults(),
  });

  const selectedClient = useWatch({ control, name: "client" });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500, { is_active: true }, { silent: true });
        if (!cancelled) {
          setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
        }
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!selectedClient || !/^\d+$/.test(selectedClient)) {
      setSiteOptions([]);
      setValue("sites", []);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchSitesPage(1, 500, {
          client: Number.parseInt(selectedClient, 10),
          is_active: true,
        });
        if (!cancelled) {
          setSiteOptions(items.map((s) => ({ value: String(s.id), label: s.site_name })));
        }
      } catch {
        if (!cancelled) setSiteOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedClient, setValue]);

  React.useEffect(() => {
    if (!isEdit || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchProject(projectId);
        if (!cancelled) {
          reset(projectToFormDefaults(row));
          setOrganizationIdForEdit(row.organization);
        }
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
    const organizationId = getSessionOrganizationId(organizations) ?? (isEdit ? organizationIdForEdit : null);
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
      const saved = isEdit && projectId ? await updateProject(projectId, payload) : await createProject(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(`${safeBack}?highlight=${saved.id}`);
    } finally {
      setSaving(false);
    }
  }

  const noClients = clientOptions.length === 0;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="md" disabled={saving} onClick={() => router.push(safeBack ?? routes.dashboard.projects)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="project-upsert-screen-form" variant="primary" size="md" loading={saving} disabled={noClients}>
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
          <form id="project-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
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
                    />
                  )}
                />
                <FieldErrorText>{errors.client?.message}</FieldErrorText>
              </FieldGroup>
            </FormFieldRow>
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
                    disabled={saving || !selectedClient || siteOptions.length === 0}
                    placeholder={t("placeholders.site")}
                    listLabel={t("fields.sites")}
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
        )}
      </SurfaceShell>
    </div>
  );
}
