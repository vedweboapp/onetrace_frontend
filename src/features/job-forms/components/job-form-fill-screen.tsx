"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchJobFormSchema,
  fetchJobSubmittedForm,
  loadJobFormSubmission,
  submitJobForm,
  updateJobFormSubmission,
} from "@/features/job-forms/api/job-form.api";
import { fetchJob } from "@/features/jobs/api/job.api";
import type { Job, JobFormRef } from "@/features/jobs/types/job.types";
import {
  jobChecklistEntries,
  jobChecklistIsMarked,
  requiredJobChecklistsComplete,
} from "@/features/jobs/utils/job-nested-fields.util";
import type { JobFormSubmission } from "@/features/job-forms/types/job-form-submission.types";
import {
  applyReadOnlyToSections,
  buildFieldMaps,
  enrichSectionsWithSubmissionFiles,
  synthesizeFormSectionsFromSubmission,
} from "@/features/job-forms/utils/job-form-schema.util";
import {
  buildJobFormSubmissionFormData,
  mapSubmissionValuesToFormDefaults,
} from "@/features/job-forms/utils/job-form-values.util";
import { generateAndDownloadFormPdf } from "@/features/job-forms/utils/generate-form-pdf.util";
import {
  loadJobFormsFromSessionStorage,
  buildJobFormFillUrl,
} from "@/features/job-forms/utils/job-form-navigation.util";
import FormRenderer, { type FormRendererRef } from "@/shared/form/formbuilder/FormRenderer";
import { useFormHandler } from "@/shared/form/hook/useFormHandler";
import type { FormRule } from "@/shared/form/formbuilder/form-rules.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { AppButton, SurfaceShell } from "@/shared/ui";
import normalizeRules from "@/shared/form/utility/normalizerule";
import { JobQualityAssuranceControls } from "@/features/jobs/components/job-quality-assurance-controls";
import type { QualityAssuranceRecord } from "@/features/jobs/types/quality-assurance.types";
import { Download, Loader2, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

type UiMode = "fill" | "view" | "edit";

type Props = {
  jobId: number;
  /** Project form id — optional when opening a worker submission by submission_id only. */
  formId?: number;
  jobFormId?: number;
  formNameHint?: string | null;
};

export function JobFormFillScreen({ jobId, formId, jobFormId, formNameHint }: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const tChecklists = useTranslations("Dashboard.jobs.checklists");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const resolvedFormId = formId != null && formId > 0 ? formId : undefined;
  const resolvedJobFormId =
    jobFormId != null && jobFormId > 0 ? jobFormId : resolvedFormId;

  const jobDetailHref = `${routes.dashboard.jobs}/${jobId}`;
  const safeBack = resolveFormBackUrl(searchParams.get("back"), "jobs", jobDetailHref);

  const [job, setJob] = React.useState<Job | null>(null);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [formNavList, setFormNavList] = React.useState<JobFormRef[]>([]);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [formTitle, setFormTitle] = React.useState(formNameHint?.trim() || t("untitledForm"));
  const [schemaSections, setSchemaSections] = React.useState<
    ReturnType<typeof applyReadOnlyToSections>
  >([]);
  const [rules, setRules] = React.useState<FormRule[]>([]);
  const [defaultValues, setDefaultValues] = React.useState<Record<string, unknown>>({});
  const [submission, setSubmission] = React.useState<JobFormSubmission | null>(null);
  const [fieldMaps, setFieldMaps] = React.useState(() => buildFieldMaps([]));
  const [checklistBlocked, setChecklistBlocked] = React.useState(false);
  const [submissionOnlyView, setSubmissionOnlyView] = React.useState(false);

  const modeParam = searchParams.get("mode");
  const submissionIdParam = searchParams.get("submissionId") ?? searchParams.get("submission_id");
  const submissionIdHint = React.useMemo(() => {
    const n = Number.parseInt(submissionIdParam ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [submissionIdParam]);

  const jobPinIdParam = searchParams.get("job_pin_id");
  const jobPinIdHint = React.useMemo(() => {
    const n = Number.parseInt(jobPinIdParam ?? "", 10);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }, [jobPinIdParam]);

  const dynamicFormIdParam = searchParams.get("dynamic_form_id");
  const dynamicFormIdHint = React.useMemo(() => {
    const v = dynamicFormIdParam ?? undefined;
    return v && String(v).trim() !== "" ? v : undefined;
  }, [dynamicFormIdParam]);

  const uiMode: UiMode = React.useMemo(() => {
    if (submissionOnlyView) return "view";
    if (submission && modeParam !== "edit") return "view";
    if (submission && modeParam === "edit") return "edit";
    return "fill";
  }, [submission, modeParam, submissionOnlyView]);

  const readOnly = uiMode === "view";
  const rendererKey = `${uiMode}-${submission?.id ?? "new"}-${Object.keys(defaultValues).length}`;

  function formPageQuery(extra?: { mode?: string | null; submissionId?: number }) {
    const params = new URLSearchParams();
    if (resolvedFormId != null) {
      params.set("formId", String(resolvedFormId));
    }
    if (resolvedJobFormId != null) {
      params.set("job_form_id", String(resolvedJobFormId));
    }
    params.set("back", safeBack);
    if (searchParams.get("for_qa") === "true") {
      params.set("for_qa", "true");
    }
    if (formNameHint?.trim()) params.set("name", formNameHint.trim());
    if (jobPinIdHint != null) params.set("job_pin_id", String(jobPinIdHint));
    if (dynamicFormIdHint != null) params.set("dynamic_form_id", String(dynamicFormIdHint));
    const sid = extra?.submissionId ?? submission?.id ?? submissionIdHint;
    if (sid != null && sid > 0) params.set("submission_id", String(sid));
    if (extra?.mode) params.set("mode", extra.mode);
    return `${pathname}?${params.toString()}`;
  }

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setChecklistBlocked(false);
    setSubmissionOnlyView(false);
    try {
      // Fetch job context for metadata (title, site, levels, etc.)
      const jobData = await fetchJob(jobId, { silent: true }).catch(() => null);
      if (jobData) {
        setJob(jobData);
      }

      // Worker Forms tab: detail payload has values/files but no project_form_id.
      if (resolvedFormId == null) {
        if (submissionIdHint == null) {
          throw new Error(t("loadError"));
        }
        const existing = await fetchJobSubmittedForm(jobId, submissionIdHint);
        setSubmission(existing);
        setSubmissionOnlyView(true);
        setFormTitle(
          existing.form_name?.trim() || formNameHint?.trim() || t("untitledForm"),
        );
        setRules([]);
        const sectionsForRender = synthesizeFormSectionsFromSubmission({
          values: existing.values,
          files: existing.files,
        });
        const maps = buildFieldMaps(sectionsForRender);
        setFieldMaps(maps);
        setSchemaSections(sectionsForRender);
        setDefaultValues(
          mapSubmissionValuesToFormDefaults(
            existing.values,
            sectionsForRender,
            maps.apiNameByFieldId,
            maps.fieldTypeByFieldId,
            existing.files,
          ),
        );
        return;
      }

      if (!submissionIdHint && jobData) {
        const checklists = jobChecklistEntries(jobData);
        if (
          checklists.length > 0 &&
          !requiredJobChecklistsComplete(checklists, { isMarked: jobChecklistIsMarked(jobData) })
        ) {
          setChecklistBlocked(true);
          return;
        }
      }

      const schema = await fetchJobFormSchema(resolvedFormId, jobId);
      setFormTitle(schema.name?.trim() || formNameHint?.trim() || t("untitledForm"));
      setRules(normalizeRules(schema.rules));

      const existing = await loadJobFormSubmission(
        jobId,
        resolvedJobFormId ?? resolvedFormId,
        resolvedFormId,
        submissionIdHint,
      );
      setSubmission(existing);

      const sectionsForRender = existing?.files?.length
        ? enrichSectionsWithSubmissionFiles(schema.sections, existing.files)
        : schema.sections;
      const maps = buildFieldMaps(sectionsForRender);
      setFieldMaps(maps);
      setSchemaSections(sectionsForRender);

      const defaults = existing
        ? mapSubmissionValuesToFormDefaults(
          existing.values,
          sectionsForRender,
          maps.apiNameByFieldId,
          maps.fieldTypeByFieldId,
          existing.files,
        )
        : {};
      setDefaultValues(defaults);
    } catch (error) {
      setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
      setSchemaSections([]);
      setRules([]);
      setSubmission(null);
      setDefaultValues({});
      setSubmissionOnlyView(false);
    } finally {
      setLoading(false);
    }
  }, [formNameHint, jobId, resolvedFormId, resolvedJobFormId, submissionIdHint, t]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Load form navigation list from sessionStorage
  React.useEffect(() => {
    const stored = loadJobFormsFromSessionStorage(jobId);
    if (stored.length > 0) {
      setFormNavList(stored);
    }
  }, [jobId]);

  const currentFormIndex = React.useMemo(() => {
    if (formNavList.length === 0 || resolvedFormId == null) return -1;
    return formNavList.findIndex((f) => f.project_form_id === resolvedFormId);
  }, [formNavList, resolvedFormId]);

  const prevForm = currentFormIndex > 0 ? formNavList[currentFormIndex - 1] : null;
  const nextForm =
    currentFormIndex >= 0 && currentFormIndex < formNavList.length - 1
      ? formNavList[currentFormIndex + 1]
      : null;
  const {
    formRef,
    isLoading: submitting,
    handleSubmit: handleFormSubmit,
  } = useFormHandler<Record<string, unknown>, FormRendererRef>(async (data) => {
    if (resolvedFormId == null || resolvedJobFormId == null) {
      toastError(t("loadError"));
      return;
    }
    const fd = buildJobFormSubmissionFormData(
      resolvedJobFormId,
      data,
      schemaSections,
      // dynamic_form_id: dynamicFormIdHint
      { status: "submitted", defaultValues, job_pin_id: jobPinIdHint },
    );

    // Validate that at least one value is present
    const valuesJson = fd.get("values");
    if (valuesJson) {
      const parsed = JSON.parse(valuesJson as string) as unknown[];
      if (parsed.length === 0 && !Array.from(fd.keys()).some((k) => !["job_form_id", "status", "values", "remarks"].includes(k))) {
        toastError(t("validationEmpty"));
        return;
      }
    }

    const submissionId = submission?.id ?? submissionIdHint;
    const isEditingExisting =
      uiMode === "edit" && typeof submissionId === "number" && submissionId > 0;
    try {
      if (isEditingExisting) {
        await updateJobFormSubmission(jobId, submissionId, fd, resolvedFormId);
        toastSuccess(t("updatedToast"));
      } else {
        await submitJobForm(jobId, fd, resolvedFormId);
        toastSuccess(t("submittedToast"));
      }
      router.replace(safeBack);
    } catch (error) {
      toastApiError(error, t("submitError"));
    }
  }, { changesOnly: true });

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
          submission.files,
        ),
      );
    } else {
      router.push(safeBack);
    }
  }

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const currentValues = {
        ...defaultValues,
        ...(formRef.current?.getFormData?.() ?? {}),
      };

      const submittedAt = submission?.submitted_at
        ? new Date(submission.submitted_at).toLocaleString()
        : null;

      const locationText = jobPinIdHint ? String(jobPinIdHint) : null;
      let statusName = submission?.status || null;
      let productName: string | null = null;
      let plotName: string | null = null;
      let levelName: string | null = null;

      if (job) {
        if (job.title) {
          productName = job.title;
        }
        if (typeof job.site === "object" && job.site?.site_name) {
          plotName = job.site.site_name;
        }
        if (typeof job.job_status === "object" && job.job_status && "status_name" in job.job_status) {
          statusName = (job.job_status as any).status_name || statusName;
        }
        const jobLevels = (job as any).levels;
        if (Array.isArray(jobLevels) && jobPinIdHint) {
          for (const lvl of jobLevels) {
            if (Array.isArray(lvl?.plots)) {
              for (const plot of lvl.plots) {
                if (Array.isArray(plot?.pins) && plot.pins.some((p: any) => p?.id === jobPinIdHint)) {
                  levelName = lvl.name ?? null;
                  plotName = plot.name ?? null;
                  break;
                }
              }
            }
          }
        }
      }

      await generateAndDownloadFormPdf({
        formTitle,
        formId: resolvedFormId ?? submission?.id ?? resolvedJobFormId,
        locationText,
        productName,
        plotName,
        levelName,
        statusName,
        submittedAt,
        sections: schemaSections,
        defaultValues: currentValues,
        submission,
        rules,
      });

      toastSuccess("PDF downloaded successfully");
    } catch (err) {
      toastApiError(err, "Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const displaySections = readOnly ? applyReadOnlyToSections(schemaSections, true) : schemaSections;

  const downloadPdfAction =
    schemaSections.length > 0 && !loading ? (
      <AppButton
        type="button"
        variant="secondary"
        size="sm"
        disabled={downloadingPdf}
        onClick={() => void handleDownloadPdf()}
        title="Download Form PDF"
      >
        {downloadingPdf ? (
          <Loader2 className="size-3.5 animate-spin text-blue-600" aria-hidden />
        ) : (
          <Download className="size-3.5 text-slate-500 dark:text-slate-400" aria-hidden />
        )}
        <span>{downloadingPdf ? "Generating..." : "Download PDF"}</span>
      </AppButton>
    ) : null;

  // Form pagination nav pill (matches pin-detail-screen style)
  const formPaginationNav = formNavList.length > 1 ? (
    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <button
        type="button"
        disabled={!prevForm}
        onClick={() => {
          if (prevForm) {
            router.push(buildJobFormFillUrl(jobId, prevForm, safeBack));
          }
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={prevForm ? `Previous form: ${prevForm.name ?? `#${prevForm.project_form_id}`}` : "Previous"}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        <span>Previous</span>
      </button>
      <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
      {currentFormIndex >= 0 && (
        <>
          <div
            className="relative inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer select-none group"
            title="Click to jump to a form"
          >
            <span className="tabular-nums">
              {currentFormIndex + 1} / {formNavList.length}
            </span>
            <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
            <select
              value={currentFormIndex}
              onChange={(e) => {
                const nextIdx = Number(e.target.value);
                if (
                  Number.isFinite(nextIdx) &&
                  nextIdx >= 0 &&
                  nextIdx < formNavList.length &&
                  formNavList[nextIdx]
                ) {
                  router.push(buildJobFormFillUrl(jobId, formNavList[nextIdx], safeBack));
                }
              }}
              className="absolute inset-0 size-full opacity-0 cursor-pointer"
              aria-label="Select form number"
            >
              {formNavList.map((form, idx) => (
                <option
                  key={`${form.id}-${form.project_form_id}`}
                  value={idx}
                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs py-1"
                >
                  {idx + 1} / {formNavList.length}{form.name ? ` - ${form.name}` : ""}
                </option>
              ))}
            </select>
          </div>
          <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
        </>
      )}
      <button
        type="button"
        disabled={!nextForm}
        onClick={() => {
          if (nextForm) {
            router.push(buildJobFormFillUrl(jobId, nextForm, safeBack));
          }
        }}
        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        title={nextForm ? `Next form: ${nextForm.name ?? `#${nextForm.project_form_id}`}` : "Next"}
      >
        <span>Next</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  ) : null;

  const isForQa = searchParams.get("for_qa") === "true";
  const activeSubmissionId = submission?.submission_id ?? submission?.id ?? submissionIdHint;

  const qaRecord =
    submission?.service_based_form_quality_assurance ??
    ((submission as any)?.service_based_form_quality_assurance as QualityAssuranceRecord | null | undefined) ??
    (submission?.status ? { status: submission.status, remarks: submission.remarks } : null);

  const headerActions = checklistBlocked ? null : (
    <div className="flex items-center gap-2">
      {formPaginationNav}
      {downloadPdfAction}
      {isForQa && activeSubmissionId != null && activeSubmissionId > 0 && uiMode === "view" && (
        <JobQualityAssuranceControls
          jobId={jobId}
          submissionId={activeSubmissionId}
          existing={qaRecord ?? { status: "pending" }}
          showBadgeWhenDecided={true}
          allowChangeWhenDecided={false}
          onSuccess={(rec) => {
            if (rec && submission) {
              setSubmission({
                ...submission,
                service_based_form_quality_assurance: {
                  status: rec.status,
                  remarks: rec.remarks ?? null,
                  approved_at: new Date().toISOString(),
                },
                status: rec.status,
                remarks: rec.remarks ?? submission.remarks,
              });
            }
          }}
        />
      )}
      {submissionOnlyView ? null : uiMode === "view" ? (
        <AppButton type="button" variant="secondary" size="sm" onClick={enterEditMode}>
          {t("edit")}
        </AppButton>
      ) : (
        <>
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
        </>
      )}
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
        ) : checklistBlocked ? (
          <div className="space-y-3 p-6">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {tChecklists("blockedTitle")}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">{tChecklists("blockedBody")}</p>
            <AppButton type="button" variant="primary" size="sm" onClick={() => router.push(safeBack)}>
              {tChecklists("backToJob")}
            </AppButton>
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
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    {t("submittedAt")}:{" "}
                    <span className="font-medium text-slate-900 dark:text-slate-100">
                      {submission.submitted_at
                        ? new Date(submission.submitted_at).toLocaleString()
                        : "—"}
                    </span>
                  </span>
                  {submission.worker_name && (
                    <span>
                      Worker:{" "}
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {submission.worker_name}
                      </span>
                    </span>
                  )}
                </div>
                {((submission.service_based_form_quality_assurance?.remarks) || (submission.remarks && (submission.status?.toLowerCase() === "rejected" || submission.service_based_form_quality_assurance?.status?.toLowerCase() === "rejected"))) && (submission.service_based_form_quality_assurance?.status?.toLowerCase() === "rejected" || submission.status?.toLowerCase() === "rejected") ? (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
                    <span className="font-semibold">Rejection reason:</span>{" "}
                    {submission.service_based_form_quality_assurance?.remarks || submission.remarks}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="w-full rounded-sm border border-gray-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-700 dark:bg-slate-900">
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
