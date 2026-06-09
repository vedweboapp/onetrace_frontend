"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchJobFormSchema,
  loadJobFormSubmission,
  submitJobForm,
} from "@/features/job-forms/api/job-form.api";
import type { JobFormSubmission } from "@/features/job-forms/types/job-form-submission.types";
import {
  applyReadOnlyToSections,
  buildFieldMaps,
} from "@/features/job-forms/utils/job-form-schema.util";
import {
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
import { AppButton, SurfaceShell } from "@/shared/ui";
import normalizeRules from "@/shared/form/utility/normalizerule";

type UiMode = "fill" | "view" | "edit";

type Props = {
  jobId: number;
  formId: number;
  jobFormId: number;
  formNameHint?: string | null;
};

export function JobFormFillScreen({ jobId, formId, jobFormId, formNameHint }: Props) {
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
  const [fieldMaps, setFieldMaps] = React.useState(() => buildFieldMaps([]));

  const modeParam = searchParams.get("mode");
  const submissionIdParam = searchParams.get("submissionId");
  const submissionIdHint = React.useMemo(() => {
    const n = Number.parseInt(submissionIdParam ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [submissionIdParam]);

  const uiMode: UiMode = React.useMemo(() => {
    if (submission && modeParam !== "edit") return "view";
    if (submission && modeParam === "edit") return "edit";
    return "fill";
  }, [submission, modeParam]);

  const readOnly = uiMode === "view";
  const rendererKey = `${uiMode}-${submission?.id ?? "new"}-${Object.keys(defaultValues).length}`;

  function formPageQuery(extra?: { mode?: string | null; submissionId?: number }) {
    const params = new URLSearchParams();
    params.set("formId", String(formId));
    if (Number.isFinite(jobFormId) && jobFormId > 0) {
      params.set("job_form_id", String(jobFormId));
    }
    params.set("back", safeBack);
    if (formNameHint?.trim()) params.set("name", formNameHint.trim());
    const sid = extra?.submissionId ?? submission?.id;
    if (sid != null && sid > 0) params.set("submissionId", String(sid));
    if (extra?.mode) params.set("mode", extra.mode);
    return `${pathname}?${params.toString()}`;
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const schema = await fetchJobFormSchema(formId);
      const maps = buildFieldMaps(schema.sections);
      setFieldMaps(maps);
      setFormTitle(schema.name?.trim() || formNameHint?.trim() || t("untitledForm"));
      setSchemaSections(schema.sections);
      setRules(normalizeRules(schema.rules));

      const existing = await loadJobFormSubmission(jobId, jobFormId, formId, submissionIdHint);
      setSubmission(existing);

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
  }, [formId, formNameHint, jobFormId, jobId, submissionIdHint, t]);

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
      await submitJobForm(
        jobId,
        {
          job_form_id: jobFormId,
          status: "submitted",
          values,
        },
        formId,
      );
      toastSuccess(submission ? t("updatedToast") : t("submittedToast"));
      router.replace(safeBack);
    } catch {
      toastError(t("submitError"));
    }
  });

  function enterEditMode() {
    router.push(formPageQuery({ mode: "edit" }));
  }

  function cancelEdit() {
    if (submission) {
      router.replace(formPageQuery());
      setDefaultValues(
        mapSubmissionValuesToFormDefaults(
          submission.values,
          schemaSections,
          fieldMaps.apiNameByFieldId,
          fieldMaps.fieldTypeByFieldId,
        ),
      );
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
              <div className="text-sm text-slate-600 dark:text-slate-400">
                <span>
                  {t("submittedAt")}:{" "}
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {submission.submitted_at
                      ? new Date(submission.submitted_at).toLocaleString()
                      : "—"}
                  </span>
                </span>
              </div>
            ) : null}

            <div className="w-full rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
              {displaySections.length > 0 ? (
                <FormRenderer
                  key={rendererKey}
                  ref={formRef}
                  schema={displaySections}
                  rules={rules}
                  defaultValues={defaultValues}
                  renderMode="desktop"
                />
              ) : (
                <p className="text-sm text-slate-500">{t("emptySchema")}</p>
              )}
            </div>
          </div>
        )}
      </SurfaceShell>
    </div>
  );
}
