"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import { createJob, fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { createJobFormSchema, type JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import {
  emptyJobFormDefaults,
  jobToFormDefaults,
  mapJobFormToPayload,
} from "@/features/jobs/utils/job-form-map";
import { computeJobMetaPlotTotal, parsePositiveQuantity } from "@/features/jobs/utils/job-meta-payload.util";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { fetchGroupsPage } from "@/features/groups/api/group.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { useQuickCreate } from "@/shared/hooks/use-quick-create";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  FormFieldRow,
  SurfaceShell,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  jobId?: number;
};

type Option = { value: string; label: string };

export function JobFormScreen({ mode, jobId }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "jobs");
  const jobsListHref = React.useMemo(() => {
    const needle = routes.dashboard.jobs;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = safeBack ?? jobsListHref;
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
  const [compositeOptions, setCompositeOptions] = React.useState<Option[]>([]);
  const [compositePriceById, setCompositePriceById] = React.useState<Map<number, number>>(new Map());

  const schema = React.useMemo(
    () =>
      createJobFormSchema({
        title: t("validation.title"),
        assignedWorker: t("validation.assignedWorker"),
        startDate: t("validation.startDate"),
        endDate: t("validation.endDate"),
        endBeforeStart: t("validation.endBeforeStart"),
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

  const selectedClient = useWatch({ control, name: "client" });
  const selectedProject = useWatch({ control, name: "project" });
  const compositeItemId = useWatch({ control, name: "job_meta_composite_item_id" });
  const compositeQuantity = useWatch({ control, name: "job_meta_composite_quantity" });

  const clientId = selectedClient && /^\d+$/.test(selectedClient) ? Number.parseInt(selectedClient, 10) : undefined;
  const projectId = selectedProject && /^\d+$/.test(selectedProject) ? Number.parseInt(selectedProject, 10) : undefined;

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
  const compositeQuickCreate = useQuickCreate({
    kind: "composite-item",
    getFormDraft: !isEdit ? getFormDraft : undefined,
  });

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

  const reloadGroupsAndComposites = React.useCallback(async () => {
    try {
      const [groups, composites] = await Promise.all([fetchGroupsPage(1, 500), fetchCompositeItemsPage(1, 500)]);
      setGroupOptions(groups.items.map((g) => ({ value: String(g.id), label: g.name })));
      setCompositeOptions(
        composites.items.map((c) => ({
          value: String(c.id),
          label: c.name?.trim() || c.sku?.trim() || `#${c.id}`,
        })),
      );
      const prices = new Map<number, number>();
      for (const c of composites.items) {
        const raw = c.selling_price;
        const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw ?? ""));
        if (Number.isFinite(n)) prices.set(c.id, n);
      }
      setCompositePriceById(prices);
    } catch {
      setGroupOptions([]);
      setCompositeOptions([]);
      setCompositePriceById(new Map());
    }
  }, []);

  useQuickCreateReturn({
    restoreFormDraft: !isEdit ? restoreFormDraft : undefined,
    onReloadOptions: async () => {
      await reloadClients();
      await reloadProjects();
      await reloadSites();
      await reloadGroupsAndComposites();
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
        setValue("job_meta_plot_group", selectId, { shouldDirty: true, shouldValidate: true });
        return;
      }
      if (selectTarget === "composite-item") {
        setValue("job_meta_composite_item_id", selectId, { shouldDirty: true, shouldValidate: true });
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [workers, statuses, forms] = await Promise.all([
          loadTechnicianOptions(),
          fetchJobStatusesPage(1, 500),
          fetchFormsPage(1, 500, undefined, { silent: true }),
        ]);
        if (!cancelled) {
          setWorkerOptions(workers);
          setJobStatusOptions(statuses.items.map((s) => ({ value: String(s.id), label: s.status_name })));
          setFormOptions(forms.items.map((f) => ({ value: String(f.id), label: f.name })));
        }
      } catch {
        if (!cancelled) {
          setWorkerOptions([]);
          setJobStatusOptions([]);
          setFormOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    void reloadClients();
    void reloadGroupsAndComposites();
  }, [reloadClients, reloadGroupsAndComposites]);

  React.useEffect(() => {
    if (!selectedClient || !/^\d+$/.test(selectedClient)) {
      setProjectOptions([]);
      setValue("project", "");
      setValue("site", "");
      return;
    }
    void reloadProjects();
  }, [selectedClient, setValue, reloadProjects]);

  React.useEffect(() => {
    if (!selectedProject || !/^\d+$/.test(selectedProject)) {
      setSiteOptions([]);
      setValue("site", "");
      return;
    }
    void reloadSites();
  }, [selectedProject, setValue, reloadSites]);

  React.useEffect(() => {
    if (!isEdit || !jobId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchJob(jobId);
        if (!cancelled) reset(jobToFormDefaults(row));
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

  const plotTotalPreview = React.useMemo(() => {
    const idRaw = (compositeItemId ?? "").trim();
    const qty = parsePositiveQuantity(compositeQuantity ?? "");
    if (!idRaw || !/^\d+$/.test(idRaw) || qty == null) return null;
    const id = Number.parseInt(idRaw, 10);
    return computeJobMetaPlotTotal(qty, compositePriceById.get(id));
  }, [compositeItemId, compositeQuantity, compositePriceById]);

  async function submit(values: JobFormValues) {
    const compositeId = values.job_meta_composite_item_id.trim();
    const sellingPrice =
      compositeId && /^\d+$/.test(compositeId)
        ? compositePriceById.get(Number.parseInt(compositeId, 10))
        : undefined;
    const payload = mapJobFormToPayload(values, { compositeSellingPrice: sellingPrice });
    setSaving(true);
    try {
      const saved = isEdit && jobId ? await updateJob(jobId, payload) : await createJob(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(`${listBack}?highlight=${saved.id}`);
    } catch {
      toastError(isEdit ? t("updateError") : t("createError"));
    } finally {
      setSaving(false);
    }
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
                  className={cn(surfaceInputClassName, "resize-y min-h-[100px]")}
                  disabled={saving}
                  {...register("description")}
                />
              </FieldGroup>

              <FieldGroup label={t("fields.comments")} htmlFor="job-comments">
                <textarea
                  id="job-comments"
                  rows={2}
                  className={cn(surfaceInputClassName, "resize-y min-h-[72px]")}
                  disabled={saving}
                  {...register("comments")}
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
                      <CheckmarkSelect
                        id="job-form"
                        label={t("fields.form")}
                        options={formOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.form")}
                        disabled={saving || formOptions.length === 0}
                        invalid={!!errors.forms}
                        listLabel={t("fields.form")}
                        portaled
                        searchable
                      />
                      <FieldErrorText>{errors.forms?.message}</FieldErrorText>
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
                        options={workerOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.assignedWorker")}
                        disabled={saving || workerOptions.length === 0}
                        invalid={!!errors.assigned_worker}
                        listLabel={t("fields.assignedWorker")}
                        portaled
                        searchable
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
              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.startDate")} htmlFor="job-start" required>
                  <input
                    id="job-start"
                    type="datetime-local"
                    aria-invalid={errors.start_date ? true : undefined}
                    className={cn(surfaceInputClassName, errors.start_date && "border-red-500")}
                    disabled={saving}
                    {...register("start_date")}
                  />
                  <FieldErrorText>{errors.start_date?.message}</FieldErrorText>
                </FieldGroup>
                <FieldGroup label={t("fields.endDate")} htmlFor="job-end">
                  <input
                    id="job-end"
                    type="datetime-local"
                    aria-invalid={errors.end_date ? true : undefined}
                    className={cn(surfaceInputClassName, errors.end_date && "border-red-500")}
                    disabled={saving}
                    {...register("end_date")}
                  />
                  <FieldErrorText>{errors.end_date?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>

              <FieldGroup label={t("fields.recordStatus")} htmlFor="job-active">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input id="job-active" type="checkbox" className="size-4 rounded border-slate-300" disabled={saving} {...register("is_active")} />
                  {t("fields.isActive")}
                </label>
              </FieldGroup>
            </section>

            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.jobMeta")}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">{t("sections.jobMetaHint")}</p>

              <FieldGroup label={t("fields.sectionName")} htmlFor="job-meta-section">
                <input
                  id="job-meta-section"
                  className={surfaceInputClassName}
                  disabled={saving}
                  placeholder={t("placeholders.sectionName")}
                  {...register("job_meta_section_name")}
                />
              </FieldGroup>

              <FormFieldRow cols="2">
                <FieldGroup label={t("fields.plotName")} htmlFor="job-meta-plot">
                  <input
                    id="job-meta-plot"
                    className={surfaceInputClassName}
                    disabled={saving}
                    placeholder={t("placeholders.plotName")}
                    {...register("job_meta_plot_name")}
                  />
                </FieldGroup>
                <Controller
                  control={control}
                  name="job_meta_plot_group"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-meta-group"
                        label={t("fields.plotGroup")}
                        options={groupOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.plotGroup")}
                        disabled={saving}
                        invalid={!!errors.job_meta_plot_group}
                        listLabel={t("fields.plotGroup")}
                        portaled
                        searchable
                        onAdd={groupQuickCreate.onAdd}
                        addAriaLabel={groupQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.job_meta_plot_group?.message}</FieldErrorText>
                    </div>
                  )}
                />
              </FormFieldRow>

              <FormFieldRow cols="2">
                <Controller
                  control={control}
                  name="job_meta_composite_item_id"
                  render={({ field }) => (
                    <div>
                      <CheckmarkSelect
                        id="job-meta-composite"
                        label={t("fields.compositeItem")}
                        options={compositeOptions}
                        value={field.value}
                        onChange={field.onChange}
                        emptyLabel={t("placeholders.compositeItem")}
                        disabled={saving}
                        invalid={!!errors.job_meta_composite_item_id}
                        listLabel={t("fields.compositeItem")}
                        portaled
                        searchable
                        onAdd={compositeQuickCreate.onAdd}
                        addAriaLabel={compositeQuickCreate.addAriaLabel}
                      />
                      <FieldErrorText>{errors.job_meta_composite_item_id?.message}</FieldErrorText>
                    </div>
                  )}
                />
                <FieldGroup label={t("fields.compositeQuantity")} htmlFor="job-meta-qty">
                  <input
                    id="job-meta-qty"
                    type="number"
                    min={0}
                    step="any"
                    aria-invalid={errors.job_meta_composite_quantity ? true : undefined}
                    className={cn(surfaceInputClassName, errors.job_meta_composite_quantity && "border-red-500")}
                    disabled={saving}
                    {...register("job_meta_composite_quantity")}
                  />
                  <FieldErrorText>{errors.job_meta_composite_quantity?.message}</FieldErrorText>
                </FieldGroup>
              </FormFieldRow>

              {plotTotalPreview != null ? (
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t("fields.plotTotal")}: {plotTotalPreview.toFixed(2)}
                </p>
              ) : null}
            </section>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
