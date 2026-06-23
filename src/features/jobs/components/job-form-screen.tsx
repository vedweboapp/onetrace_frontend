"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchProjectFormsByProject } from "@/features/forms/api/forms.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { createJob, fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { createJobFormSchema, type JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import {
  emptyJobFormDefaults,
  jobFormSelectOptions,
  jobToFormDefaults,
  mapJobFormToPayload,
} from "@/features/jobs/utils/job-form-map";
import { resolveDefaultJobStatusId } from "@/features/jobs/utils/job-default-status.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import { formatMoneyDisplay, parseMoneyValue } from "@/features/invoices/utils/invoice-money.util";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildEntityDetailHrefAfterSave, buildPathWithStoredBack, sanitizeJobsBackHref } from "@/shared/utils/detail-from-list.util";
import { useFormBackUrl } from "@/shared/hooks/use-entity-detail-back";
import { ensureCheckmarkOption } from "@/shared/utils/checkmark-options.util";
import { saveQuickCreateFormDraft } from "@/shared/utils/quick-create-form-draft.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  MultiCheckSelect,
  RequiredMark,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  jobId?: number;
};

type Option = { value: string; label: string };

export function JobFormScreen({ mode, jobId }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const tItems = useTranslations("Dashboard.items");
  const tGroups = useTranslations("Dashboard.groups");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const jobsListHref = React.useMemo(() => {
    const needle = routes.dashboard.jobs;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = useFormBackUrl("jobs", jobsListHref);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [workerOptions, setWorkerOptions] = React.useState<Option[]>([]);
  const [formOptions, setFormOptions] = React.useState<Option[]>([]);
  const [jobStatusOptions, setJobStatusOptions] = React.useState<Option[]>([]);
  const [clientOptions, setClientOptions] = React.useState<Option[]>([]);
  const [projectOptions, setProjectOptions] = React.useState<Option[]>([]);
  const [siteOptions, setSiteOptions] = React.useState<Option[]>([]);
  const [groupOptions, setGroupOptions] = React.useState<Option[]>([]);
  const [itemOptions, setItemOptions] = React.useState<Option[]>([]);
  const [itemPriceById, setItemPriceById] = React.useState<Map<number, number>>(new Map());
  const [itemGroupById, setItemGroupById] = React.useState<Map<number, number | null>>(new Map());
  const [groupItemIdsByGroupId, setGroupItemIdsByGroupId] = React.useState<Map<number, Set<number>>>(new Map());

  const schema = React.useMemo(
    () =>
      createJobFormSchema({
        title: t("validation.title"),
        assignedWorker: t("validation.assignedWorker"),
        startDate: t("validation.startDate"),
        optionalId: t("validation.optionalId"),
        compositeQuantity: t("validation.compositeQuantity"),
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
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyJobFormDefaults(),
  });
  const { fields, append, remove } = useFieldArray({ control, name: "job_meta_items" });

  const selectedClient = useWatch({ control, name: "client" });
  const selectedProject = useWatch({ control, name: "project" });
  const jobMetaItems = useWatch({ control, name: "job_meta_items" }) ?? [];

  const clientId = selectedClient && /^\d+$/.test(selectedClient) ? Number.parseInt(selectedClient, 10) : undefined;
  const projectId = selectedProject && /^\d+$/.test(selectedProject) ? Number.parseInt(selectedProject, 10) : undefined;
  const scopeTotal = React.useMemo(
    () =>
      jobMetaItems.reduce((sum, row) => {
        const qty = parseMoneyValue(row.quantity);
        const rate = parseMoneyValue(row.rate);
        return sum + qty * rate;
      }, 0),
    [jobMetaItems],
  );

  const groupLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of groupOptions) m.set(o.value, o.label);
    return m;
  }, [groupOptions]);

  const itemLabelById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const o of itemOptions) m.set(o.value, o.label);
    return m;
  }, [itemOptions]);

  const getFormDraft = React.useCallback(() => getValues(), [getValues]);
  const restoreFormDraft = React.useCallback(
    (draft: unknown) => {
      reset(draft as JobFormValues, { keepDefaultValues: false });
    },
    [reset],
  );

  const clientQuickCreate = useQuickCreate({
    kind: "client",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const projectQuickCreate = useQuickCreate({
    kind: "project",
    clientId,
    addDisabled: !clientId,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const siteQuickCreate = useQuickCreate({
    kind: "site",
    clientId,
    addDisabled: !clientId,
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const groupQuickCreate = useQuickCreate({
    kind: "group",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const itemQuickCreate = useQuickCreate({
    kind: "item",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });
  const draftReturnTo = React.useMemo(() => {
    const qs = searchParams.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }, [pathname, searchParams]);

  const openFormsSettings = React.useCallback(() => {
    saveQuickCreateFormDraft(draftReturnTo, getValues());
    router.push(routes.dashboard.settingsProjectForms);
  }, [router, draftReturnTo, getValues]);
  const openUsersSettings = React.useCallback(() => {
    const qs = searchParams.toString();
    const current = qs ? `${pathname}?${qs}` : pathname;
    saveQuickCreateFormDraft(draftReturnTo, getValues());
    router.push(buildPathWithStoredBack(`${routes.dashboard.settingsUsers}/new`, current));
  }, [router, pathname, searchParams, draftReturnTo, getValues]);
  const openJobStatusSettings = React.useCallback(() => {
    router.push(routes.dashboard.settingsJobStatus);
  }, [router]);

  const reloadClients = React.useCallback(async () => {
    try {
      const { items } = await fetchClientsPage(1, 500, { is_active: true }, { silent: true });
      setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
    } catch {
      setClientOptions([]);
    }
  }, []);

  const reloadProjects = React.useCallback(async () => {
    if (!clientId || clientId <= 0) {
      setProjectOptions([]);
      return;
    }
    try {
      const { items } = await fetchProjectsPage(1, 500, { client: clientId, is_active: true });
      setProjectOptions(items.map((p) => ({ value: String(p.id), label: p.name })));
    } catch {
      setProjectOptions([]);
    }
  }, [clientId]);

  const reloadSites = React.useCallback(async () => {
    if (!projectId || projectId <= 0) {
      setSiteOptions([]);
      return;
    }
    try {
      const { items } = await fetchSitesPage(1, 500, { project: projectId, is_active: true });
      setSiteOptions(items.map((s) => ({ value: String(s.id), label: s.site_name })));
    } catch {
      setSiteOptions([]);
    }
  }, [projectId]);

  const reloadGroupsAndItems = React.useCallback(async () => {
    try {
      const [groups, items] = await Promise.all([fetchGroupsPage(1, 500), fetchItemsPage(1, 500, { isActive: true })]);
      setGroupOptions(groups.items.map((g) => ({ value: String(g.id), label: g.name })));
      setItemOptions(
        items.items.map((it) => ({
          value: String(it.id),
          label: it.name?.trim() || it.sku?.trim() || `#${it.id}`,
        })),
      );
      const prices = new Map<number, number>();
      const groupMap = new Map<number, number | null>();
      for (const it of items.items) {
        const raw = it.selling_price;
        const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
        if (Number.isFinite(n)) prices.set(it.id, n);
        groupMap.set(it.id, typeof it.group === "number" ? it.group : null);
      }
      setItemPriceById(prices);
      setItemGroupById(groupMap);
    } catch {
      setGroupOptions([]);
      setItemOptions([]);
      setItemPriceById(new Map());
      setItemGroupById(new Map());
    }
  }, []);

  useQuickCreateReturn({
    restoreFormDraft,
    onReloadOptions: async () => {
      await reloadClients();
      await reloadProjects();
      await reloadSites();
      await reloadGroupsAndItems();
    },
    onApplySelect: ({ selectTarget, selectId }) => {
      if (selectTarget === "client") {
        setValue("client", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("project", "", { shouldDirty: true });
        setValue("site", "", { shouldDirty: true });
        return;
      }
      if (selectTarget === "project") {
        setValue("project", selectId, { shouldDirty: true, shouldValidate: true });
        setValue("site", "", { shouldDirty: true });
        return;
      }
      if (selectTarget === "site") {
        setValue("site", selectId, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "group") {
        setValue("job_meta_items.0.group", selectId, { shouldDirty: true, shouldValidate: true });
        void fetchGroup(Number.parseInt(selectId, 10))
          .then((g) => {
            setValue("job_meta_items.0.group_name", g.name?.trim() ?? "", { shouldDirty: true });
          })
          .catch(() => {
            setValue("job_meta_items.0.group_name", "", { shouldDirty: true });
          });
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [workers, statuses] = await Promise.all([
          loadTechnicianOptions(),
          fetchJobStatusesPage(1, 500),
        ]);
        if (!cancelled) {
          setWorkerOptions(workers);
          setJobStatusOptions(statuses.items.map((s) => ({ value: String(s.id), label: s.status_name })));
          if (!isEdit) {
            const defaultStatusId = resolveDefaultJobStatusId(statuses.items);
            if (defaultStatusId != null) {
              setValue("job_status", String(defaultStatusId), { shouldDirty: false });
            }
          }
        }
      } catch {
        if (!cancelled) {
          setWorkerOptions([]);
          setJobStatusOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, setValue]);

  React.useEffect(() => {
    void reloadClients();
    void reloadGroupsAndItems();
  }, [reloadClients, reloadGroupsAndItems]);

  React.useEffect(() => {
    if (!selectedClient || !/^\d+$/.test(selectedClient)) {
      setProjectOptions([]);
      return;
    }
    void reloadProjects();
  }, [selectedClient, reloadProjects]);

  React.useEffect(() => {
    if (!selectedProject || !/^\d+$/.test(selectedProject)) {
      setSiteOptions([]);
      setFormOptions([]);
      return;
    }
    void reloadSites();
    (async () => {
      try {
        const forms = await fetchProjectFormsByProject(Number.parseInt(selectedProject, 10), { silent: true });
        setFormOptions((prev) => {
          const byValue = new Map(prev.map((opt) => [opt.value, opt]));
          for (const f of forms) byValue.set(String(f.id), { value: String(f.id), label: f.name });
          return Array.from(byValue.values());
        });
      } catch {
        setFormOptions([]);
      }
    })();
  }, [selectedProject, reloadSites]);

  React.useEffect(() => {
    const groupIds = Array.from(
      new Set(
        jobMetaItems
          .map((row) => row.group.trim())
          .filter((raw) => /^\d+$/.test(raw))
          .map((raw) => Number.parseInt(raw, 10))
          .filter((id) => !groupItemIdsByGroupId.has(id)),
      ),
    );
    if (groupIds.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        groupIds.map(async (groupId) => {
          try {
            const group = await fetchGroup(groupId);
            const ids = new Set<number>();
            for (const entry of group.items ?? []) {
              if (typeof entry.item === "number" && Number.isFinite(entry.item)) ids.add(entry.item);
            }
            return { groupId, ids };
          } catch {
            return { groupId, ids: new Set<number>() };
          }
        }),
      );
      if (cancelled) return;
      setGroupItemIdsByGroupId((prev) => {
        const next = new Map(prev);
        for (const { groupId, ids } of entries) next.set(groupId, ids);
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [groupItemIdsByGroupId, jobMetaItems]);

  React.useEffect(() => {
    jobMetaItems.forEach((row, index) => {
      const itemId = /^\d+$/.test(row.item) ? Number.parseInt(row.item, 10) : null;
      const selectedGroup = /^\d+$/.test(row.group) ? Number.parseInt(row.group, 10) : null;
      if (itemId == null) return;
      const itemGroup = itemGroupById.get(itemId) ?? null;
      if (selectedGroup != null && itemGroup != null && selectedGroup !== itemGroup) {
        setValue(`job_meta_items.${index}.item`, "", { shouldDirty: true });
        setValue(`job_meta_items.${index}.item_name`, "", { shouldDirty: true });
        setValue(`job_meta_items.${index}.rate`, "", { shouldDirty: true });
      }
    });
  }, [itemGroupById, jobMetaItems, setValue]);

  React.useEffect(() => {
    if (!isEdit || !jobId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchJob(jobId);
        if (!cancelled) {
          reset(jobToFormDefaults(row));
          const assignedForms = jobFormSelectOptions(row.forms);
          if (assignedForms.length > 0) {
            setFormOptions((prev) => {
              const byValue = new Map(prev.map((opt) => [opt.value, opt]));
              for (const opt of assignedForms) byValue.set(opt.value, opt);
              return Array.from(byValue.values());
            });
          }
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
  }, [jobId, isEdit, reset, t]);

  async function submit(values: JobFormValues) {
    const payload = mapJobFormToPayload(values);
    setSaving(true);
    try {
      const saved = isEdit && jobId ? await updateJob(jobId, payload) : await createJob(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(buildEntityDetailHrefAfterSave(routes.dashboard.jobs, saved.id, listBack));
    } catch {
      toastError(isEdit ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
  }

  function itemOptionsForGroup(groupIdRaw: string): Option[] {
    if (!/^\d+$/.test(groupIdRaw)) return itemOptions;
    const gid = Number.parseInt(groupIdRaw, 10);
    const explicit = groupItemIdsByGroupId.get(gid);
    if (explicit && explicit.size > 0) {
      return itemOptions.filter((opt) => explicit.has(Number.parseInt(opt.value, 10)));
    }
    return itemOptions.filter((opt) => (itemGroupById.get(Number.parseInt(opt.value, 10)) ?? null) === gid);
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={listBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={isEdit ? t("page.editSubtitle") : t("page.createSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(listBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton type="submit" form="job-upsert-screen-form" variant="primary" size="sm" loading={saving}>
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
          </div>
        ) : screenError ? (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">{screenError}</p>
        ) : (
          <form id="job-upsert-screen-form" className="space-y-8 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.basic")}
              </h2>
              <FieldGroup label={t("fields.title")} htmlFor="job-title" required>
                <input
                  id="job-title"
                  aria-invalid={errors.title ? true : undefined}
                  className={cn(surfaceInputClassName, errors.title && "border-red-500")}
                  disabled={saving}
                  {...register("title")}
                />
                <FieldErrorText>{errors.title?.message}</FieldErrorText>
              </FieldGroup>

              <FieldGroup label={t("fields.description")} htmlFor="job-description">
                <textarea
                  id="job-description"
                  rows={4}
                  className={cn(surfaceTextareaClassName, "min-h-[100px]")}
                  disabled={saving}
                  {...register("description")}
                />
              </FieldGroup>

            
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.relations")}
              </h2>
              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="client"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-client"
                        label={t("fields.client")}
                        options={clientOptions}
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("project", "");
                          setValue("site", "");
                        }}
                        emptyLabel={t("placeholders.client")}
                        disabled={saving}
                        invalid={!!errors.client}
                        listLabel={t("fields.client")}
                        portaled
                        searchable
                        onAdd={clientQuickCreate.onAdd}
                        addAriaLabel={clientQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.client?.message}</FieldErrorText>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="project"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-project"
                        label={t("fields.project")}
                        options={projectOptions}
                        value={field.value}
                        onChange={(v) => {
                          field.onChange(v);
                          setValue("site", "");
                        }}
                        emptyLabel={t("placeholders.project")}
                        disabled={saving || !clientId}
                        invalid={!!errors.project}
                        listLabel={t("fields.project")}
                        portaled
                        searchable
                        onAdd={projectQuickCreate.onAdd}
                        addAriaLabel={projectQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.project?.message}</FieldErrorText>
                    </div>
                  )}
                />
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="site"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-site"
                        label={t("fields.site")}
                        options={siteOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.site")}
                        disabled={saving || !projectId}
                        invalid={!!errors.site}
                        listLabel={t("fields.site")}
                        portaled
                        searchable
                        onAdd={siteQuickCreate.onAdd}
                        addAriaLabel={siteQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.site?.message}</FieldErrorText>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="forms"
                  render={({ field }) => (
                    <div>
                      <FieldGroup label={t("fields.forms")} htmlFor="job-forms">
                        <MultiCheckSelect
                          id="job-forms"
                          options={formOptions}
                          values={field.value ?? []}
                          onChange={(next) => field.onChange(next)}
                          placeholder={t("fields.forms")}
                          disabled={saving || formOptions.length === 0}
                          invalid={!!errors.forms}
                          listLabel={t("fields.forms")}
                          portaled
                          searchable
                          onAdd={openFormsSettings}
                          addAriaLabel={t("placeholders.addForm")}
                          addLabel={t("placeholders.addForm")}
                        />
                      </FieldGroup>
                    </div>
                  )}
                />
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="job_status"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-status"
                        label={t("fields.jobStatus")}
                        options={jobStatusOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.jobStatus")}
                        disabled={saving || jobStatusOptions.length === 0}
                        invalid={!!errors.job_status}
                        listLabel={t("fields.jobStatus")}
                        portaled
                        searchable
                        onAdd={openJobStatusSettings}
                        addAriaLabel="Add job status"
                        addLabel="Add new"
                      />
                      <FieldErrorText>{errors.job_status?.message}</FieldErrorText>
                    </div>
                  )}
                />
                <Controller
                  control={control}
                  name="assigned_worker"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-worker"
                        label={t("fields.assignedWorker")}
                        required
                        options={workerOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.assignedWorker")}
                        disabled={saving || workerOptions.length === 0}
                        invalid={!!errors.assigned_worker}
                        listLabel={t("fields.assignedWorker")}
                        portaled
                        searchable
                        onAdd={openUsersSettings}
                        addAriaLabel="Add user"
                        addLabel="Add new"
                      />
                      <FieldErrorText>{errors.assigned_worker?.message}</FieldErrorText>
                    </div>
                  )}
                />
              </FormFieldRow>
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.schedule")}
              </h2>
              <FormFieldRow cols="1">
                <FieldGroup label={t("fields.startDate")} htmlFor="job-start" required>
                  <SurfaceDateInput
                    id="job-start"
                    type="datetime-local"
                    aria-invalid={errors.start_date ? true : undefined}
                    invalid={!!errors.start_date}
                    disabled={saving}
                    {...register("start_date")}
                  />
                  <FieldErrorText>{errors.start_date?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.jobMeta")}
              </h2>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("sections.jobMeta")}
                </h3>
                <AppButton
                  type="button"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  onClick={() =>
                    append({
                      group: "",
                      group_name: "",
                      item: "",
                      item_name: "",
                      quantity: "1",
                      rate: "",
                    })
                  }
                >
                  <Plus className="size-4" aria-hidden />
                  {t("lineItems.addItem")}
                </AppButton>
              </div>
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                      <th className="px-3 py-2">{tGroups("title")}</th>
                      <th className="px-3 py-2">
                        {tItems("title")}
                        <RequiredMark />
                      </th>
                      <th className="px-3 py-2">{t("lineItems.qty")}</th>
                      <th className="px-3 py-2">{t("lineItems.rate")}</th>
                      <th className="px-3 py-2">{t("lineItems.amount")}</th>
                      <th className="px-3 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((field, index) => {
                      const row = jobMetaItems[index];
                      const qty = parseMoneyValue(row?.quantity);
                      const rate = parseMoneyValue(row?.rate);
                      const amount = qty * rate;
                      const filteredItems = ensureCheckmarkOption(
                        itemOptionsForGroup(row?.group ?? ""),
                        row?.item ?? "",
                        row?.item_name,
                      );
                      return (
                        <tr key={field.id} className="border-b border-slate-100 dark:border-slate-800">
                          <td className="px-3 py-2 align-top">
                            <Controller
                              control={control}
                              name={`job_meta_items.${index}.group`}
                              render={({ field: groupField }) => (
                                <CheckmarkSelect
                                  options={groupOptions}
                                  value={groupField.value}
                                  fallbackLabel={row?.group_name}
                                  onChange={(v) => {
                                    groupField.onChange(v);
                                    setValue(`job_meta_items.${index}.group_name`, v ? (groupLabelById.get(v) ?? "") : "", {
                                      shouldDirty: true,
                                    });
                                    setValue(`job_meta_items.${index}.item`, "", { shouldDirty: true });
                                    setValue(`job_meta_items.${index}.item_name`, "", { shouldDirty: true });
                                    setValue(`job_meta_items.${index}.rate`, "", { shouldDirty: true });
                                  }}
                                  emptyLabel={t("placeholders.plotGroup")}
                                  disabled={saving}
                                  portaled
                                  searchable
                                  size="sm"
                                  clearable
                                  className="h-8"
                                  onAdd={groupQuickCreate.onAdd}
                                  addAriaLabel={groupQuickCreate.addAriaLabel}
                                />
                              )}
                            />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <div className="space-y-2">
                              <Controller
                                control={control}
                                name={`job_meta_items.${index}.item`}
                                render={({ field: itemField }) => (
                                  <CheckmarkSelect
                                    options={filteredItems}
                                    value={itemField.value}
                                    fallbackLabel={row?.item_name}
                                    invalid={!!errors.job_meta_items?.[index]?.item}
                                    onChange={(v) => {
                                      itemField.onChange(v);
                                      setValue(
                                        `job_meta_items.${index}.item_name`,
                                        v ? (itemLabelById.get(v) ?? "") : "",
                                        { shouldDirty: true },
                                      );
                                      if (v && /^\d+$/.test(v)) {
                                        const itemId = Number.parseInt(v, 10);
                                        const price = itemPriceById.get(itemId);
                                        const linkedGroupId = itemGroupById.get(itemId);
                                        if (linkedGroupId != null && linkedGroupId > 0) {
                                          const groupKey = String(linkedGroupId);
                                          setValue(`job_meta_items.${index}.group`, groupKey, {
                                            shouldDirty: true,
                                          });
                                          setValue(
                                            `job_meta_items.${index}.group_name`,
                                            groupLabelById.get(groupKey) ?? "",
                                            { shouldDirty: true },
                                          );
                                        }
                                        const currentQty = parseMoneyValue(jobMetaItems[index]?.quantity);
                                        if (!Number.isFinite(currentQty) || currentQty <= 0) {
                                          setValue(`job_meta_items.${index}.quantity`, "1", {
                                            shouldDirty: true,
                                          });
                                        }
                                        if (price != null && Number.isFinite(price)) {
                                          setValue(`job_meta_items.${index}.rate`, String(price), {
                                            shouldDirty: true,
                                          });
                                        }
                                      }
                                    }}
                                    emptyLabel={t("placeholders.compositeItem")}
                                    disabled={saving}
                                    portaled
                                    searchable
                                    size="sm"
                                    className="h-8"
                                    onAdd={itemQuickCreate.onAdd}
                                    addAriaLabel={itemQuickCreate.addAriaLabel}
                                  />
                                )}
                              />
                              <FieldErrorText>{errors.job_meta_items?.[index]?.item?.message}</FieldErrorText>
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              type="number"
                              min={0}
                              step="any"
                              aria-invalid={errors.job_meta_items?.[index]?.quantity ? true : undefined}
                              className={cn(
                                surfaceInputClassName,
                                "h-8 w-24 px-2.5 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                                errors.job_meta_items?.[index]?.quantity && "border-red-500",
                              )}
                              disabled={saving}
                              {...register(`job_meta_items.${index}.quantity`)}
                            />
                            <FieldErrorText>{errors.job_meta_items?.[index]?.quantity?.message}</FieldErrorText>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <input
                              className={cn(surfaceInputClassName, "h-8 w-28 px-2.5 text-sm")}
                              readOnly
                              tabIndex={-1}
                              aria-readonly
                              {...register(`job_meta_items.${index}.rate`)}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <div className="flex h-8 items-center tabular-nums font-medium">
                              {formatMoneyDisplay(amount, locale)}
                            </div>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <AppButton
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={saving || fields.length <= 1}
                              onClick={() => remove(index)}
                              aria-label={t("lineItems.remove")}
                            >
                              <Trash2 className="size-4 text-red-600" aria-hidden />
                            </AppButton>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="ml-auto max-w-xs rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{t("fields.scopeTotal")}</span>
                  <span className="text-xl font-bold tabular-nums">{formatMoneyDisplay(scopeTotal, locale)}</span>
                </div>
              </div>
            </section>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
