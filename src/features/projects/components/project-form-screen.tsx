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
import { ProjectTypeFormModal } from "@/features/project-types/components/project-type-form-modal";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
import { createProject, fetchProject, updateProject } from "@/features/projects/api/project.api";
import { createProjectStatus } from "@/features/project-status/api/project-status.api";
import { fetchSite, fetchSitesPage } from "@/features/sites/api/site.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { CreateProjectFormTypeModal } from "@/features/project-forms/components/create-project-form-type-modal";
import { WorkflowColourStatusFormModal } from "@/shared/components/settings/workflow-colour-status-form-modal";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { fetchUserProfile, fetchUsersPage } from "@/features/users/api/user.api";
import {
  resolveAppRoleIdMap,
  resolveUserProfileSelectId,
  userProfileSelectLabel,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { useDropdownCatalogEpoch } from "@/shared/catalog/use-dropdown-catalog-epoch";
import { createProjectFormSchema, type ProjectFormValues } from "@/features/projects/schemas/project-form-schema";
import {
  emptyProjectFormDefaults,
  mapProjectFormToPayload,
  projectToFormDefaults,
} from "@/features/projects/utils/project-form-map";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { reportFormSubmitApiError } from "@/shared/form/report-form-api-error.util";
import { FIELD_MAX_LENGTH, rhfRegisterOptions } from "@/shared/form";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { useQuickCreate, useSettingsQuickAdd } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { clearQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import {
  QUICK_CREATE_CLIENT_PARAM,
  QUICK_CREATE_SELECT_TARGET_PARAM,
  hrefAfterEntityCreate,
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
import { fetchProjectStatusesPage } from "@/features/project-status/api/project-status.api";
import { resolveDefaultProjectStatusId } from "@/features/project-status/utils/project-default-status.util";


type Props = {
  mode: "create" | "edit";
  projectId?: number;
};

export function ProjectFormScreen({ mode, projectId }: Props) {
  const catalogEpoch = useDropdownCatalogEpoch([
    "users",
    "clients",
    "sites",
    "projectTypes",
    "projectStatuses",
    "forms",
  ]);
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
  const [clientSearchQuery, setClientSearchQuery] = React.useState("");
  const [projectClientName, setProjectClientName] = React.useState("");
  const [managerSearchQuery, setManagerSearchQuery] = React.useState("");
  const [managerFallbackLabels, setManagerFallbackLabels] = React.useState<Record<string, string>>({});
  const [projectTypeOptions, setProjectTypeOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [siteOptions, setSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [formOptions, setFormOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [projectStatusOptions, setProjectStatusOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [managerOptions, setManagerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const initialClientsLoaded = React.useRef(false);
  const initialManagersLoaded = React.useRef(false);
  const previousProjectTypeRef = React.useRef<string | null>(null);
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
    setError,
    handleSubmit,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyProjectFormDefaults(),
  });

  const selectedClient = useWatch({ control, name: "client" });
  const selectedProjectType = useWatch({ control, name: "project_type" });

  const reloadClients = React.useCallback(async (searchQuery?: string) => {
    try {
      const { items } = await fetchClientsPage(1, 20, { is_active: true, search: searchQuery, dropdown: true }, { silent: true });
      setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  const reloadManagers = React.useCallback(async (searchQuery?: string) => {
    try {
      const roleIds = await resolveAppRoleIdMap();
      const roleId = roleIds.get("manager");
      if (roleId == null) {
        setManagerOptions([]);
        return;
      }
      const { items } = await fetchUsersPage(1, 20, {
        role: roleId,
        search: searchQuery?.trim() || undefined,
        dropdown: true,
      });
      setManagerOptions(userProfilesToSelectOptions(items));
    } catch {
      setManagerOptions([]);
    }
  }, []);

  React.useEffect(() => {
    if (!initialClientsLoaded.current) {
      initialClientsLoaded.current = true;
      void reloadClients("");
      return;
    }
    const t = setTimeout(() => {
      void reloadClients(clientSearchQuery);
    }, 400);
    return () => clearTimeout(t);
  }, [clientSearchQuery, reloadClients, catalogEpoch]);

  React.useEffect(() => {
    if (!initialManagersLoaded.current) {
      initialManagersLoaded.current = true;
      void reloadManagers("");
      return;
    }
    const t = setTimeout(() => {
      void reloadManagers(managerSearchQuery);
    }, 400);
    return () => clearTimeout(t);
  }, [managerSearchQuery, reloadManagers, catalogEpoch]);

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

  const urlClientId = searchParams.get(QUICK_CREATE_CLIENT_PARAM);
  const lockClient = !isEdit && Boolean(urlClientId && /^\d+$/.test(urlClientId));

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit && !lockClient ? getFormDraft : undefined,
    addDisabled: lockClient,
  });

  const clientIdForQuick =
    selectedClient && /^\d+$/.test(selectedClient) ? Number.parseInt(selectedClient, 10) : undefined;

  const siteFetchSeq = React.useRef(0);
  const reloadSites = React.useCallback(async () => {
    const seq = ++siteFetchSeq.current;
    if (!clientIdForQuick || clientIdForQuick <= 0) {
      setSiteOptions([]);
      return;
    }
    try {
      const { items } = await fetchSitesPage(1, 20, { client: clientIdForQuick, dropdown: true });
      if (seq !== siteFetchSeq.current) return;
      setSiteOptions(items.map((s) => ({ value: String(s.id), label: s.site_name })));
    } catch {
      if (seq === siteFetchSeq.current) setSiteOptions([]);
    }
  }, [clientIdForQuick]);

  const siteQuickCreate = useQuickCreate({
    kind: "site",
    clientId: clientIdForQuick,
    addDisabled: !clientIdForQuick,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

  const [projectTypeModalOpen, setProjectTypeModalOpen] = React.useState(false);
  const [projectStatusModalOpen, setProjectStatusModalOpen] = React.useState(false);
  const [createProjectFormModalOpen, setCreateProjectFormModalOpen] = React.useState(false);

  const projectTypeQuickAdd = useSettingsQuickAdd({
    onOpen: () => setProjectTypeModalOpen(true),
    addLabel: t("placeholders.addProjectType"),
  });
  const projectStatusQuickAdd = useSettingsQuickAdd({
    onOpen: () => setProjectStatusModalOpen(true),
    addLabel: t("placeholders.addProjectStatus"),
  });
  const formsQuickAdd = useSettingsQuickAdd({
    onOpen: () => setCreateProjectFormModalOpen(true),
    addLabel: t("placeholders.addForm"),
    addDisabled: !selectedProjectType,
    getFormDraft: !isEdit ? getFormDraft : undefined,
    returnTo: draftReturnTo,
  });
  const managersQuickCreate = useQuickCreate({
    kind: "user",
    appRole: "manager",
    fieldTarget: "manager_ids",
    getFormDraft: !isEdit ? getFormDraft : undefined,
    returnTo: draftReturnTo,
  });

  const defaultCreateFormProjectTypeId = React.useMemo(() => {
    if (!selectedProjectType || !/^\d+$/.test(selectedProjectType)) return null;
    return Number(selectedProjectType);
  }, [selectedProjectType]);

  const defaultCreateFormProjectTypeLabel = React.useMemo(() => {
    if (!selectedProjectType) return null;
    return projectTypeOptions.find((opt) => opt.value === selectedProjectType)?.label ?? null;
  }, [selectedProjectType, projectTypeOptions]);

  const continueToCreateProjectForm = React.useCallback(
    ({ projectTypeId, installationTypeId }: { projectTypeId: number; installationTypeId: number }) => {
      setCreateProjectFormModalOpen(false);
      const href = `${routes.dashboard.settingsProjectForms}/${projectTypeId}/create?purpose=create_project_form&installation_type_id=${installationTypeId}`;
      router.push(buildPathWithStoredBack(href, draftReturnTo));
    },
    [router, draftReturnTo],
  );

  const ensureSiteInOptions = React.useCallback(async (id: number) => {
    try {
      const site = await fetchSite(id);
      const next = {
        value: String(site.id),
        label: site.site_name?.trim() || `#${site.id}`,
      };
      setSiteOptions((prev) => {
        const idx = prev.findIndex((opt) => opt.value === next.value);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = next;
          return copy;
        }
        return [...prev, next];
      });
    } catch {
      // Keep existing options; chip may still show until sites reload.
    }
  }, []);

  const ensureManagerInOptions = React.useCallback(async (id: number) => {
    try {
      const user = await fetchUserProfile(id);
      const value = String(resolveUserProfileSelectId(user));
      const label = userProfileSelectLabel(user);
      setManagerFallbackLabels((prev) => ({ ...prev, [value]: label }));
      setManagerOptions((prev) => {
        const idx = prev.findIndex((opt) => opt.value === value);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { value, label };
          return copy;
        }
        return [...prev, { value, label }];
      });
      return value;
    } catch {
      return String(id);
    }
  }, []);

  const handleProjectTypeCreated = React.useCallback(
    (row: ProjectType) => {
      const next = { value: String(row.id), label: formatProjectTypeLabel(row) };
      setProjectTypeOptions((prev) => {
        if (prev.some((opt) => opt.value === next.value)) {
          return prev.map((opt) => (opt.value === next.value ? next : opt));
        }
        return [...prev, next];
      });
      setValue("project_type", next.value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

  const handleProjectStatusCreated = React.useCallback(
    (row: WorkflowColourStatus) => {
      const next = { value: String(row.id), label: row.status_name?.trim() || `#${row.id}` };
      setProjectStatusOptions((prev) => {
        if (prev.some((opt) => opt.value === next.value)) {
          return prev.map((opt) => (opt.value === next.value ? next : opt));
        }
        return [...prev, next];
      });
      setValue("project_status", next.value, { shouldDirty: true, shouldValidate: true });
    },
    [setValue],
  );

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
      await reloadManagers(managerSearchQuery);
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        if (lockClient) return;
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("sites", [], { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "site") {
        const current = getValues("sites") ?? [];
        const next = current.includes(selectId) ? current : [...current, selectId];
        setValue("sites", next, { shouldDirty: true, shouldValidate: true });
        const siteId = Number.parseInt(selectId, 10);
        if (Number.isFinite(siteId) && siteId > 0) {
          void ensureSiteInOptions(siteId);
        }
        return;
      }
      if (selectTarget === "user") {
        const userId = Number.parseInt(selectId, 10);
        void (async () => {
          const managerValue =
            Number.isFinite(userId) && userId > 0
              ? await ensureManagerInOptions(userId)
              : selectId;
          const current = getValues("manager_ids") ?? [];
          const next = current.includes(managerValue) ? current : [...current, managerValue];
          setValue("manager_ids", next, { shouldDirty: true, shouldValidate: true });
        })();
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectTypesPage(1, 20, { is_active: true, dropdown: true });
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
  }, [catalogEpoch]);

  // Reload forms when the selected project type changes
  React.useEffect(() => {
    if (!selectedProjectType || !/^\d+$/.test(selectedProjectType)) {
      setFormOptions([]);
      return;
    }

    // Only clear form_ids if project type actually changed (not on initial load)
    if (previousProjectTypeRef.current !== null && previousProjectTypeRef.current !== selectedProjectType) {
      const currentFormIds = getValues("form_ids");
      if (currentFormIds && currentFormIds.length > 0) {
        setValue("form_ids", []);
      }
    }

    // Update the ref after processing
    previousProjectTypeRef.current = selectedProjectType;

    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchFormsPage(
          1,
          20,
          { project_type: selectedProjectType, dropdown: true, is_published: true },
          { silent: true },
        );
        if (!cancelled) {
          setFormOptions(
            items
              .filter((f) => f.is_published !== false)
              .map((f) => ({ value: String(f.id), label: f.name })),
          );
        }
      } catch {
        if (!cancelled) {
          setFormOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedProjectType, setValue, getValues, catalogEpoch]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectStatusesPage(1, 20, { is_active: true, dropdown: true });
        if (!cancelled) {
          setProjectStatusOptions(items.map((pt) => ({ value: String(pt.id), label: pt.status_name })));
          if (!isEdit && !getValues("project_status")?.trim()) {
            const defaultStatusId = resolveDefaultProjectStatusId(items);
            if (defaultStatusId != null) {
              setValue("project_status", String(defaultStatusId), { shouldDirty: false });
            }
          }
        }
      } catch {
        if (!cancelled) setProjectStatusOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, setValue, getValues, catalogEpoch]);

  const siteClientRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    const prev = siteClientRef.current;
    const next = selectedClient ?? "";
    // Skip first paint / draft-restore so an empty initial client does not wipe restored sites.
    if (prev === null) {
      siteClientRef.current = next;
      if (next && /^\d+$/.test(next)) void reloadSites();
      return;
    }
    if (prev === next) return;
    siteClientRef.current = next;
    siteFetchSeq.current += 1;
    if (!next || !/^\d+$/.test(next)) {
      setSiteOptions([]);
      if (prev && /^\d+$/.test(prev)) setValue("sites", []);
      return;
    }
    void reloadSites();
  }, [selectedClient, setValue, reloadSites, catalogEpoch]);

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
          if (row.client && typeof row.client === "object" && row.client.name) {
            setProjectClientName(row.client.name);
          }
          const labels: Record<string, string> = {};
          if (Array.isArray(row.manager_detail)) {
            for (const entry of row.manager_detail) {
              const m = entry?.manager;
              if (m && typeof m === "object") {
                const id = String(m.id);
                const full = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim();
                labels[id] = full || m.username || m.email || `#${id}`;
              }
            }
          } else if (Array.isArray(row.managers)) {
            for (const m of row.managers) {
              if (m && typeof m === "object") {
                const id = String(m.id);
                labels[id] = m.username || m.email || `#${id}`;
              }
            }
          }
          setManagerFallbackLabels(labels);
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
      router.replace(
        hrefAfterEntityCreate({
          createdId: saved.id,
          selectTarget: isEdit ? null : searchParams.get(QUICK_CREATE_SELECT_TARGET_PARAM),
          backHref: safeBack,
          listPath: routes.dashboard.projects,
        }),
      );
    } catch (error) {
      reportFormSubmitApiError(error, setError);
    } finally {
      setSaving(false);
    }
  }

  const noClients = !lockClient && clientOptions.length === 0;
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
              <FormFieldRow cols="2" from="md">
                <FieldGroup label={t("fields.name")} htmlFor="project-name" required>
                  <input
                    id="project-name"
                    aria-invalid={errors.name ? true : undefined}
                    aria-describedby={errors.name ? "project-name-err" : undefined}
                    className={cn(surfaceInputClassName, errors.name && "border-red-500 dark:border-red-500")}
                    {...register("name", {
                      onChange: (e) => {
                        e.target.value = sanitizeTitleInput(e.target.value);
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
                        locked={lockClient}
                        invalid={!!errors.client}
                        onBlur={field.onBlur}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("sites", []);
                        }}
                        onAdd={clientQuickCreate.onAdd}
                        addAriaLabel={clientQuickCreate.addAriaLabel}
                        addLabel={clientQuickCreate.addLabel}
                        onSearchChange={setClientSearchQuery}
                        fallbackLabel={projectClientName}
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
                        disabled={saving}
                        invalid={!!errors.project_type}
                        onBlur={field.onBlur}
                        onAdd={projectTypeQuickAdd.onAdd}
                        addAriaLabel={projectTypeQuickAdd.addAriaLabel}
                        addLabel={projectTypeQuickAdd.addLabel}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.project_type?.message}</FieldErrorText>
                </FieldGroup>
                <FieldGroup label={t("fields.projectStatus")} htmlFor="project-status" required>
                  <Controller
                    control={control}
                    name="project_status"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="project-status"
                        portaled
                        searchable
                        // listLabel={t("fields.projectStatus")}
                        options={projectStatusOptions}
                        value={field.value ?? ""}
                        emptyLabel={t("placeholders.projectStatus")}
                        disabled={saving}
                        invalid={!!errors.project_status}
                        onBlur={field.onBlur}
                        onAdd={projectStatusQuickAdd.onAdd}
                        addAriaLabel={projectStatusQuickAdd.addAriaLabel}
                        addLabel={projectStatusQuickAdd.addLabel}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.project_status?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>
              <FormFieldRow cols="2" from="md">
                <FieldGroup label={t("fields.forms")} htmlFor="project-form-ids">
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
                        disabled={saving || !selectedProjectType}
                        placeholder={
                          selectedProjectType
                            ? t("placeholders.forms")
                            : t("placeholders.formsNeedProjectType")
                        }
                        listLabel={t("fields.forms")}
                        onAdd={formsQuickAdd.onAdd}
                        addAriaLabel={formsQuickAdd.addAriaLabel}
                        addLabel={formsQuickAdd.addLabel}
                      />
                    )}
                  />
                </FieldGroup>
                <FieldGroup label={t("fields.description")} htmlFor="project-description" required>
                  <textarea
                    id="project-description"
                    rows={4}
                    aria-invalid={errors.description ? true : undefined}
                    aria-describedby={errors.description ? "project-desc-err" : undefined}
                    className={cn(
                      surfaceInputClassName,
                      "h-auto min-h-[100px] resize-y overflow-y-auto py-3 leading-5 [field-sizing:fixed]",
                      errors.description && "border-red-500 dark:border-red-500",
                    )}
                    {...register("description", rhfRegisterOptions("description"))}
                    maxLength={FIELD_MAX_LENGTH.DESCRIPTION}
                  />
                  <FieldErrorText id="project-desc-err">{errors.description?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>
              <FormFieldRow cols="2" from="md">
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
                </FieldGroup>
                <FieldGroup label={t("fields.manager")} htmlFor="project-managers">
                  <Controller
                    control={control}
                    name="manager_ids"
                    render={({ field }) => (
                      <MultiCheckSelect
                        id="project-managers"
                        options={managerOptions}
                        values={field.value ?? []}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        disabled={saving}
                        placeholder={t("placeholders.managers")}
                        listLabel={t("fields.manager")}
                        onSearchChange={setManagerSearchQuery}
                        fallbackLabels={managerFallbackLabels}
                        onAdd={managersQuickCreate.onAdd}
                        addAriaLabel={managersQuickCreate.addAriaLabel}
                        addLabel={managersQuickCreate.addLabel}
                      />
                    )}
                  />
                </FieldGroup>
              </FormFieldRow>
              <FormFieldRow cols="2" from="md">
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
                <FieldGroup label={t("fields.endDate")} htmlFor="project-end">
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

      <ProjectTypeFormModal
        open={projectTypeModalOpen}
        onClose={() => setProjectTypeModalOpen(false)}
        onSaved={handleProjectTypeCreated}
      />
      <WorkflowColourStatusFormModal
        open={projectStatusModalOpen}
        onClose={() => setProjectStatusModalOpen(false)}
        translationNamespace="Dashboard.projectStatus"
        formTitleId="project-status-quick-create-form"
        showCategory
        create={createProjectStatus}
        onSaved={handleProjectStatusCreated}
      />
      <CreateProjectFormTypeModal
        open={createProjectFormModalOpen}
        onClose={() => setCreateProjectFormModalOpen(false)}
        onContinue={continueToCreateProjectForm}
        defaultProjectTypeId={defaultCreateFormProjectTypeId}
        defaultProjectTypeLabel={defaultCreateFormProjectTypeLabel}
        lockProjectType
      />
    </div>
  );
}
