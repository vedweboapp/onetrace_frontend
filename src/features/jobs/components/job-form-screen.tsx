"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { usePathname, useRouter } from "@/i18n/navigation";
import { createJob, fetchJob, updateJob } from "@/features/jobs/api/job.api";
import { createJobFormSchema, type JobFormValues } from "@/features/jobs/schemas/job-form-schema";
import {
  emptyJobFormDefaults,
  jobToFormDefaults,
  mapJobFormToPayload,
} from "@/features/jobs/utils/job-form-map";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
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
  const [workerOptions, setWorkerOptions] = React.useState<{ value: string; label: string }[]>([]);

  const schema = React.useMemo(
    () =>
      createJobFormSchema({
        title: t("validation.title"),
        assignedWorker: t("validation.assignedWorker"),
        startDate: t("validation.startDate"),
        endDate: t("validation.endDate"),
        endBeforeStart: t("validation.endBeforeStart"),
      }),
    [t],
  );

  const {
    control,
    register,
    reset,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyJobFormDefaults(),
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const opts = await loadTechnicianOptions();
        if (!cancelled) setWorkerOptions(opts);
      } catch {
        if (!cancelled) setWorkerOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

  async function submit(values: JobFormValues) {
    const payload = mapJobFormToPayload(values);
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
          <form id="job-upsert-screen-form" className="space-y-6 p-4 sm:p-6" noValidate onSubmit={handleSubmit(submit)}>
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

            <FormFieldRow cols="2">
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
              <FieldGroup label={t("fields.recordStatus")} htmlFor="job-active">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input id="job-active" type="checkbox" className="size-4 rounded border-slate-300" disabled={saving} {...register("is_active")} />
                  {t("fields.isActive")}
                </label>
              </FieldGroup>
            </FormFieldRow>

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
              <FieldGroup label={t("fields.endDate")} htmlFor="job-end" required>
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
          </form>
        )}
      </SurfaceShell>
    </div>
  );
}
