"use client";

import * as React from "react";
import { Monitor, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchJobFormSchema,
  fetchJobSubmittedForms,
  submitJobForm,
} from "@/features/job-forms/api/job-form.api";
import type { JobFormSubmission } from "@/features/job-forms/types/job-form-submission.types";
import {
  applyReadOnlyToSections,
  buildFieldMaps,
} from "@/features/job-forms/utils/job-form-schema.util";
import {
  enrichSubmissionValues,
  mapFormDataToSubmissionValues,
  mapSubmissionValuesToFormDefaults,
} from "@/features/job-forms/utils/job-form-values.util";
import FormRenderer, { type FormRendererRef } from "@/shared/form/formbuilder/FormRenderer";
import { useFormHandler } from "@/shared/form/hook/useFormHandler";
import type { FormRule } from "@/shared/form/formbuilder/form-rules.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { AppButton, FieldGroup, SurfaceShell, surfaceTextareaClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type UiMode = "fill" | "view" | "edit";

type Props = {
  jobId: number;
  formId: number;
  formNameHint?: string | null;
};

export function JobFormFillScreen({ jobId, formId, formNameHint }: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const jobDetailHref = `${routes.dashboard.jobs}/${jobId}`;
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "jobs", jobDetailHref);

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formTitle, setFormTitle] = React.useState(formNameHint?.trim() || t("untitledForm"));
  const [schemaSections, setSchemaSections] = React.useState<
    ReturnType<typeof applyReadOnlyToSections>
  >([]);
  const [rules, setRules] = React.useState<FormRule[]>([]);
  const [defaultValues, setDefaultValues] = React.useState<Record<string, unknown>>({});
  const [submission, setSubmission] = React.useState<JobFormSubmission | null>(null);
  const [remarks, setRemarks] = React.useState("");
  const [previewLayout, setPreviewLayout] = React.useState<"desktop" | "phone">("desktop");
  const [fieldMaps, setFieldMaps] = React.useState(() => buildFieldMaps([]));

  const modeParam = searchParams.get("mode");
  const uiMode: UiMode = React.useMemo(() => {
    if (submission && modeParam !== "edit") return "view";
    if (submission && modeParam === "edit") return "edit";
    return "fill";
  }, [submission, modeParam]);

  const readOnly = uiMode === "view";
  const rendererKey = `${uiMode}-${previewLayout}-${submission?.id ?? "new"}`;

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [schema, submittedRows] = await Promise.all([
        fetchJobFormSchema(formId),
        fetchJobSubmittedForms(jobId),
      ]);
      const maps = buildFieldMaps(schema.sections);
      setFieldMaps(maps);
      setFormTitle(schema.name?.trim() || formNameHint?.trim() || t("untitledForm"));
      setSchemaSections(schema.sections);
      setRules((schema.rules ?? []) as FormRule[]);

      const existing =
        submittedRows.find((row) => row.job_form_id === formId || row.form_id === formId) ?? null;
      setSubmission(existing);
      setRemarks(existing?.remarks?.trim() ?? "");

      const defaults = existing
        ? mapSubmissionValuesToFormDefaults(
            existing.values,
            schema.sections,
            maps.apiNameByFieldId,
            maps.fieldTypeByFieldId,
          )
        : {};
      setDefaultValues(defaults);
    } catch {
      setLoadError(t("loadError"));
      setSchemaSections([]);
      setRules([]);
      setSubmission(null);
      setDefaultValues({});
    } finally {
      setLoading(false);
    }
  }, [formId, formNameHint, jobId, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const {
    formRef,
    isLoading: submitting,
    handleSubmit: handleFormSubmit,
  } = useFormHandler<Record<string, unknown>, FormRendererRef>(async (data) => {
    const values = mapFormDataToSubmissionValues(data, schemaSections);
    if (values.length === 0) {
      toastError(t("validationEmpty"));
      return;
    }
    try {
      const saved = await submitJobForm(jobId, {
        job_form_id: formId,
        status: "submitted",
        remarks: remarks.trim() || undefined,
        values,
      });
      const enriched: JobFormSubmission = {
        ...saved,
        form_name: saved.form_name ?? formTitle,
        values: enrichSubmissionValues(
          saved.values,
          fieldMaps.fieldLabelByFieldId,
          fieldMaps.apiNameByFieldId,
        ),
      };
      setSubmission(enriched);
      setDefaultValues(
        mapSubmissionValuesToFormDefaults(
          enriched.values,
          schemaSections,
          fieldMaps.apiNameByFieldId,
          fieldMaps.fieldTypeByFieldId,
        ),
      );
      toastSuccess(submission ? t("updatedToast") : t("submittedToast"));
      if (modeParam === "edit") {
        router.replace(`${pathname}?back=${encodeURIComponent(safeBack)}`);
      }
    } catch {
      toastError(t("submitError"));
    }
  });

  function enterEditMode() {
    router.push(`${pathname}?mode=edit&back=${encodeURIComponent(safeBack)}`);
  }

  function cancelEdit() {
    if (submission) {
      router.replace(`${pathname}?back=${encodeURIComponent(safeBack)}`);
      setDefaultValues(
        mapSubmissionValuesToFormDefaults(
          submission.values,
          schemaSections,
          fieldMaps.apiNameByFieldId,
          fieldMaps.fieldTypeByFieldId,
        ),
      );
      setRemarks(submission.remarks?.trim() ?? "");
    } else {
      router.push(safeBack);
    }
  }

  const displaySections = readOnly ? applyReadOnlyToSections(schemaSections, true) : schemaSections;

  const headerActions =
    uiMode === "view" ? (
      <AppButton type="button" variant="secondary" size="sm" onClick={enterEditMode}>
        {t("edit")}
      </AppButton>
    ) : (
      <div className="flex items-center gap-2">
        <AppButton type="button" variant="secondary" size="sm" disabled={submitting} onClick={cancelEdit}>
          {t("cancel")}
        </AppButton>
        <AppButton
          type="button"
          variant="primary"
          size="sm"
          loading={submitting}
          disabled={submitting || loading}
          onClick={() => void handleFormSubmit()}
        >
          {uiMode === "edit" ? t("saveChanges") : t("submit")}
        </AppButton>
      </div>
    );

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={formTitle}
        subtitle={
          uiMode === "view"
            ? t("viewSubtitle")
            : uiMode === "edit"
              ? t("editSubtitle")
              : t("fillSubtitle")
        }
        backHref={safeBack}
        backAriaLabel={t("backAria")}
        actions={headerActions}
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-40 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError ? (
          <div className="space-y-3 p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
            <AppButton type="button" variant="secondary" size="sm" onClick={() => void load()}>
              {t("retry")}
            </AppButton>
          </div>
        ) : (
          <div className="space-y-6 p-4 sm:p-6">
            {uiMode === "view" && submission ? (
              <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
                <span>
                  {t("submittedAt")}:{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleString()
                      : "—"}
                  </span>
                </span>
                {submission.remarks?.trim() ? (
                  <span>
                    {t("remarks")}:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {submission.remarks}
                    </span>
                  </span>
                ) : null}
              </div>
            ) : null}

            {!readOnly ? (
              <FieldGroup label={t("remarks")} htmlFor="job-form-remarks">
                <textarea
                  id="job-form-remarks"
                  rows={2}
                  value={remarks}
                  disabled={submitting}
                  placeholder={t("remarksPlaceholder")}
                  className={cn(surfaceTextareaClassName, "min-h-[4rem]")}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </FieldGroup>
            ) : null}

            <div className="flex items-center justify-end">
              <div className="inline-flex rounded-md border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
                <button
                  type="button"
                  className={cn(
                    "flex h-9 items-center gap-2 rounded px-3 text-sm transition",
                    previewLayout === "desktop"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                  onClick={() => setPreviewLayout("desktop")}
                >
                  <Monitor className="size-4" aria-hidden />
                  {t("layoutDesktop")}
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex h-9 items-center gap-2 rounded px-3 text-sm transition",
                    previewLayout === "phone"
                      ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                  onClick={() => setPreviewLayout("phone")}
                >
                  <Smartphone className="size-4" aria-hidden />
                  {t("layoutPhone")}
                </button>
              </div>
            </div>

            <div className="flex w-full justify-center">
              <div
                className={cn(
                  "border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900",
                  previewLayout === "phone" ? "rounded-[28px] p-4" : "w-full rounded-xl p-6 sm:p-8",
                )}
                style={previewLayout === "phone" ? { width: 390, maxWidth: "100%" } : undefined}
              >
                {displaySections.length > 0 ? (
                  <FormRenderer
                    key={rendererKey}
                    ref={formRef}
                    schema={displaySections}
                    rules={rules}
                    defaultValues={defaultValues}
                    renderMode={previewLayout}
                  />
                ) : (
                  <p className="text-sm text-slate-500">{t("emptySchema")}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
