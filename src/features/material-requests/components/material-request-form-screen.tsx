"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job } from "@/features/jobs/types/job.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import {
  createMaterialRequest,
  fetchMaterialRequest,
  updateMaterialRequest,
} from "@/features/material-requests/api/material-request.api";
import { MaterialRequestAddJobsModal } from "@/features/material-requests/components/material-request-add-jobs-modal";
import {
  createMaterialRequestFormSchema,
  type MaterialRequestFormValues,
} from "@/features/material-requests/schemas/material-request-form-schema";
import {
  emptyMaterialRequestFormDefaults,
  mapMaterialRequestFormToPayload,
  materialRequestToFormDefaults,
} from "@/features/material-requests/utils/material-request-form-map";
import {
  buildFormItemsFromJobs,
  buildFormJobsFromJobIds,
  jobClientLabel,
  jobProjectLabel,
} from "@/features/material-requests/utils/material-request-job-items.util";
import { cn } from "@/core/utils/http.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import {
  AppButton,
  CheckmarkSelect,
  FieldErrorText,
  FieldGroup,
  RequiredMark,
  SurfaceDateInput,
  SurfaceShell,
  surfaceInputClassName,
  surfaceTextareaClassName,
} from "@/shared/ui";

type Props = {
  mode: "create" | "edit";
  materialRequestId?: number;
};

export function MaterialRequestFormScreen({ mode, materialRequestId }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const listHref = React.useMemo(() => {
    const needle = routes.dashboard.materialRequests;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "material-requests", listHref);
  const isEdit = mode === "edit";

  const [saving, setSaving] = React.useState(false);
  const [loadingExisting, setLoadingExisting] = React.useState(isEdit);
  const [screenError, setScreenError] = React.useState<string | null>(null);
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [itemLabelById, setItemLabelById] = React.useState<Record<number, string>>({});
  const [selectedJobsById, setSelectedJobsById] = React.useState<Record<number, Job>>({});
  const [jobsModalOpen, setJobsModalOpen] = React.useState(false);
  const [applyingJobs, setApplyingJobs] = React.useState(false);

  const schema = React.useMemo(
    () =>
      createMaterialRequestFormSchema({
        worker: t("validation.worker"),
        requestedDate: t("validation.requestedDate"),
        job: t("validation.job"),
        item: t("validation.item"),
        quantity: t("validation.quantity"),
        atLeastOneJob: t("validation.atLeastOneJob"),
        atLeastOneItem: t("validation.atLeastOneItem"),
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
  } = useForm<MaterialRequestFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyMaterialRequestFormDefaults(),
  });

  const { fields: jobFields, remove: removeJob } = useFieldArray({ control, name: "jobs" });
  const { fields: itemFields, remove: removeItem } = useFieldArray({ control, name: "items" });

  const watchedWorker = useWatch({ control, name: "worker_name" });
  const watchedJobs = useWatch({ control, name: "jobs" }) ?? [];
  const watchedItems = useWatch({ control, name: "items" }) ?? [];

  const workerId =
    watchedWorker && /^\d+$/.test(watchedWorker) ? Number.parseInt(watchedWorker, 10) : null;

  const selectedJobIds = React.useMemo(
    () =>
      watchedJobs
        .map((row) => row.job.trim())
        .filter((raw) => /^\d+$/.test(raw))
        .map((raw) => Number.parseInt(raw, 10)),
    [watchedJobs],
  );

  const selectedJobIdStrings = React.useMemo(
    () => selectedJobIds.map((id) => String(id)),
    [selectedJobIds],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [workers, itemsRes] = await Promise.all([
          loadTechnicianOptions(),
          fetchItemsPage(1, 500, { isActive: true }),
        ]);
        if (cancelled) return;
        setWorkerOptions(workers);
        const labels: Record<number, string> = {};
        for (const item of itemsRes.items) {
          labels[item.id] = item.name?.trim() || item.sku?.trim() || `#${item.id}`;
        }
        setItemLabelById(labels);
      } catch {
        if (!cancelled) {
          setWorkerOptions([]);
          setItemLabelById({});
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const prevWorkerRef = React.useRef<string | undefined>(undefined);
  React.useEffect(() => {
    if (prevWorkerRef.current === undefined) {
      prevWorkerRef.current = watchedWorker;
      return;
    }
    if (prevWorkerRef.current === watchedWorker) return;
    prevWorkerRef.current = watchedWorker;
    setValue("jobs", []);
    setValue("items", []);
    setSelectedJobsById({});
  }, [watchedWorker, setValue]);

  async function hydrateJobsAndItems(jobIds: number[]) {
    const jobs = await Promise.all(jobIds.map((id) => fetchJob(id, { silent: true })));
    const byId: Record<number, Job> = {};
    for (const job of jobs) byId[job.id] = job;
    setSelectedJobsById(byId);
    setValue("jobs", buildFormJobsFromJobIds(jobIds), { shouldDirty: true, shouldValidate: true });
    setValue("items", buildFormItemsFromJobs(jobs), { shouldDirty: true, shouldValidate: true });
  }

  React.useEffect(() => {
    if (!isEdit || !materialRequestId) return;
    let cancelled = false;
    (async () => {
      setLoadingExisting(true);
      setScreenError(null);
      try {
        const row = await fetchMaterialRequest(materialRequestId);
        if (cancelled) return;
        const defaults = materialRequestToFormDefaults(row);
        reset(defaults);

        const jobIds = defaults.jobs
          .map((j) => Number.parseInt(j.job, 10))
          .filter((id) => Number.isFinite(id) && id > 0);

        if (jobIds.length > 0) {
          const jobs = await Promise.all(jobIds.map((id) => fetchJob(id, { silent: true })));
          if (cancelled) return;
          const byId: Record<number, Job> = {};
          for (const job of jobs) byId[job.id] = job;
          setSelectedJobsById(byId);
        }

        for (const line of row.items ?? []) {
          const item = line.item;
          if (item && typeof item === "object" && item.name?.trim()) {
            setItemLabelById((prev) => ({
              ...prev,
              [item.id]: item.name!.trim(),
            }));
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
  }, [isEdit, materialRequestId, reset, t]);

  async function handleJobsModalConfirm(jobIds: number[]) {
    setApplyingJobs(true);
    try {
      await hydrateJobsAndItems(jobIds);
    } finally {
      setApplyingJobs(false);
    }
  }

  function handleRemoveJob(jobId: number) {
    const index = watchedJobs.findIndex((row) => row.job === String(jobId));
    if (index >= 0) removeJob(index);

    const itemIndexes = watchedItems
      .map((row, i) => (row.job === String(jobId) ? i : -1))
      .filter((i) => i >= 0)
      .sort((a, b) => b - a);
    for (const i of itemIndexes) removeItem(i);

    setSelectedJobsById((prev) => {
      const next = { ...prev };
      delete next[jobId];
      return next;
    });
  }

  function itemDisplayName(itemIdRaw: string): string {
    const id = Number.parseInt(itemIdRaw, 10);
    if (Number.isFinite(id) && itemLabelById[id]) return itemLabelById[id];
    return itemIdRaw ? `#${itemIdRaw}` : "—";
  }

  function jobDisplayTitle(jobIdRaw: string): string {
    const id = Number.parseInt(jobIdRaw, 10);
    const job = Number.isFinite(id) ? selectedJobsById[id] : undefined;
    return job?.title?.trim() || (jobIdRaw ? `#${jobIdRaw}` : "—");
  }

  async function submit(values: MaterialRequestFormValues) {
    const payload = mapMaterialRequestFormToPayload(values);
    setSaving(true);
    try {
      const saved =
        isEdit && materialRequestId
          ? await updateMaterialRequest(materialRequestId, payload)
          : await createMaterialRequest(payload);
      toastSuccess(isEdit ? t("updatedToast") : t("createdToast"));
      router.replace(`${safeBack}/${saved.id}?back=${encodeURIComponent(safeBack)}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={isEdit ? t("page.editTitle") : t("page.createTitle")}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={t("page.formSubtitle")}
        actions={
          <div className="flex items-center gap-2">
            <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={() => router.push(safeBack)}>
              {t("modal.cancel")}
            </AppButton>
            <AppButton
              type="submit"
              form="material-request-upsert-screen-form"
              variant="primary"
              size="sm"
              loading={saving}
            >
              {isEdit ? t("modal.saveChanges") : t("modal.submit")}
            </AppButton>
          </div>
        }
      />

      <MaterialRequestAddJobsModal
        open={jobsModalOpen}
        workerId={workerId}
        initialSelectedIds={selectedJobIdStrings}
        onClose={() => setJobsModalOpen(false)}
        onConfirm={handleJobsModalConfirm}
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
          <form
            id="material-request-upsert-screen-form"
            className="space-y-8 p-4 sm:p-6"
            noValidate
            onSubmit={handleSubmit(submit)}
          >
            <section className="space-y-6">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.general")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <FieldGroup label={t("fields.workerName")} htmlFor="mr-worker" required>
                  <Controller
                    control={control}
                    name="worker_name"
                    render={({ field }) => (
                      <CheckmarkSelect
                        id="mr-worker"
                        portaled
                        searchable
                        listLabel={t("fields.workerName")}
                        options={workerOptions}
                        value={field.value}
                        emptyLabel={t("placeholders.worker")}
                        disabled={saving || applyingJobs}
                        invalid={!!errors.worker_name}
                        onBlur={field.onBlur}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <FieldErrorText>{errors.worker_name?.message}</FieldErrorText>
                </FieldGroup>

                <FieldGroup label={t("fields.requestedDate")} htmlFor="mr-requested-date" required>
                  <SurfaceDateInput
                    id="mr-requested-date"
                    type="date"
                    aria-invalid={errors.requested_date ? true : undefined}
                    invalid={!!errors.requested_date}
                    disabled={saving}
                    {...register("requested_date")}
                  />
                  <FieldErrorText>{errors.requested_date?.message}</FieldErrorText>
                </FieldGroup>

                <FieldGroup label={t("fields.status")} htmlFor="mr-status">
                  <input
                    id="mr-status"
                    readOnly
                    className={cn(surfaceInputClassName, "cursor-default bg-slate-50 dark:bg-slate-900/60")}
                    disabled={saving}
                    {...register("status")}
                  />
                </FieldGroup>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {t("sections.jobs")}
                </h2>
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={saving || applyingJobs || workerId == null}
                  onClick={() => setJobsModalOpen(true)}
                >
                  <Plus className="size-4" aria-hidden />
                  {t("jobs.add")}
                </AppButton>
              </div>

              {jobFields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  {workerId == null ? t("jobs.selectWorkerFirst") : t("jobs.emptyHint")}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[640px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                        <th className="px-3 py-2">{t("jobs.details")}</th>
                        <th className="px-3 py-2">{t("fields.projectName")}</th>
                        <th className="px-3 py-2">{t("fields.clientName")}</th>
                        <th className="px-3 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {selectedJobIds.map((jobId) => {
                        const job = selectedJobsById[jobId];
                        return (
                          <tr key={jobId} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {job?.title?.trim() || `#${jobId}`}
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {job ? jobProjectLabel(job) : "—"}
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {job ? jobClientLabel(job) : "—"}
                            </td>
                            <td className="px-3 py-3">
                              <AppButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={saving || applyingJobs}
                                aria-label={t("jobs.remove")}
                                onClick={() => handleRemoveJob(jobId)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </AppButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <FieldErrorText>{errors.jobs?.message}</FieldErrorText>
            </section>

            <section className="space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t("sections.items")}
              </h2>

              {itemFields.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700">
                  {jobFields.length === 0 ? t("items.emptyNoJobs") : t("items.emptyNoMeta")}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full min-w-[720px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/60">
                        <th className="px-3 py-2">
                          {t("lineItems.itemName")}
                          <RequiredMark />
                        </th>
                        <th className="px-3 py-2">{t("lineItems.jobName")}</th>
                        <th className="px-3 py-2">
                          {t("lineItems.requestQty")}
                          <RequiredMark />
                        </th>
                        <th className="px-3 py-2 w-12" />
                      </tr>
                    </thead>
                    <tbody>
                      {itemFields.map((field, index) => {
                        const row = watchedItems[index];
                        return (
                          <tr key={field.id} className="border-b border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                              {itemDisplayName(row?.item ?? "")}
                              <input type="hidden" {...register(`items.${index}.item`)} />
                              <input type="hidden" {...register(`items.${index}.job`)} />
                              <FieldErrorText>{errors.items?.[index]?.item?.message}</FieldErrorText>
                            </td>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-400">
                              {jobDisplayTitle(row?.job ?? "")}
                              <FieldErrorText>{errors.items?.[index]?.job?.message}</FieldErrorText>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <input
                                type="number"
                                min={1}
                                step="any"
                                aria-invalid={errors.items?.[index]?.quantity ? true : undefined}
                                className={cn(
                                  surfaceInputClassName,
                                  "h-8 w-24 px-2.5 text-sm",
                                  errors.items?.[index]?.quantity && "border-red-500",
                                )}
                                disabled={saving}
                                {...register(`items.${index}.quantity`)}
                              />
                              <FieldErrorText>{errors.items?.[index]?.quantity?.message}</FieldErrorText>
                            </td>
                            <td className="px-3 py-3 align-top">
                              <AppButton
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={saving}
                                aria-label={t("lineItems.remove")}
                                onClick={() => removeItem(index)}
                              >
                                <Trash2 className="size-4" aria-hidden />
                              </AppButton>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <FieldErrorText>{errors.items?.message}</FieldErrorText>
            </section>

            <FieldGroup label={t("fields.notes")} htmlFor="mr-notes">
              <textarea
                id="mr-notes"
                rows={4}
                className={surfaceTextareaClassName}
                disabled={saving}
                {...register("notes")}
              />
            </FieldGroup>
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
