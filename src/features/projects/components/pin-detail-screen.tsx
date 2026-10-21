"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  fetchJobFormSchema,
  fetchJobSubmittedForm,
  loadJobFormSubmission,
  submitJobForm,
  updateJobFormSubmission,
} from "@/features/job-forms/api/job-form.api";
import type {
  JobFormSubmission,
  NormalizedFormSection,
} from "@/features/job-forms/types/job-form-submission.types";
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
import {
  generateAndDownloadFormPdf,
  generatePinCropDataUrl,
} from "@/features/job-forms/utils/generate-form-pdf.util";
import { fetchJob } from "@/features/jobs/api/job.api";
import {
  parseJobCategoryParam,
  resolveJobCategory,
  type JobCategoryApi,
} from "@/features/jobs/constants/job-category";
import { jobFormEntries } from "@/features/jobs/utils/job-nested-fields.util";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import { fetchDrawingDetail, fetchPinDetail, updateDrawingPlots } from "@/features/projects/api/drawing.api";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import { fetchPinStatusesPage } from "@/features/pin-status/api/pin-status.api";
import { fetchProjectFormsPage } from "@/features/projects/api/project.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { PinStatus } from "@/features/pin-status/types/pin-status.types";
import type { FormListItem } from "@/features/forms/types/form.types";
import type { Drawing, DrawingPin, DrawingPlot, DrawingPinAttachment } from "@/features/projects/types/drawing.types";
import {
  resolvePinFormMeta,
  resolvePinProjectFormId,
  type PinFormMeta,
} from "@/features/projects/utils/pin-form-meta.util";
import { useLevelSnapshots, type LevelSnapshotState } from "@/shared/hooks/use-level-snapshots.hook";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { PinThumbnailCropped } from "@/shared/components/pin-thumbnail-cropped";
import { DrawingFilePreviewFill } from "@/features/projects/components/drawing-file-preview";
import { DrawingPinThumbnailOverlay } from "@/features/projects/components/drawing-pin-thumbnail-overlay";
import "@/shared/utils/pdfjs-worker";
import { collectFormImagePreviews } from "@/features/projects/utils/pin-form-images.util";
import FormRenderer, { type FormRendererRef } from "@/shared/form/formbuilder/FormRenderer";
import { useFormHandler } from "@/shared/form/hook/useFormHandler";
import type { FormRule } from "@/shared/form/formbuilder/form-rules.types";
import normalizeRules from "@/shared/form/utility/normalizerule";
import { DetailPageHeader, DetailPageHeaderTitleSkeleton } from "@/shared/components/layout/detail-page-header";
import {
  DetailPagePadding,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import {
  detailMapFormGridClassName,
} from "@/shared/components/layout/detail-page-map-layout";
import { JobQualityAssuranceControls } from "@/features/jobs/components/job-quality-assurance-controls";
import {
  QualityAssuranceDetailGrid,
} from "@/features/jobs/components/quality-assurance-status";
import {
  isQualityAssuranceApproved,
  isQualityAssuranceDecided,
  type QualityAssuranceRecord,
} from "@/features/jobs/types/quality-assurance.types";
import {
  savePinsToSessionStorage,
  loadPinsFromSessionStorage,
  buildPinPreviewUrl,
  extractTrimmedPinsFromJob,
  type TrimmedPinNavigationItem,
} from "@/features/projects/utils/pin-preview-navigation.util";
import { routes } from "@/shared/config/routes";
import {
  getApiErrorDisplayMessage,
  toastApiError,
  toastError,
  toastSuccess,
} from "@/shared/feedback/app-toast";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { buildProjectDetailTabHref } from "@/shared/utils/detail-from-list.util";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

import {
  Package,
  Hash,
  Activity,
  MapPin,
  LayoutGrid,
  Layers,
  FileText,
  Paperclip,
  FileCheck,
  ToggleLeft,
  Download,
  Loader2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Map,
  Maximize2,
  Eye,
  MessageSquare,
} from "lucide-react";

type PinContext = {
  pin: DrawingPin;
  plots: DrawingPlot[];
  drawingFile: string;
  drawingName: string;
  drawingId?: number;
  projectId?: number;
  formMeta: PinFormMeta | null;
};

type Props = {
  pinId: number;
  /** Job pin detail route. */
  jobId?: number;
  /** Project pin detail route. */
  projectId?: number;
  /** Optional drawing hint for project route. */
  drawingIdHint?: number | null;
};

async function resolvePinFromPinApi(
  pinId: number,
  projectIdHint?: number,
  formEntries?: any[],
): Promise<PinContext | null> {
  try {
    const pinData = await fetchPinDetail(pinId);
    if (!pinData) return null;

    const ld = pinData.level_detail;
    const plots = (ld?.plots ?? []) as DrawingPlot[];

    const targetPinId = Number(pinId);
    let foundPin: DrawingPin | null = null;
    let foundPlot: DrawingPlot | null = null;
    for (const plot of plots) {
      const p = (plot.pins ?? []).find((entry) => {
        if (Number(entry.id) === targetPinId) return true;
        const jobPinId = Number(entry.job_pin_id);
        return Number.isFinite(jobPinId) && jobPinId > 0 && jobPinId === targetPinId;
      });
      if (p) {
        foundPin = p;
        foundPlot = plot;
        break;
      }
    }

    const rawTopJobId =
      (pinData as any).job_id ??
      (pinData as any).job ??
      (pinData as any).job_detail?.id ??
      null;
    const topJobId =
      typeof rawTopJobId === "number" && rawTopJobId > 0
        ? rawTopJobId
        : rawTopJobId && typeof rawTopJobId === "object" && typeof rawTopJobId.id === "number"
          ? rawTopJobId.id
          : null;

    const sfdCandidate =
      (Array.isArray((pinData as any).submit_forms_details)
        ? (pinData as any).submit_forms_details[0]
        : (pinData as any).submit_forms_details) ??
      (Array.isArray((pinData as any).submit_forms)
        ? (pinData as any).submit_forms[0]
        : (pinData as any).submit_forms) ??
      (Array.isArray((pinData as any).submitted_forms)
        ? (pinData as any).submitted_forms[0]
        : (pinData as any).submitted_forms) ??
      (pinData as any).submitted_form ??
      ((pinData as any).project_form && typeof (pinData as any).project_form === "object"
        ? (pinData as any).project_form
        : null) ??
      (pinData as any).submission ??
      null;

    const rawSubId =
      sfdCandidate?.submission_id ??
      sfdCandidate?.submitted_form_id ??
      (pinData as any).submission_id ??
      (pinData as any).submitted_form_id ??
      (pinData as any).submission?.id ??
      null;
    const subId = rawSubId != null && Number(rawSubId) > 0 ? Number(rawSubId) : null;

    const rawPFormId =
      sfdCandidate?.id ??
      sfdCandidate?.project_form_id ??
      sfdCandidate?.form_id ??
      (typeof (pinData as any).project_form === "number"
        ? (pinData as any).project_form
        : (pinData as any).project_form?.id != null
          ? Number((pinData as any).project_form.id)
          : null) ??
      (typeof (pinData as any).form_id === "number" ? (pinData as any).form_id : null) ??
      (typeof (pinData as any).form === "number" ? (pinData as any).form : null) ??
      (typeof (pinData as any).formId === "number" ? (pinData as any).formId : null) ??
      (typeof (foundPin as any)?.form_id === "number" ? (foundPin as any).form_id : null) ??
      (typeof (foundPin as any)?.formId === "number" ? (foundPin as any).formId : null) ??
      (typeof (foundPin as any)?.project_form === "number"
        ? (foundPin as any).project_form
        : (foundPin as any)?.project_form?.id != null
          ? Number((foundPin as any).project_form.id)
          : null);
    const pFormId = rawPFormId != null && Number(rawPFormId) > 0 ? Number(rawPFormId) : null;

    const formLabel =
      (typeof sfdCandidate?.name === "string" && sfdCandidate.name.trim()) ||
      (typeof sfdCandidate?.form_name === "string" && sfdCandidate.form_name.trim()) ||
      (typeof (pinData as any).project_form?.name === "string" && (pinData as any).project_form.name.trim()) ||
      (typeof (pinData as any).project_form_name === "string" && (pinData as any).project_form_name.trim()) ||
      "Form";

    const sfdJobRaw = sfdCandidate?.job_id ?? sfdCandidate?.job ?? null;
    const sfdJobId =
      typeof sfdJobRaw === "number" && sfdJobRaw > 0
        ? sfdJobRaw
        : sfdJobRaw && typeof sfdJobRaw === "object" && typeof sfdJobRaw.id === "number"
          ? sfdJobRaw.id
          : null;

    const effectiveJobFromApi = topJobId ?? sfdJobId;

    const basePin = foundPin ?? (pinData as unknown as DrawingPin);
    const resolvedPin: DrawingPin = {
      ...basePin,
      id: Number(pinData.id ?? pinId),
      status_detail: (basePin as any).status_detail ?? null,
      status: (basePin as any).status ?? null,
      qa_remarks: (basePin as any).qa_remarks ?? null,
      qa_approved_at: (basePin as any).qa_approved_at ?? null,
      qa_approved_by: (basePin as any).qa_approved_by ?? null,
      ...(effectiveJobFromApi != null ? { job_id: effectiveJobFromApi, job: effectiveJobFromApi } : {}),
      ...(subId != null ? { submission_id: subId } : {}),
      ...(sfdCandidate ? { submit_forms_details: sfdCandidate, project_form: sfdCandidate } : {}),
    };

    let formMeta: PinFormMeta | null = null;
    if (pFormId != null || subId != null) {
      formMeta = {
        projectFormId: pFormId ?? 1,
        jobFormId: pFormId ?? 1,
        label: formLabel,
        submitted:
          sfdCandidate?.submission_status === "submitted" ||
          (pinData as any).submission_status === "submitted" ||
          (subId != null && subId > 0),
        submissionId: subId,
      };
    } else {
      formMeta = resolvePinFormMeta(resolvedPin, { formEntries });
    }

    return {
      pin: resolvedPin,
      plots: plots && plots.length > 0 ? plots : (foundPlot ? [foundPlot] : []),
      drawingFile: ld?.drawing_file ?? "",
      drawingName: ld?.name ?? "",
      drawingId: ld?.id,
      projectId: ld?.project ?? projectIdHint,
      formMeta,
    };
  } catch (err) {
    console.warn("fetchPinDetail failed in PinDetailScreen", err);
    return null;
  }
}

export function PinDetailScreen({ pinId, jobId, projectId, drawingIdHint }: Props) {
  const t = useTranslations("Dashboard.jobs.forms");
  const tPins = useTranslations("Dashboard.projects.pins");
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const defaultBack =
    jobId != null
      ? `${routes.dashboard.jobs}/${jobId}`
      : projectId != null
        ? buildProjectDetailTabHref(projectId, "location")
        : routes.dashboard.jobs;
  const safeBack = resolveFormBackUrl(
    searchParams.get("back"),
    jobId != null ? "jobs" : "projects",
    defaultBack,
  );

  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [context, setContext] = React.useState<PinContext | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);
  const [jobCategoryForNav, setJobCategoryForNav] = React.useState<JobCategoryApi | null>(null);


  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [],
  );

  const [loadingForm, setLoadingForm] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [rawSections, setRawSections] = React.useState<NormalizedFormSection[]>([]);
  const [fieldMaps, setFieldMaps] = React.useState(() => buildFieldMaps([]));
  const [rules, setRules] = React.useState<FormRule[]>([]);
  const [defaultValues, setDefaultValues] = React.useState<Record<string, unknown>>({});
  const [submission, setSubmission] = React.useState<JobFormSubmission | null>(null);
  const [hasSubmission, setHasSubmission] = React.useState(false);
  const [formName, setFormName] = React.useState<string | null>(null);
  const [createdSubmissionId, setCreatedSubmissionId] = React.useState<number | null>(null);
  const [pinNavList, setPinNavList] = React.useState<TrimmedPinNavigationItem[]>([]);

  React.useEffect(() => {
    setCreatedSubmissionId(null);
  }, [pinId, projectId, jobId]);

  const modeParam = searchParams.get("mode");
  const [isEditMode, setIsEditMode] = React.useState(modeParam === "edit");

  /** Keep header/sidebar job category in sync (QR links omit `?job_category=`). */
  React.useEffect(() => {
    if (jobId == null || jobCategoryForNav == null) return;
    const current = parseJobCategoryParam(searchParams.get("job_category"));
    if (current === jobCategoryForNav) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set("job_category", jobCategoryForNav);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [jobId, jobCategoryForNav, pathname, router, searchParams]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      setJobCategoryForNav(null);
      try {
        let formEntries: any[] | undefined = undefined;
        let resolvedProjectId = projectId;

        if (jobId != null && jobId > 0) {
          try {
            const job = await fetchJob(jobId, { silent: true });
            if (cancelled) return;
            setJobCategoryForNav(resolveJobCategory(job));
            // If sessionStorage pin list is not yet populated, extract & cache it
            const stored = loadPinsFromSessionStorage(jobId);
            if (stored.length === 0) {
              const trimmed = extractTrimmedPinsFromJob(job);
              if (trimmed.length > 0) {
                savePinsToSessionStorage(jobId, trimmed);
                setPinNavList(trimmed);
              }
            }
            formEntries = jobFormEntries(job);
            const typed = job as unknown as {
              project?: number | { id: number };
            };
            resolvedProjectId =
              typeof typed.project === "number"
                ? typed.project
                : typed.project && typeof typed.project === "object"
                  ? typed.project.id
                  : resolvedProjectId;
          } catch (err) {
            console.warn("fetchJob failed in PinDetailScreen", err);
          }
        }

        // Direct fetch using /pins/${pinId}/ API
        const resolvedContext = await resolvePinFromPinApi(pinId, resolvedProjectId, formEntries);
        if (cancelled) return;

        if (!resolvedContext) {
          setContext(null);
          setLoadError(tPins("loadError"));
          return;
        }

        setContext(resolvedContext);
      } catch (error) {
        if (!cancelled) {
          setContext(null);
          setLoadError(getApiErrorDisplayMessage(error, tPins("loadError")));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [jobId, projectId, pinId, drawingIdHint, tPins, reloadToken]);

  const formMeta = context?.formMeta ?? null;

  // URL params injected by job-detail-body — same set used in the form-fill URL:
  // formId, job_form_id, name, job_pin_id, submission_id
  const urlFormId = searchParams.get("formId") ?? searchParams.get("form_id");
  const urlJobFormId = searchParams.get("job_form_id");
  const urlSubmissionId = searchParams.get("submission_id") ?? searchParams.get("submissionId");

  const rawSubmissionId =
    createdSubmissionId ??
    urlSubmissionId ??
    formMeta?.submissionId ??
    (context?.pin as any)?.submission_id ??
    (context?.pin as any)?.submitted_form_id ??
    (context?.pin?.project_form as any)?.submission_id ??
    (context?.pin?.project_form as any)?.submitted_form_id;

  const parsedSubmissionId = rawSubmissionId ? Number.parseInt(String(rawSubmissionId), 10) : null;
  const submissionId =
    Number.isFinite(parsedSubmissionId) && (parsedSubmissionId as number) > 0
      ? (parsedSubmissionId as number)
      : null;

  const projectFormId =
    formMeta?.projectFormId ??
    (urlFormId ? Number.parseInt(urlFormId, 10) : null) ??
    (context?.pin ? resolvePinProjectFormId(context.pin) : null);
  const jobFormId =
    formMeta?.jobFormId ??
    (urlJobFormId ? Number.parseInt(urlJobFormId, 10) : null) ??
    projectFormId;
  const submittedHint = formMeta?.submitted ?? (submissionId != null && submissionId > 0);

  const rawJobIdParam = searchParams.get("jobId") ?? searchParams.get("job_id");
  const parsedJobIdParam = rawJobIdParam ? Number.parseInt(rawJobIdParam, 10) : undefined;
  const pinJob =
    (context?.pin as any)?.job_id ??
    (context?.pin as any)?.job ??
    (context?.pin as any)?.submit_forms_details?.job_id ??
    (context?.pin as any)?.submit_forms_details?.job;
  const pinJobId =
    typeof pinJob === "number" && pinJob > 0
      ? pinJob
      : pinJob && typeof pinJob === "object" && typeof pinJob.id === "number"
        ? pinJob.id
        : undefined;

  const effectiveJobId =
    jobId ??
    (Number.isFinite(parsedJobIdParam) && (parsedJobIdParam as number) > 0
      ? (parsedJobIdParam as number)
      : submission?.job_id && Number(submission.job_id) > 0
        ? Number(submission.job_id)
        : pinJobId);

  const urlJobPinId = searchParams.get("job_pin_id");
  const targetJobPinId =
    urlJobPinId && Number(urlJobPinId) > 0
      ? Number(urlJobPinId)
      : context?.pin?.job_pin_id != null && Number(context.pin.job_pin_id) > 0
        ? Number(context.pin.job_pin_id)
        : context?.pin?.id != null && Number(context.pin.id) > 0
          ? Number(context.pin.id)
          : pinId;

  // Read pin preview navigation list from sessionStorage
  React.useEffect(() => {
    if (effectiveJobId != null && effectiveJobId > 0) {
      const stored = loadPinsFromSessionStorage(effectiveJobId);
      if (stored.length > 0) {
        setPinNavList(stored);
      }
    }
  }, [effectiveJobId, pinId]);

  React.useEffect(() => {
    if (
      !context?.pin ||
      ((projectFormId == null || projectFormId <= 0) && (submissionId == null || submissionId <= 0))
    ) {
      setRawSections([]);
      setRules([]);
      setDefaultValues({});
      setFormError(null);
      setHasSubmission(false);
      setSubmission(null);
      setFormName(null);
      setLoadingForm(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingForm(true);
      setFormError(null);
      try {
        let loadedSubmission: JobFormSubmission | null = null;

        // 1. If we have effectiveJobId and submissionId, fetch via the submitted form API
        if (effectiveJobId != null && effectiveJobId > 0 && submissionId != null && submissionId > 0) {
          try {
            loadedSubmission = await fetchJobSubmittedForm(effectiveJobId, submissionId);
          } catch (err) {
            console.warn("fetchJobSubmittedForm failed, falling back to loadJobFormSubmission", err);
          }
        }

        // 2. If not loaded directly, try loadJobFormSubmission by jobFormId / projectFormId
        if (!loadedSubmission && effectiveJobId != null && effectiveJobId > 0 && jobFormId != null && jobFormId > 0) {
          try {
            loadedSubmission = await loadJobFormSubmission(
              effectiveJobId,
              jobFormId,
              projectFormId ?? jobFormId,
              submissionId ?? undefined,
            );
          } catch (err) {
            console.warn("loadJobFormSubmission failed", err);
          }
        }

        if (cancelled) return;

        const resolvedProjectFormId =
          projectFormId ??
          loadedSubmission?.project_form_id ??
          loadedSubmission?.form_id ??
          null;

        let sectionsForRender: NormalizedFormSection[] = [];

        if (resolvedProjectFormId != null && resolvedProjectFormId > 0) {
          const schema = await fetchJobFormSchema(resolvedProjectFormId, effectiveJobId);
          if (cancelled) return;
          if (schema.name?.trim()) {
            setFormName(schema.name.trim());
          } else if (loadedSubmission?.form_name?.trim()) {
            setFormName(loadedSubmission.form_name.trim());
          }
          setRules(normalizeRules((schema.rules ?? []) as FormRule[]));
          sectionsForRender = loadedSubmission?.files?.length
            ? enrichSectionsWithSubmissionFiles(schema.sections, loadedSubmission.files)
            : schema.sections;
        } else if (loadedSubmission) {
          if (loadedSubmission.form_name?.trim()) {
            setFormName(loadedSubmission.form_name.trim());
          }
          setRules([]);
          sectionsForRender = synthesizeFormSectionsFromSubmission({
            values: loadedSubmission.values,
            files: loadedSubmission.files,
          });
        }

        const maps = buildFieldMaps(sectionsForRender);
        setFieldMaps(maps);
        setRawSections(sectionsForRender);

        let nextDefaults: Record<string, unknown> = {};
        if (loadedSubmission) {
          nextDefaults = mapSubmissionValuesToFormDefaults(
            loadedSubmission.values,
            sectionsForRender,
            maps.apiNameByFieldId,
            maps.fieldTypeByFieldId,
            loadedSubmission.files,
          );
        }
        setDefaultValues(nextDefaults);

        const resolvedSubmitted = Boolean(loadedSubmission) || submittedHint;
        setHasSubmission(resolvedSubmitted);
        setSubmission(loadedSubmission);

        if (modeParam === "edit") {
          setIsEditMode(true);
        } else if (resolvedSubmitted) {
          setIsEditMode(false);
        } else {
          setIsEditMode(true);
        }
      } catch (error) {
        if (!cancelled) {
          setFormError(getApiErrorDisplayMessage(error, t("loadError")));
          setRawSections([]);
          setSubmission(null);
        }
      } finally {
        if (!cancelled) setLoadingForm(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    context?.pin?.id,
    projectFormId,
    jobFormId,
    effectiveJobId,
    submissionId,
    submittedHint,
    modeParam,
    t,
    reloadToken,
  ]);

  const isReadOnly = (hasSubmission || submittedHint) && !isEditMode;
  const displaySections = React.useMemo(() => {
    return isReadOnly ? applyReadOnlyToSections(rawSections, true) : rawSections;
  }, [rawSections, isReadOnly]);

  const {
    formRef,
    isLoading: submitting,
    handleSubmit: handleFormSubmit,
  } = useFormHandler<Record<string, unknown>, FormRendererRef>(async (data) => {
    if (projectFormId == null) {
      toastError(t("loadError"));
      return;
    }
    if (effectiveJobId == null || effectiveJobId <= 0) {
      toastError("No Job ID associated with this pin. Form submission requires an active job.");
      return;
    }
    const targetJobFormId = jobFormId ?? projectFormId;
    // Prefer the job_pin_id URL param (set by job-detail-body from the correct
    // pin.job_pin_id) — the context pin fetched via drawings API may have a
    // different id value.
    const urlJobPinId = searchParams.get("job_pin_id");
    const targetJobPinId =
      urlJobPinId && Number(urlJobPinId) > 0
        ? Number(urlJobPinId)
        : context?.pin?.job_pin_id != null && Number(context.pin.job_pin_id) > 0
          ? Number(context.pin.job_pin_id)
          : context?.pin?.id != null && Number(context.pin.id) > 0
            ? Number(context.pin.id)
            : undefined;

    const fd = buildJobFormSubmissionFormData(
      targetJobFormId,
      data,
      rawSections,
      {
        status: "submitted",
        defaultValues,
        job_pin_id: targetJobPinId,
      },
    );

    // Validate that at least one value is present
    const valuesJson = fd.get("values");
    if (valuesJson) {
      const parsed = JSON.parse(valuesJson as string) as unknown[];
      if (
        parsed.length === 0 &&
        !Array.from(fd.keys()).some(
          (k) => !["job_form_id", "status", "values", "remarks", "job_pin_id"].includes(k),
        )
      ) {
        toastError(t("validationEmpty"));
        return;
      }
    }

    const currentSubmissionId = createdSubmissionId ?? submission?.id ?? submissionId;
    const isEditingExisting =
      typeof currentSubmissionId === "number" && currentSubmissionId > 0;

    try {
      let updatedSubmissionId = currentSubmissionId;
      if (isEditingExisting) {
        const res = await updateJobFormSubmission(effectiveJobId, currentSubmissionId, fd, projectFormId);
        const resolvedId = res?.submission_id ?? res?.id;
        if (typeof resolvedId === "number" && resolvedId > 0) {
          updatedSubmissionId = resolvedId;
        }
        toastSuccess(t("updatedToast"));
      } else {
        const res = await submitJobForm(effectiveJobId, fd, projectFormId);
        const newSid =
          (typeof res?.submission_id === "number" && res.submission_id > 0
            ? res.submission_id
            : typeof res?.id === "number" && res.id > 0
              ? res.id
              : null);
        if (newSid != null && newSid > 0) {
          updatedSubmissionId = newSid;
        }
        toastSuccess(t("submittedToast"));
      }

      // Sync submission_id to browser URL and refetch form data
      if (updatedSubmissionId && updatedSubmissionId > 0) {
        setCreatedSubmissionId(updatedSubmissionId);

        // Update the cached pin navigation item in state and sessionStorage so that
        // navigating previous / next or returning to this pin preserves submission_id!
        setPinNavList((prevList) => {
          const nextList = prevList.map((item) => {
            if (item.pinId === pinId || item.job_pin_id === pinId) {
              return { ...item, submission_id: updatedSubmissionId };
            }
            return item;
          });
          if (effectiveJobId) {
            savePinsToSessionStorage(effectiveJobId, nextList);
          }
          return nextList;
        });

        // 1. Append/update submission_id in browser URL
        const nextParams = new URLSearchParams(searchParams.toString());
        nextParams.set("submission_id", String(updatedSubmissionId));
        nextParams.delete("mode");
        const nextQuery = nextParams.toString();
        const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", nextUrl);
        }
        router.replace(nextUrl, { scroll: false });

        // 2. Explicitly re-fetch fresh form data from the submitted form API to refresh the view
        if (effectiveJobId) {
          try {
            const fresh = await fetchJobSubmittedForm(effectiveJobId, updatedSubmissionId);
            if (fresh) {
              setSubmission(fresh);
              setHasSubmission(true);
              if (fresh.form_name?.trim()) {
                setFormName(fresh.form_name.trim());
              }
              const enriched = fresh.files?.length
                ? enrichSectionsWithSubmissionFiles(rawSections, fresh.files)
                : rawSections;
              setRawSections(enriched);
              const maps = buildFieldMaps(enriched);
              setFieldMaps(maps);
              setDefaultValues(
                mapSubmissionValuesToFormDefaults(
                  fresh.values,
                  enriched,
                  maps.apiNameByFieldId,
                  maps.fieldTypeByFieldId,
                  fresh.files,
                ),
              );
            }
          } catch (err) {
            console.warn("Failed to refresh form data after submission", err);
          }
        }
      }

      setIsEditMode(false);
      setReloadToken((n) => n + 1);
    } catch (error) {
      toastApiError(error, t("submitError"));
    }
  });

  const handleCancelEdit = () => {
    setIsEditMode(false);
    if (submission) {
      setDefaultValues(
        mapSubmissionValuesToFormDefaults(
          submission.values,
          rawSections,
          fieldMaps.apiNameByFieldId,
          fieldMaps.fieldTypeByFieldId,
          submission.files,
        ),
      );
    }
  };

  const title =
    context?.pin != null
      ? `Location #${context.pin.location || context.pin.id}`
      : tPins("pageTitle");
  const productName =
    context?.pin?.item_detail?.name ||
    context?.pin?.group_detail?.name ||
    (context?.pin?.item != null ? `#${context.pin.item}` : null);
  const rendererKey = `${context?.pin?.id ?? "pin"}-${isReadOnly ? "view" : "edit"}-${submission?.id ?? "new"}-${Object.keys(defaultValues).length}`;
  const qaPinId = context?.pin?.id ?? pinId;

  const pinStatusDetail =
    context?.pin?.status_detail ||
    (context?.pin as any)?.statusDetail;
  const pinStatusName = (
    pinStatusDetail?.status_name ||
    (pinStatusDetail as any)?.name ||
    (typeof (context?.pin as any)?.status === "object" && (context?.pin as any)?.status !== null
      ? (context?.pin as any).status.status_name || (context?.pin as any).status.name
      : "") ||
    (typeof context?.pin?.status === "string" ? context.pin.status : "") ||
    (context?.pin as any)?.status_name ||
    ""
  ).toLowerCase().trim();

  const isPinCompleted =
    pinStatusName === "completed" ||
    pinStatusName.includes("complet") ||
    (pinStatusDetail as any)?.category === "closed" ||
    String(context?.pin?.status_id).toLowerCase() === "completed" ||
    String(context?.pin?.status).toLowerCase() === "completed" ||
    context?.pin?.status === 3 ||
    context?.pin?.status_id === 3 ||
    pinStatusDetail?.id === 3;

  const pinQa = context?.pin?.quality_assurance ?? null;

  const rawQaStatus = String(
    (typeof pinQa === "object" && pinQa !== null ? pinQa.status : pinQa) ||
    (context?.pin as any)?.qa_status ||
    (context?.pin as any)?.quality_assurance_status ||
    (typeof (context?.pin as any)?.quality_assurance === "string" ? (context?.pin as any).quality_assurance : "") ||
    ""
  ).toLowerCase().replace(/[\s_-]/g, "");

  const isQaApproved =
    isQualityAssuranceApproved(pinQa) ||
    rawQaStatus.includes("qaapp") ||
    rawQaStatus.includes("qapp") ||
    rawQaStatus === "approved" ||
    rawQaStatus.includes("approved");
  const tQa = useTranslations("Dashboard.jobs.qualityAssurance");
  const qaDecided = isQualityAssuranceDecided(pinQa);

  const handleQaSuccess = (newRecord?: QualityAssuranceRecord) => {
    if (newRecord && context?.pin) {
      setContext((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          pin: {
            ...prev.pin,
            quality_assurance: newRecord,
          },
        };
      });
    }
    setReloadToken((n) => n + 1);
  };

  const isFormSubmitted = Boolean(
    (submissionId != null && submissionId > 0) ||
    hasSubmission ||
    (submission?.id != null && submission.id > 0) ||
    (submission?.submission_id != null && submission.submission_id > 0) ||
    (createdSubmissionId != null && createdSubmissionId > 0) ||
    (context?.pin as any)?.submit_forms_details?.submission_status === "submitted" ||
    (context?.pin as any)?.submission_status === "submitted" ||
    context?.formMeta?.submitted
  );

  const formImages = React.useMemo(
    () => collectFormImagePreviews(rawSections, defaultValues),
    [rawSections, defaultValues],
  );

  const urlName = searchParams.get("name")?.trim();
  const resolvedFormName =
    formName ||
    (urlName && urlName !== "" ? urlName : null) ||
    submission?.form_name?.trim() ||
    (context?.pin?.project_form && typeof context.pin.project_form === "object"
      ? (context.pin.project_form as any).name?.trim()
      : null) ||
    (formMeta?.label && !formMeta.label.startsWith("#") ? formMeta.label.trim() : null) ||
    (projectFormId ? `Form #${projectFormId}` : tPins("assignedForm"));

  const levelsAsDrawings = React.useMemo(() => {
    if (!context?.drawingFile) return [];
    return [
      {
        id: context.drawingId ?? 1,
        name: context.drawingName,
        drawing_file: context.drawingFile,
        drawing_file_type: context.drawingFile.toLowerCase().includes("pdf") ? "pdf" : "",
      } as unknown as Drawing,
    ];
  }, [context?.drawingFile, context?.drawingId, context?.drawingName]);

  const levelSnapshots = useLevelSnapshots(levelsAsDrawings);
  const snapshotState = context?.drawingId
    ? levelSnapshots.get(context.drawingId)
    : levelSnapshots.get(1);

  const currentIndex = React.useMemo(() => {
    if (pinNavList.length === 0) return -1;
    return pinNavList.findIndex(
      (item) => item.pinId === pinId || item.job_pin_id === pinId,
    );
  }, [pinNavList, pinId]);

  const prevPin = currentIndex > 0 ? pinNavList[currentIndex - 1] : null;
  const nextPin =
    currentIndex >= 0 && currentIndex < pinNavList.length - 1
      ? pinNavList[currentIndex + 1]
      : null;

  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  const handleDownloadPdf = async () => {
    if (downloadingPdf) return;
    setDownloadingPdf(true);
    try {
      const pin = context?.pin;
      const locationText = pin?.location ? String(pin.location) : String(pin?.id ?? "");
      const prodName =
        pin?.item_detail?.name ||
        pin?.group_detail?.name ||
        (pin?.item != null ? `#${pin.item}` : "-");
      const parentPlot =
        context?.plots?.find((p) => p.pins.some((pinItem) => pinItem.id === pin?.id)) ||
        context?.plots?.[0];
      const plotName = parentPlot?.name || "-";
      const levelName = context?.drawingName || "-";
      const statusName =
        pin?.status_detail?.status_name || (pin?.status_detail as any)?.name || "Pending";
      const statusColor = pin?.status_detail?.bg_colour || "#10b981";
      const statusTextColor = pin?.status_detail?.text_colour || "#ffffff";
      const formLabel =
        resolvedFormName ||
        context?.formMeta?.label ||
        "-";

      const pinAttachments =
        pin?.attachments?.map((att, idx) => ({
          name: att.file_name ?? att.name ?? `Attachment #${att.id || idx + 1}`,
          url: att.file_url ?? att.url ?? (typeof att.file === "string" ? att.file : ""),
        })) ?? [];

      let previewImageUrl: string | null = null;
      const rawDrawing =
        (snapshotState?.status === "ready" && snapshotState.snapshot?.objectUrl) ||
        context?.drawingFile ||
        null;

      if (rawDrawing && pin?.x_coordinate != null && pin?.y_coordinate != null) {
        const resolvedDrawing =
          rawDrawing.startsWith("blob:") || rawDrawing.startsWith("data:")
            ? rawDrawing
            : resolveDrawingFileUrl(rawDrawing);

        previewImageUrl = await generatePinCropDataUrl(
          resolvedDrawing,
          pin.x_coordinate,
          pin.y_coordinate,
          statusColor,
          `#${locationText}`,
          levelName,
        );
      }

      await generateAndDownloadFormPdf({
        formTitle: resolvedFormName,
        formId: projectFormId,
        locationText,
        productName: prodName,
        plotName,
        levelName,
        statusName,
        submittedAt: submission?.submitted_at ? new Date(submission.submitted_at).toLocaleString() : null,
        sections: rawSections,
        defaultValues,
        submission,
        rules,
        pinDetails: {
          location: locationText,
          productName: prodName,
          quantity: pin?.quantity ?? 1,
          statusName,
          statusColor,
          statusTextColor,
          plotName,
          levelName,
          description: pin?.description || "-",
          formName: formLabel,
          variation: pin?.variation ? "Yes" : "No",
          previewImageUrl,
          attachments: pinAttachments,
        },
      });
      toastSuccess("PDF downloaded successfully");
    } catch (err) {
      toastApiError(err, "Failed to generate PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <>
      <DetailPageHeader
        title={loading ? <DetailPageHeaderTitleSkeleton /> : title}
        titleLoading={loading}
        backHref={safeBack}
        backAriaLabel={tPins("backAria")}
        subtitle={productName ?? undefined}
      />
      <DetailPagePadding className="-mt-4 sm:-mt-5">
        {loading ? (
          <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-5 pt-4">
            <div className="flex-1 min-w-0 h-[28rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 min-w-0 h-[28rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError || !context ? (
          <SurfaceShell className="px-4 py-10 sm:px-6 mt-4">
            <p className="text-sm text-slate-600 dark:text-slate-300">{loadError ?? tPins("loadError")}</p>
            <div className="mt-4">
              <Link
                href={safeBack}
                className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {tPins("backAria")}
              </Link>
            </div>
          </SurfaceShell>
        ) : (
          <div className="flex flex-col lg:flex-row items-start gap-4 lg:gap-5">
            {/* Left Column - Assigned Form taking maximum space */}
            <div className="flex-1 min-w-0 pt-0 pb-12">
              {/* Sticky Form Action Header */}
              <div className="sticky -top-4 sm:-top-5 z-20 bg-slate-50 dark:bg-slate-950 before:absolute before:-top-12 before:inset-x-0 before:h-12 before:bg-slate-50 dark:before:bg-slate-950 before:pointer-events-none pt-4 sm:pt-5 pb-2.5 -mt-4 sm:-mt-5 border-b border-slate-200/80 dark:border-slate-800 mb-3">
                <div className="flex items-center justify-between gap-3 px-1">
                  {/* Left: Form Title & ID */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-slate-100 truncate">
                      {resolvedFormName}
                    </span>
                    {projectFormId ? (
                      <span className="text-xs font-normal text-slate-400 shrink-0">
                        #{projectFormId}
                      </span>
                    ) : null}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Pagination Controls */}
                    <div className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      <button
                        type="button"
                        disabled={!prevPin}
                        onClick={() => {
                          if (prevPin) {
                            router.push(buildPinPreviewUrl(prevPin));
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={prevPin ? `Previous pin (#${prevPin.pinId})` : "Previous"}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>Previous</span>
                      </button>
                      <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                      {currentIndex >= 0 && pinNavList.length > 0 && (
                        <>
                          <div
                            className="relative inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer select-none group"
                            title="Click to select form number"
                          >
                            <span className="tabular-nums">
                              {currentIndex + 1} / {pinNavList.length}
                            </span>
                            <ChevronDown className="h-3 w-3 ml-0.5 text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                            <select
                              value={currentIndex}
                              onChange={(e) => {
                                const nextIdx = Number(e.target.value);
                                if (
                                  Number.isFinite(nextIdx) &&
                                  nextIdx >= 0 &&
                                  nextIdx < pinNavList.length &&
                                  pinNavList[nextIdx]
                                ) {
                                  router.push(buildPinPreviewUrl(pinNavList[nextIdx]));
                                }
                              }}
                              className="absolute inset-0 size-full opacity-0 cursor-pointer"
                              aria-label="Select form number"
                            >
                              {pinNavList.map((item, idx) => (
                                <option
                                  key={item.pinId ?? idx}
                                  value={idx}
                                  className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs py-1"
                                >
                                  {idx + 1} / {pinNavList.length}{item.name ? ` - ${item.name}` : ""}{item.pinId ? ` (Location #${item.pinId})` : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                          <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />
                        </>
                      )}
                      <button
                        type="button"
                        disabled={!nextPin}
                        onClick={() => {
                          if (nextPin) {
                            router.push(buildPinPreviewUrl(nextPin));
                          }
                        }}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        title={nextPin ? `Next pin (#${nextPin.pinId})` : "Next"}
                      >
                        <span>Next</span>
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Download PDF Button - only visible if form is submitted */}
                    {isFormSubmitted ? (
                      <button
                        type="button"
                        disabled={downloadingPdf || loadingForm || rawSections.length === 0}
                        onClick={handleDownloadPdf}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors"
                        title="Download Form PDF"
                      >
                        {downloadingPdf ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                        ) : (
                          <Download className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
                        )}
                        <span>{downloadingPdf ? "Generating..." : "Download PDF"}</span>
                      </button>
                    ) : null}

                    {/* Form Edit / Save Actions */}
                    {formMeta ? (
                      isReadOnly ? (
                        <AppButton
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsEditMode(true)}
                          className="h-7 px-2.5 text-xs font-semibold"
                        >
                          {t("edit")}
                        </AppButton>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {hasSubmission ? (
                            <AppButton
                              type="button"
                              variant="secondary"
                              size="sm"
                              disabled={submitting}
                              onClick={handleCancelEdit}
                              className="h-7 px-2.5 text-xs font-semibold"
                            >
                              {t("cancel")}
                            </AppButton>
                          ) : null}
                          <AppButton
                            type="button"
                            variant="primary"
                            size="sm"
                            loading={submitting}
                            disabled={submitting || loadingForm}
                            onClick={() => void handleFormSubmit()}
                            className="h-7 px-2.5 text-xs font-semibold"
                          >
                            {hasSubmission ? t("saveChanges") : t("submit")}
                          </AppButton>
                        </div>
                      )
                    ) : null}

                    {/* Quality Assurance Controls (Approve / Reject) - only visible if form is submitted, pin status is Completed, and not QA Approved */}
                    {isFormSubmitted && effectiveJobId != null && qaPinId != null && isPinCompleted && !isQaApproved ? (
                      <JobQualityAssuranceControls
                        jobId={effectiveJobId}
                        pinIds={[qaPinId]}
                        existing={pinQa}
                        buttonSize="sm"
                        approveClassName="h-7 px-2.5 text-xs font-semibold"
                        rejectClassName="h-7 px-2.5 text-xs font-semibold"
                        onSuccess={handleQaSuccess}
                      />
                    ) : null}
                  </div>
                </div>

                {/* Submitted date as part of the sticky header */}
                {isReadOnly && submission?.submitted_at ? (
                  <div className="text-xs text-slate-500 dark:text-slate-400 px-1 mt-1">
                    <span>
                      {t("submittedAt")}:{" "}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {new Date(submission.submitted_at).toLocaleString()}
                      </span>
                    </span>
                  </div>
                ) : null}
              </div>

              {/* Form Content Body */}
              {!formMeta ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {tPins("noFormAssigned")}
                </p>
              ) : loadingForm ? (
                <div className="space-y-3">
                  <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                  <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                </div>
              ) : formError ? (
                <p className="text-sm text-red-600 dark:text-red-400 mt-7">{formError}</p>
              ) : displaySections.length > 0 ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-950">
                    <FormRenderer
                      key={rendererKey}
                      ref={formRef}
                      schema={displaySections}
                      rules={rules}
                      defaultValues={defaultValues}
                      renderMode="desktop"
                    />
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {t("emptySchema")}
                </p>
              )}
            </div>

            {/* Right Column - Single Pin Card sticky to header and side with comfortable width */}
            <div
              className={cn(
                "w-full lg:w-[340px] xl:w-[380px] shrink-0 min-w-0",
                "lg:sticky lg:top-0 lg:self-start lg:overflow-y-auto",
                "lg:-mr-6 -mr-4",
                "lg:max-h-[calc(100dvh-3.5rem)]",
              )}
            >
              <PinCard
                context={context}
                qaDecided={qaDecided}
                pinQa={pinQa}
                dateFmt={dateFmt}
                formImages={formImages}
                tPins={tPins}
                tQa={tQa}
                formName={resolvedFormName}
                snapshotState={snapshotState}
                onPreviewClick={() => {}}
                effectiveJobId={effectiveJobId}
                qaPinId={qaPinId}
                onQaSuccess={handleQaSuccess}
                isFormSubmitted={isFormSubmitted}
                onPinUpdated={() => setReloadToken((n) => n + 1)}
              />
            </div>
          </div>
        )}
      </DetailPagePadding>


    </>
  );
}

function DrawingPinThumbnail({
  drawingFile,
  drawingName,
  plots,
  pin,
  snapshotState,
  onClick,
}: {
  drawingFile: string;
  drawingName: string;
  plots: DrawingPlot[];
  pin: DrawingPin;
  snapshotState?: LevelSnapshotState;
  onClick: () => void;
}) {
  const statusColor = pin.status_detail?.bg_colour || "#10b981";
  const locationText = pin.location || String(pin.id);

  return (
    <div
      className="relative h-36 w-full overflow-hidden bg-slate-100 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-center select-none"
    >
      {/* Real Drawing Background - Focused thumbnail using snapshot */}
      {snapshotState?.status === "ready" && snapshotState.snapshot ? (
        <PinThumbnailCropped
          snapshotUrl={snapshotState.snapshot.objectUrl}
          snapshotWidth={snapshotState.snapshot.width}
          snapshotHeight={snapshotState.snapshot.height}
          xPercent={pin.x_coordinate}
          yPercent={pin.y_coordinate}
          marginFraction={0.18}
          pinColor={statusColor}
          pinLabel={`#${locationText}`}
          className="absolute inset-0"
          alt={drawingName || "Pin Preview"}
        />
      ) : snapshotState?.status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-slate-800 animate-pulse">
          <div className="h-full w-full bg-slate-200/60 dark:bg-slate-700/60" />
        </div>
      ) : drawingFile && plots.length > 0 ? (
        <span className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              transformOrigin: `${pin.x_coordinate}% ${pin.y_coordinate}%`,
              transform: `translate(${50 - pin.x_coordinate}%, ${50 - pin.y_coordinate}%) scale(3)`,
            }}
          >
            <DrawingFilePreviewFill
              drawingFile={drawingFile}
              fileType={drawingFile.toLowerCase().includes("pdf") ? "pdf" : ""}
              alt={drawingName || "Drawing"}
              className="size-full"
            />
            <DrawingPinThumbnailOverlay
              plots={plots}
              activePinId={pin.id}
            />
          </div>
        </span>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-400">
          No drawing blueprint
        </div>
      )}

      {/* Blueprint Grid Subtle Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />



      {/* Level / Drawing Tag in top-left */}
      <div className="absolute top-2 left-2 z-10">
        <span className="inline-flex items-center gap-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <Map className="h-3 w-3 text-blue-500" />
          {drawingName || "Blueprint"}
        </span>
      </div>


    </div>
  );
}

async function filesToPinAttachments(files: File[]): Promise<DrawingPinAttachment[]> {
  if (!files.length) return [];
  const now = Date.now();
  const out: DrawingPinAttachment[] = [];
  let i = 0;
  for (const file of files) {
    out.push({
      id: -(now + i),
      file_name: file.name,
      content_type: file.type || null,
      file: file as any,
      url: URL.createObjectURL(file),
    });
    i++;
  }
  return out;
}

async function downloadPinAttachment(url: string | null | undefined, name: string) {
  if (!url) return;
  if (url.startsWith("blob:") || url.startsWith("data:")) {
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Failed to download file:", error);
    window.open(url, "_blank");
  }
}

function PinCard({
  context,
  qaDecided,
  pinQa,
  dateFmt,
  formImages,
  tPins,
  tQa,
  formName,
  snapshotState,
  onPreviewClick,
  effectiveJobId,
  qaPinId,
  onQaSuccess,
  isFormSubmitted,
  onPinUpdated,
}: {
  context: PinContext;
  qaDecided: boolean;
  pinQa: any;
  dateFmt: Intl.DateTimeFormat;
  formImages: Array<{ url: string; label: string }>;
  tPins: any;
  tQa: any;
  formName: string;
  snapshotState?: LevelSnapshotState;
  onPreviewClick: () => void;
  effectiveJobId?: number;
  qaPinId?: number;
  onQaSuccess?: (record?: QualityAssuranceRecord) => void;
  isFormSubmitted?: boolean;
  onPinUpdated?: () => void;
}) {
  const pin = context.pin;
  const locationText = pin.location || String(pin.id);
  const productName =
    pin.item_detail?.name ||
    pin.group_detail?.name ||
    (pin.item != null ? `#${pin.item}` : "-");
  const parentPlot =
    context.plots.find((p) => p.pins.some((pinItem) => pinItem.id === pin.id)) ||
    context.plots[0];
  const plotName = parentPlot?.name || "-";
  const levelName = context.drawingName || "-";
  const statusName =
    pin.status_detail?.status_name || (pin.status_detail as any)?.name || "Pending";
  const statusColor = pin.status_detail?.bg_colour || "#10b981";
  const statusTextColor = pin.status_detail?.text_colour || "#ffffff";
  const formLabel =
    formName ||
    context.formMeta?.label ||
    (pin.project_form && typeof pin.project_form === "object" ? pin.project_form.name : null) ||
    "-";

  const effectiveProjectId = context.projectId;
  const effectiveDrawingId = context.drawingId;

  const [isEditing, setIsEditing] = React.useState(false);
  const [pinEditData, setPinEditData] = React.useState<DrawingPin | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [itemsList, setItemsList] = React.useState<CompositeItem[]>([]);
  const [statusesList, setStatusesList] = React.useState<PinStatus[]>([]);
  const [formsList, setFormsList] = React.useState<FormListItem[]>([]);

  React.useEffect(() => {
    setIsEditing(false);
    setPinEditData(null);
  }, [pin.id]);

  React.useEffect(() => {
    if ((isEditing || itemsList.length === 0) && effectiveProjectId) {
      Promise.allSettled([
        fetchCompositeItemsPage(1, 100, { dropdown: true }),
        fetchPinStatusesPage(1, 100, { dropdown: true }),
        fetchProjectFormsPage(effectiveProjectId, 1, 100, { dropdown: true }),
      ]).then(([itemsRes, statusesRes, formsRes]) => {
        if (itemsRes.status === "fulfilled") setItemsList(itemsRes.value.items);
        if (statusesRes.status === "fulfilled") setStatusesList(statusesRes.value.items);
        if (formsRes.status === "fulfilled") setFormsList(formsRes.value.items);
      });
    }
  }, [isEditing, effectiveProjectId, itemsList.length]);

  const activeItemId = isEditing && pinEditData ? (pinEditData.item ?? pin.item) : pin.item;
  const activeItemDetail = isEditing && pinEditData
    ? (itemsList.find((i) => i.id === activeItemId) ?? pinEditData.item_detail ?? pin.item_detail)
    : pin.item_detail;

  const activeInstallationType: string = React.useMemo(() => {
    const rawInstType =
      (activeItemDetail as any)?.installation_type ??
      (activeItemDetail as any)?.installation_type_id ??
      (pin as any).installation_type ??
      (pin as any).installation_type_id ??
      (pinEditData as any)?.installation_type ??
      (pinEditData as any)?.installation_type_id ??
      "";
    if (!rawInstType) return "";
    if (typeof rawInstType === "object") {
      return String(rawInstType.name ?? rawInstType.label ?? rawInstType.id ?? "").trim();
    }
    return String(rawInstType).trim();
  }, [activeItemDetail, pin, pinEditData]);

  const formsForSelect = React.useMemo(() => {
    if (!activeInstallationType) return formsList;
    const match = formsList.filter((f) => {
      const fType =
        (f as any).installation_type ??
        (f as any).installation_type_id ??
        (f as any).installation_type_detail?.name ??
        "";
      if (!fType) return false;
      if (typeof fType === "object") {
        const name = String(fType.name ?? fType.label ?? fType.id ?? "").trim();
        return name.toLowerCase() === activeInstallationType.toLowerCase();
      }
      return String(fType).trim().toLowerCase() === activeInstallationType.toLowerCase();
    });
    return match.length > 0 ? match : formsList;
  }, [formsList, activeInstallationType]);

  const selectedProjectFormId = React.useMemo(() => {
    if (isEditing && pinEditData) {
      if (typeof pinEditData.formId === "number") return pinEditData.formId;
      if (typeof pinEditData.project_form === "number") return pinEditData.project_form;
      if (pinEditData.project_form && typeof pinEditData.project_form === "object") {
        return (pinEditData.project_form as any).id ?? null;
      }
    }
    return (
      resolvePinProjectFormId(pin) ??
      (typeof context.formMeta?.projectFormId === "number" && context.formMeta.projectFormId > 0
        ? context.formMeta.projectFormId
        : null)
    );
  }, [isEditing, pinEditData, pin, context.formMeta]);

  async function handleSave() {
    if (!pinEditData || !effectiveProjectId || !effectiveDrawingId || !pin) {
      toastError("Cannot save: project or drawing information is missing");
      return;
    }
    setSaving(true);
    try {
      let allPlots = context.plots ?? [];
      try {
        const freshDrawing = await fetchDrawingDetail(effectiveProjectId, effectiveDrawingId);
        if (freshDrawing?.plots && freshDrawing.plots.length > 0) {
          allPlots = freshDrawing.plots;
        }
      } catch (err) {
        console.warn("Could not fetch fresh drawing detail, using context plots", err);
      }

      const ownerPlot =
        allPlots.find((plot) => plot.pins?.some((p) => p.id === pin.id)) ?? allPlots[0];

      const formData = new FormData();

      const newAttachments = (pinEditData.attachments ?? pin.attachments ?? []) as DrawingPinAttachment[];
      const attachmentFileKey = "plots[0][pins][0][attachments]";
      let attachFileIdx = 0;
      newAttachments.forEach((att: any) => {
        if (att.file) {
          formData.append(`${attachmentFileKey}[${attachFileIdx}]`, att.file);
          attachFileIdx++;
        }
      });

      const pinPayload = {
        id: pin.id,
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
        status: pinEditData.status ?? pin.status ?? undefined,
        group: pin.group ?? null,
        item: pinEditData.item ?? pin.item ?? null,
        project_form:
          pinEditData.formId ??
          (typeof pinEditData.project_form === "number" ? pinEditData.project_form : null) ??
          null,
        quantity:
          pinEditData.quantity === ("" as any) ||
          pinEditData.quantity == null ||
          isNaN(Number(pinEditData.quantity))
            ? (pin.quantity ?? 1)
            : Number(pinEditData.quantity),
        variation: pinEditData.variation ?? pin.variation ?? false,
        location: pin.location,
        description: pinEditData.description ?? pin.description ?? undefined,
        attachments: newAttachments
          .filter((att: any) => !att.file)
          .map((att: any) => ({ id: att.id })),
      };

      const ownerPlotPayload = ownerPlot
        ? {
            id: ownerPlot.id,
            name: ownerPlot.name,
            coordinates: ownerPlot.coordinates,
            plot_border: ownerPlot.plot_border,
            plot_bg: ownerPlot.plot_bg,
            pins: [
              pinPayload,
              ...(ownerPlot.pins ?? [])
                .filter((p) => p.id !== pin.id)
                .map((p) => ({
                  id: p.id,
                  x_coordinate: p.x_coordinate,
                  y_coordinate: p.y_coordinate,
                  status: p.status ?? undefined,
                  group: p.group ?? null,
                  item: p.item ?? null,
                  project_form:
                    p.formId ??
                    (typeof p.project_form === "number" ? p.project_form : null) ??
                    null,
                  quantity: p.quantity ?? 1,
                  variation: p.variation ?? false,
                  location: p.location,
                  description: p.description ?? undefined,
                  attachments: (p.attachments ?? [])
                    .filter((att: any) => !att.file)
                    .map((att: any) => ({ id: att.id })),
                })),
            ],
          }
        : { pins: [pinPayload] };

      const otherPlotStubs = (allPlots ?? [])
        .filter((plot) => plot.id !== ownerPlot?.id && !plot.pins?.some((p) => p.id === pin.id))
        .map((plot) => ({
          id: plot.id,
          name: plot.name,
          coordinates: plot.coordinates,
          plot_border: plot.plot_border,
          plot_bg: plot.plot_bg,
          pins: (plot.pins ?? []).map((p) => ({
            id: p.id,
            x_coordinate: p.x_coordinate,
            y_coordinate: p.y_coordinate,
            status: p.status ?? undefined,
            group: p.group ?? null,
            item: p.item ?? null,
            project_form:
              p.formId ??
              (typeof p.project_form === "number" ? p.project_form : null) ??
              null,
            quantity: p.quantity ?? 1,
            variation: p.variation ?? false,
            location: p.location,
            description: p.description ?? undefined,
            attachments: (p.attachments ?? [])
              .filter((att: any) => !att.file)
              .map((att: any) => ({ id: att.id })),
          })),
        }));

      const payload = {
        name: context.drawingName,
        plots: [ownerPlotPayload, ...otherPlotStubs],
      };

      formData.append("payload", JSON.stringify(payload));

      await updateDrawingPlots(effectiveProjectId, effectiveDrawingId, formData);

      toastSuccess("Pin details saved successfully");
      setIsEditing(false);
      onPinUpdated?.();
    } catch (err) {
      console.error(err);
      toastError("Failed to save pin details");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl lg:rounded-none lg:rounded-bl-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 overflow-hidden lg:border-r-0 lg:border-t-0">
      {/* 1. Top Section: Pin Preview with Focused Drawing Snapshot */}
      <DrawingPinThumbnail
        drawingFile={context.drawingFile}
        drawingName={context.drawingName}
        plots={context.plots}
        pin={pin}
        snapshotState={snapshotState}
        onClick={onPreviewClick}
      />

      {/* 2. Title Section: Location & Product Name + Edit/Cancel/Save actions */}
      <div className="flex items-start justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800/80 gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
            Location #{locationText}
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
            {isEditing && pinEditData
              ? (itemsList.find((i) => i.id === pinEditData.item)?.name ?? productName)
              : productName}
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {effectiveProjectId && effectiveDrawingId ? (
            isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setPinEditData(null);
                  }}
                  disabled={saving}
                  className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="px-3.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-all shadow-md shadow-blue-100 dark:shadow-none flex items-center gap-1"
                >
                  {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                  Save
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const normalizedFormId =
                    resolvePinProjectFormId(pin) ??
                    (typeof context.formMeta?.projectFormId === "number" &&
                    context.formMeta.projectFormId > 0
                      ? context.formMeta.projectFormId
                      : null);
                  setPinEditData({
                    ...pin,
                    formId: normalizedFormId,
                    project_form: normalizedFormId,
                  });
                  setIsEditing(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit
              </button>
            )
          ) : null}
        </div>
      </div>

      {/* 3. Details list (Original UI style with compact padding & inline edit inputs) */}
      <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 overflow-y-auto min-h-0 flex-1">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Details
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {/* 1. Product Name */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Product Name</span>
              </div>
              <div className="flex-1 flex justify-end">
                {isEditing && pinEditData ? (
                  <select
                    value={String(pinEditData.item ?? pin.item ?? "")}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPinEditData((prev) => (prev ? { ...prev, item: parseInt(val, 10) || undefined } : null));
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-900 dark:text-slate-100"
                  >
                    <option value="">Select Product</option>
                    {itemsList.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right truncate" title={productName}>
                    {productName}
                  </span>
                )}
              </div>
            </div>

            {/* Product Attachments if present on item */}
            {(() => {
              const attachments = (activeItemDetail as any)?.attachments;
              return attachments && attachments.length > 0 ? (
                <div className="py-2.5 border-b border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Product Attachments</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.map((att: any, idx: number) => {
                      const url =
                        att.file_url ??
                        att.url ??
                        (typeof att.attachment === "string" ? att.attachment : null) ??
                        (typeof att.file === "string" ? att.file : null);
                      const name = att.file_name ?? att.name ?? (att.id != null ? `Attachment #${att.id}` : `Attachment ${idx + 1}`);
                      const fileType = name.split(".").pop()?.toUpperCase() || "FILE";
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg"
                        >
                          <div className="flex flex-col min-w-0">
                            <p className="text-xs truncate font-semibold text-red-900 dark:text-red-200" title={name}>
                              {name}
                            </p>
                            <p className="text-[10px] text-red-700 dark:text-red-300">{fileType}</p>
                          </div>
                          <button
                            type="button"
                            disabled={!url}
                            className="text-[10px] font-semibold text-red-600 hover:text-red-700 hover:underline disabled:text-slate-400 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300 transition-colors bg-transparent border-none p-0 flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                            onClick={() => downloadPinAttachment(url, name)}
                          >
                            <Download className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null;
            })()}

            {/* 2. Quantity */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Quantity</span>
              </div>
              <div className="flex-1 flex justify-end">
                {isEditing && pinEditData ? (
                  <input
                    type="number"
                    min={1}
                    value={
                      pinEditData.quantity !== undefined
                        ? pinEditData.quantity
                        : (pin.quantity ?? 1)
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      setPinEditData((prev) =>
                        prev ? { ...prev, quantity: val === "" ? ("" as any) : parseInt(val, 10) } : null,
                      );
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 w-20 text-slate-900 dark:text-slate-100"
                  />
                ) : (
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right">
                    {pin.quantity ?? 1}
                  </span>
                )}
              </div>
            </div>

            {/* 3. Status */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <Activity className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Status</span>
              </div>
              <div className="flex-1 flex justify-end">
                {isEditing && pinEditData ? (
                  <select
                    value={String(pinEditData.status ?? pin.status ?? "")}
                    onChange={(e) => {
                      const s = statusesList.find((st) => String(st.id) === e.target.value);
                      if (s) setPinEditData((prev) => (prev ? { ...prev, status: s.id } : null));
                    }}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-900 dark:text-slate-100"
                  >
                    {statusesList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.status_name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                    style={{ backgroundColor: statusColor, color: statusTextColor }}
                  >
                    <CheckCircle2 className="h-3 w-3" />
                    {statusName}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Location */}
            <DetailRowItem icon={MapPin} label="Location" value={locationText} />

            {/* 5. Plot */}
            <DetailRowItem icon={LayoutGrid} label="Plot" value={plotName} />

            {/* 6. Level */}
            <DetailRowItem icon={Layers} label="Level" value={levelName} />

            {/* 7. Description */}
            <div className="flex items-start justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <FileText className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Description</span>
              </div>
              <div className="flex-1 flex justify-end">
                {isEditing && pinEditData ? (
                  <textarea
                    rows={3}
                    value={String(pinEditData.description ?? pin.description ?? "")}
                    onChange={(e) =>
                      setPinEditData((prev) => (prev ? { ...prev, description: e.target.value } : null))
                    }
                    className="w-full max-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  />
                ) : (
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap text-right">
                    {pin.description || "-"}
                  </p>
                )}
              </div>
            </div>

            {/* 8. Attachments */}
            <div className="py-2 border-b border-slate-100 dark:border-slate-800/50">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Attachments</span>
                </div>
                {isEditing ? (
                  <div className="w-1/2 flex justify-end">
                    <input
                      type="file"
                      multiple
                      className="block w-full text-xs text-slate-700 dark:text-slate-200"
                      onChange={(e) => {
                        const files = Array.from(e.target.files ?? []);
                        if (!files.length) return;
                        void (async () => {
                          const draftAttachments = await filesToPinAttachments(files);
                          setPinEditData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  attachments: [
                                    ...(prev.attachments ?? pin.attachments ?? []),
                                    ...draftAttachments,
                                  ],
                                }
                              : null,
                          );
                        })();
                        e.currentTarget.value = "";
                      }}
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-2 space-y-1.5">
                {(() => {
                  const attachments =
                    (isEditing && pinEditData ? pinEditData.attachments : pin.attachments) ?? [];
                  if (!attachments.length) {
                    return isEditing ? null : <p className="text-xs text-slate-400 text-right">-</p>;
                  }
                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {attachments.map((att: any, idx: number) => {
                        const url =
                          att.url ??
                          att.file_url ??
                          (typeof att.attachment === "string" ? att.attachment : null) ??
                          (typeof att.file === "string" ? att.file : null) ??
                          att.data_url ??
                          att.file_data ??
                          (att.file && typeof att.file !== "string"
                            ? URL.createObjectURL(att.file as any)
                            : null);
                        const name =
                          att.file_name ??
                          att.name ??
                          (att.id != null ? `Attachment #${att.id}` : `Attachment ${idx + 1}`);
                        const fileType = name.split(".").pop()?.toUpperCase() || "FILE";

                        return (
                          <div
                            key={idx}
                            className={cn(
                              "flex flex-col gap-1 px-2.5 py-1.5 border rounded-lg",
                              isEditing
                                ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50"
                                : "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700",
                            )}
                          >
                            <div className="flex flex-col min-w-0">
                              <p
                                className={cn(
                                  "text-xs truncate font-semibold",
                                  isEditing
                                    ? "text-blue-900 dark:text-blue-200"
                                    : "text-slate-700 dark:text-slate-200",
                                )}
                                title={name}
                              >
                                {name}
                              </p>
                              <p
                                className={cn(
                                  "text-[10px]",
                                  isEditing
                                    ? "text-blue-700 dark:text-blue-300"
                                    : "text-slate-600 dark:text-slate-400",
                                )}
                              >
                                {fileType}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 w-full mt-0.5">
                              {isEditing ? (
                                <button
                                  type="button"
                                  className="text-[10px] font-semibold text-red-600 hover:text-red-700 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                  onClick={() => {
                                    setPinEditData((prev) => {
                                      if (!prev) return null;
                                      const curr = (prev.attachments ?? pin.attachments ?? []) as DrawingPinAttachment[];
                                      return { ...prev, attachments: curr.filter((_, i) => i !== idx) };
                                    });
                                  }}
                                >
                                  Remove
                                </button>
                              ) : null}
                              {url ? (
                                <button
                                  type="button"
                                  className={cn(
                                    "text-[10px] font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-0.5",
                                    isEditing
                                      ? "text-blue-600 hover:text-blue-700"
                                      : "text-slate-600 hover:text-slate-700 ml-auto",
                                  )}
                                  onClick={() => downloadPinAttachment(url, name)}
                                >
                                  <Download className="h-3 w-3" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 9. Form */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <FileCheck className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Form</span>
              </div>
              <div className="flex-1 flex justify-end">
                {formsForSelect.length > 0 ? (
                  isEditing && pinEditData ? (
                    <select
                      value={String(selectedProjectFormId ?? "")}
                      onChange={(e) => {
                        const value = e.target.value;
                        setPinEditData((prev) =>
                          prev
                            ? {
                                ...prev,
                                formId: value ? Number(value) : null,
                                project_form: value ? Number(value) : null,
                              }
                            : null,
                        );
                      }}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-900 dark:text-slate-100"
                    >
                      <option value="">Select Form</option>
                      {formsForSelect.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {(opt as any).form_name || opt.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right truncate">
                      {formLabel}
                    </span>
                  )
                ) : activeInstallationType ? (
                  isEditing ? (
                    <select
                      disabled
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-400"
                    >
                      <option value="">No matching forms</option>
                    </select>
                  ) : (
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right truncate">
                      {formLabel}
                    </span>
                  )
                ) : isEditing ? (
                  <select
                    disabled
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs outline-none dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-400"
                  >
                    <option value="">Select Form</option>
                  </select>
                ) : (
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right truncate">
                    {formLabel}
                  </span>
                )}
              </div>
            </div>

            {/* 10. Variation */}
            <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800/50 gap-3">
              <div className="flex items-center gap-2 shrink-0">
                <ToggleLeft className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">Variation</span>
              </div>
              <div className="flex-1 flex justify-end">
                {isEditing ? (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!(pinEditData?.variation ?? pin.variation)}
                    onClick={() => {
                      setPinEditData((prev) => (prev ? { ...prev, variation: !prev.variation } : null));
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer",
                      (pinEditData?.variation ?? pin.variation)
                        ? "bg-blue-600"
                        : "bg-slate-200 dark:bg-slate-700",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform",
                        (pinEditData?.variation ?? pin.variation) ? "translate-x-6" : "translate-x-1",
                      )}
                    />
                  </button>
                ) : (
                  <span
                    className={cn(
                      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                      pin.variation
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {pin.variation ? "Yes" : "No"}
                  </span>
                )}
              </div>
            </div>

            {/* 11. QA Remarks */}
            <DetailRowItem
              icon={MessageSquare}
              label="QA Remarks"
              value={pin.qa_remarks || pinQa?.remarks || "-"}
            />
          </div>
        </div>

        {/* Location Coordinates (X Coordinate & Y Coordinate) */}
        <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Location
          </h3>
          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase">X Coordinate</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {Number(pin.x_coordinate ?? 0).toFixed(2)}%
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] font-medium text-slate-400 uppercase">Y Coordinate</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {Number(pin.y_coordinate ?? 0).toFixed(2)}%
              </p>
            </div>
          </div>
        </div>

        {/* QA Details section if decided */}
        {qaDecided && pinQa ? (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {tQa("sectionTitle")}
            </h3>
            <QualityAssuranceDetailGrid record={pinQa} dateFmt={dateFmt} />
          </div>
        ) : null}

        {/* Form Images section if any */}
        {formImages.length > 0 ? (
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {tPins("formImages")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {formImages.map((image) => (
                <a
                  key={image.url}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                  title={image.label}
                >
                  <img
                    src={image.url}
                    alt={image.label}
                    className="h-24 w-full object-cover transition group-hover:opacity-90"
                  />
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailRowItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <div className="flex items-center gap-2 shrink-0">
        <Icon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{label}</span>
      </div>
      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 text-right truncate min-w-0" title={typeof value === "string" ? value : undefined}>
        {typeof value === "string" || typeof value === "number" ? value : value}
      </div>
    </div>
  );
}
