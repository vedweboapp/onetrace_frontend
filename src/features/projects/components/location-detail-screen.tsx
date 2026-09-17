"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import api from "@/core/api/axios";
import {
  fetchJobFormSchema,
  fetchJobSubmittedForm,
  loadJobFormSubmission,
  normalizeSubmissionRow,
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
import { mapSubmissionValuesToFormDefaults } from "@/features/job-forms/utils/job-form-values.util";
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
import type { Job } from "@/features/jobs/types/job.types";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import { fetchPinDetail } from "@/features/projects/api/drawing.api";
import type { Drawing, DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
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
import { detailMapFormGridClassName } from "@/shared/components/layout/detail-page-map-layout";
import {
  QualityAssuranceDetailGrid,
} from "@/features/jobs/components/quality-assurance-status";
import {
  isQualityAssuranceDecided,
  type QualityAssuranceRecord,
} from "@/features/jobs/types/quality-assurance.types";
import {
  savePinsToSessionStorage,
  loadPinsFromSessionStorage,
  clearPinsFromSessionStorage,
  buildLocationPreviewUrl,
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
import { SurfaceShell } from "@/shared/ui";
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
): Promise<(Omit<PinContext, "formMeta"> & { rawFormMeta?: PinFormMeta | null; rawJobId?: number | null }) | null> {
  try {
    const pinData = await fetchPinDetail(pinId);
    if (pinData) {
      const ld = pinData.level_detail;
      const plots = (ld?.plots ?? []) as DrawingPlot[];
      const targetPinId = Number(pinId);
      let foundPin: DrawingPin | null = null;
      for (const plot of plots) {
        const p = (plot.pins ?? []).find((entry) => {
          if (Number(entry.id) === targetPinId) return true;
          const jobPinId = Number(entry.job_pin_id);
          return Number.isFinite(jobPinId) && jobPinId > 0 && jobPinId === targetPinId;
        });
        if (p) {
          foundPin = p;
          break;
        }
      }

      // Extract job_id from top-level pinData fields (many possible keys)
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

      // Robust extraction of form & submission candidate (handling arrays or objects)
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
        (typeof (pinData as any).formId === "number" ? (pinData as any).formId : null);
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

      let rawFormMeta: PinFormMeta | null = null;
      let rawJobId: number | null = effectiveJobFromApi;

      if (pFormId != null || subId != null) {
        rawFormMeta = {
          projectFormId: pFormId ?? 1,
          jobFormId: pFormId ?? 1,
          label: formLabel,
          submitted:
            sfdCandidate?.submission_status === "submitted" ||
            (pinData as any).submission_status === "submitted" ||
            (subId != null && subId > 0),
          submissionId: subId,
        };
      }

      return {
        pin: resolvedPin,
        plots,
        drawingFile: ld?.drawing_file ?? "",
        drawingName: ld?.name ?? "",
        drawingId: ld?.id,
        projectId: ld?.project ?? projectIdHint,
        rawFormMeta,
        rawJobId,
      };
    }
  } catch (err) {
    console.warn("fetchPinDetail failed in LocationDetailScreen, falling back to drawings resolution", err);
  }
  return null;
}

export function LocationDetailScreen({ pinId, jobId, projectId, drawingIdHint }: Props) {
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
  const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
  /** job_id resolved from the pin API response — used when no jobId prop is provided */
  const [pinApiJobId, setPinApiJobId] = React.useState<number | null>(null);

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
  const [job, setJob] = React.useState<Job | null>(null);

  React.useEffect(() => {
    setCreatedSubmissionId(null);
  }, [pinId, projectId, jobId]);

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
        let fetchedJob: Job | null = null;
        let formEntries: ReturnType<typeof jobFormEntries> = [];
        let resolvedProjectId = projectId;

        if (jobId != null && jobId > 0) {
          fetchedJob = await fetchJob(jobId, { silent: true });
          if (cancelled) return;
          setJob(fetchedJob);
          setJobCategoryForNav(resolveJobCategory(fetchedJob));
          // If sessionStorage pin list is not yet populated, extract & cache it
          const stored = loadPinsFromSessionStorage(jobId);
          if (stored.length === 0) {
            const trimmed = extractTrimmedPinsFromJob(fetchedJob);
            if (trimmed.length > 0) {
              savePinsToSessionStorage(jobId, trimmed);
              setPinNavList(trimmed);
            }
          }
          const typed = fetchedJob as unknown as {
            project?: number | { id: number };
          };
          formEntries = jobFormEntries(fetchedJob);
          resolvedProjectId =
            typeof typed.project === "number"
              ? typed.project
              : typed.project && typeof typed.project === "object"
                ? typed.project.id
                : resolvedProjectId;
        }

        // 1. Direct fetch using /pins/${pinId}/
        const fromPinApi = await resolvePinFromPinApi(pinId, resolvedProjectId);
        if (cancelled) return;

        if (fromPinApi) {
          const mergedFormMeta =
            fromPinApi.rawFormMeta ??
            resolvePinFormMeta(fromPinApi.pin, { formEntries });

          // Store the job_id extracted from the pin API so we can fetch submission data
          if (fromPinApi.rawJobId != null && fromPinApi.rawJobId > 0) {
            setPinApiJobId(fromPinApi.rawJobId);
          }

          setContext({
            pin: fromPinApi.pin,
            plots: fromPinApi.plots,
            drawingFile: fromPinApi.drawingFile,
            drawingName: fromPinApi.drawingName,
            drawingId: fromPinApi.drawingId,
            projectId: fromPinApi.projectId ?? resolvedProjectId,
            formMeta: mergedFormMeta,
          });
          return;
        }

        setContext(null);
        setLoadError(tPins("loadError"));
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
        : pinJobId ?? pinApiJobId);

  // Read pin preview navigation list from sessionStorage (by projectId or effectiveJobId)
  React.useEffect(() => {
    const idToLoad = projectId ?? effectiveJobId;
    if (idToLoad != null && idToLoad > 0) {
      const stored = loadPinsFromSessionStorage(idToLoad);
      if (stored.length > 0) {
        setPinNavList(stored);
      }
    }
  }, [projectId, effectiveJobId, pinId]);

  // Clean session storage for the pins list when closing/navigating away from location-details
  React.useEffect(() => {
    const handleUnload = () => {
      if (projectId) clearPinsFromSessionStorage(projectId);
      if (effectiveJobId) clearPinsFromSessionStorage(effectiveJobId);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      setTimeout(() => {
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.includes("/locations/") &&
          !window.location.pathname.includes("/pins/")
        ) {
          if (projectId) clearPinsFromSessionStorage(projectId);
          if (effectiveJobId) clearPinsFromSessionStorage(effectiveJobId);
        }
      }, 50);
    };
  }, [projectId, effectiveJobId]);

  // Fetch job details if not already loaded and effectiveJobId is available
  React.useEffect(() => {
    if (effectiveJobId != null && effectiveJobId > 0 && (!job || job.id !== effectiveJobId)) {
      let cancelled = false;
      fetchJob(effectiveJobId, { silent: true })
        .then((data) => {
          if (!cancelled && data) {
            setJob(data);
          }
        })
        .catch(() => { });
      return () => {
        cancelled = true;
      };
    }
  }, [effectiveJobId, job]);

  // Fetch form schema & submission values
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

        // 1. If we have effectiveJobId and submissionId, fetch via submitted form API
        if (effectiveJobId != null && effectiveJobId > 0 && submissionId != null && submissionId > 0) {
          try {
            loadedSubmission = await fetchJobSubmittedForm(effectiveJobId, submissionId);
          } catch (err) {
            console.warn("fetchJobSubmittedForm failed, falling back to loadJobFormSubmission", err);
          }
        }

        // 2. Direct submitted form endpoints if jobId was unknown or primary failed
        if (!loadedSubmission && submissionId != null && submissionId > 0) {
          const endpoints = [
            `jobs/submitted-forms/${submissionId}/`,
            `submitted-forms/${submissionId}/`,
            `job-forms/submissions/${submissionId}/`,
            `projects/submitted-forms/${submissionId}/`,
          ];
          for (const ep of endpoints) {
            try {
              const res = await api.get(ep);
              if (res?.data?.data) {
                loadedSubmission = normalizeSubmissionRow({
                  ...res.data.data,
                  id: res.data.data.id ?? submissionId,
                });
                break;
              }
            } catch {
              // try next
            }
          }
        }

        // 3. If not loaded directly, try loadJobFormSubmission by jobFormId / projectFormId
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

        if (loadedSubmission?.job_id && Number(loadedSubmission.job_id) > 0) {
          setPinApiJobId(Number(loadedSubmission.job_id));
        }

        if (cancelled) return;

        const resolvedProjectFormId =
          projectFormId ??
          loadedSubmission?.project_form_id ??
          loadedSubmission?.form_id ??
          null;

        let sectionsForRender: NormalizedFormSection[] = [];

        if (resolvedProjectFormId != null && resolvedProjectFormId > 0) {
          try {
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
          } catch (schemaErr) {
            console.warn("fetchJobFormSchema failed:", schemaErr);
          }
        }

        if (sectionsForRender.length === 0 && loadedSubmission) {
          if (loadedSubmission.form_name?.trim()) {
            setFormName(loadedSubmission.form_name.trim());
          }
          setRules([]);
          sectionsForRender = synthesizeFormSectionsFromSubmission({
            values: loadedSubmission.values,
            files: loadedSubmission.files,
          });
        }

        setRawSections(sectionsForRender);
        const maps = buildFieldMaps(sectionsForRender);
        setFieldMaps(maps);

        if (loadedSubmission) {
          setSubmission(loadedSubmission);
          setHasSubmission(true);
          setDefaultValues(
            mapSubmissionValuesToFormDefaults(
              loadedSubmission.values,
              sectionsForRender,
              maps.apiNameByFieldId,
              maps.fieldTypeByFieldId,
              loadedSubmission.files,
            ),
          );
        } else {
          setSubmission(null);
          setHasSubmission(false);
          setDefaultValues({});
        }
      } catch (err) {
        if (!cancelled) {
          setFormError(getApiErrorDisplayMessage(err, "Failed to load form"));
        }
      } finally {
        if (!cancelled) {
          setLoadingForm(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    context?.pin,
    projectFormId,
    jobFormId,
    submissionId,
    effectiveJobId,
    pinApiJobId,
  ]);

  const formRef = React.useRef<FormRendererRef>(null);

  // Form is strictly read-only on the location detail screen
  const isReadOnly = true;
  const displaySections = React.useMemo(
    () => applyReadOnlyToSections(rawSections, true),
    [rawSections],
  );

  const [downloadingPdf, setDownloadingPdf] = React.useState(false);

  const title =
    context?.pin != null
      ? `Location #${context.pin.location || context.pin.id}`
      : tPins("pageTitle");
  const productName =
    context?.pin?.item_detail?.name ||
    context?.pin?.group_detail?.name ||
    (context?.pin?.item != null ? `#${context.pin.item}` : null);
  const rendererKey = `${context?.pin?.id ?? "pin"}-view-${submission?.id ?? "new"}-${Object.keys(defaultValues).length}`;

  const pinQa = context?.pin?.quality_assurance ?? null;
  const tQa = useTranslations("Dashboard.jobs.qualityAssurance");
  const qaDecided = isQualityAssuranceDecided(pinQa);

  const isFormSubmitted = Boolean(
    (submissionId != null && submissionId > 0) ||
    hasSubmission ||
    (submission?.id != null && submission.id > 0) ||
    (submission?.submission_id != null && submission.submission_id > 0) ||
    (createdSubmissionId != null && createdSubmissionId > 0)
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

      const currentValues = {
        ...defaultValues,
        ...(formRef.current?.getFormData?.() ?? {}),
      };

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
        defaultValues: currentValues,
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

  // Derive previous/next pin navigation
  const currentIndex = React.useMemo(() => {
    if (!pinNavList.length || !pinId) return -1;
    return pinNavList.findIndex((item) => {
      if (item.pinId === pinId) return true;
      if (item.job_pin_id != null && item.job_pin_id === pinId) return true;
      return false;
    });
  }, [pinNavList, pinId]);

  const prevPin = currentIndex > 0 ? pinNavList[currentIndex - 1] : null;
  const nextPin = currentIndex >= 0 && currentIndex < pinNavList.length - 1 ? pinNavList[currentIndex + 1] : null;

  return (
    <div className="min-h-full">
      <DetailPageHeader
        title={loading ? <DetailPageHeaderTitleSkeleton /> : title}
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
                            router.push(buildLocationPreviewUrl(prevPin));
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
                                  router.push(buildLocationPreviewUrl(pinNavList[nextIdx]));
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
                            router.push(buildLocationPreviewUrl(nextPin));
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
                    {/* fieldset[disabled] enforces true read-only on ALL field types including subforms */}
                    <fieldset disabled className="border-0 p-0 m-0">
                      <FormRenderer
                        key={rendererKey}
                        ref={formRef}
                        schema={displaySections}
                        rules={rules}
                        defaultValues={defaultValues}
                        renderMode="desktop"
                      />
                    </fieldset>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {t("emptySchema")}
                </p>
              )}
            </div>

            {/* Right Column - Pin Details and Preview */}
            <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 min-w-0">
              <div className="sticky top-4">
                <LocationCard
                  context={context}
                  qaDecided={qaDecided}
                  pinQa={pinQa}
                  dateFmt={dateFmt}
                  formImages={formImages}
                  tPins={tPins}
                  tQa={tQa}
                  formName={formName || ""}
                  snapshotState={snapshotState}
                  onPreviewClick={() => setIsEditModalOpen(true)}
                />
              </div>
            </div>
          </div>
        )}
      </DetailPagePadding>

      {/* Pin Preview Modal - Allows viewing/editing pin details in drawing */}
      {context && isEditModalOpen && (
        <DrawingPinPreviewModal
          open={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          pin={context.pin}
          drawingId={context.drawingId}
          drawingName={context.drawingName}
          drawingFile={context.drawingFile}
          plots={context.plots}
          projectId={context.projectId ?? projectId ?? 1}
          onSaveSuccess={() => {
            setIsEditModalOpen(false);
            setReloadToken((n) => n + 1);
          }}
        />
      )}
    </div>
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
  drawingName?: string;
  plots: DrawingPlot[];
  pin: DrawingPin;
  snapshotState?: LevelSnapshotState;
  onClick: () => void;
}) {
  const isPdf = drawingFile.toLowerCase().endsWith(".pdf");

  return (
    <div
      onClick={onClick}
      className="relative aspect-video w-full overflow-hidden bg-slate-900/90 dark:bg-slate-950 cursor-pointer group select-none"
      title="Click to open full drawing preview"
    >
      {/* Visual background rendering */}
      {snapshotState?.status === "ready" && snapshotState.snapshot ? (
        <PinThumbnailCropped
          snapshotUrl={snapshotState.snapshot.objectUrl}
          snapshotWidth={snapshotState.snapshot.width}
          snapshotHeight={snapshotState.snapshot.height}
          xPercent={pin.x_coordinate}
          yPercent={pin.y_coordinate}
          marginFraction={0.18}
          pinColor={pin.status_detail?.bg_colour || "#10b981"}
          pinLabel={`#${pin.location || pin.id}`}
          className="absolute inset-0"
          alt={drawingName || "Pin location snapshot"}
        />
      ) : isPdf ? (
        <DrawingFilePreviewFill
          drawingFile={drawingFile}
          fileType="pdf"
          alt={drawingName || "Drawing"}
          className="size-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <img
          src={drawingFile}
          alt={drawingName || "Drawing"}
          className="size-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
        />
      )}

      {/* Overlay showing pin position on thumbnail */}
      {(!snapshotState || snapshotState.status !== "ready" || !snapshotState.snapshot?.objectUrl) && (
        <DrawingPinThumbnailOverlay
          plots={plots}
          activePinId={pin.id}
          className="absolute inset-0 size-full pointer-events-none"
        />
      )}

      {/* Blueprint Grid pattern decoration */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage:
            "linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }}
      />

      {/* Hover overlay hint */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900/90 px-3 py-1.5 rounded-lg shadow-lg border border-slate-700">
          <Maximize2 className="h-3.5 w-3.5" />
          Click to open full drawing
        </span>
      </div>

      {/* Level / Drawing Tag in top-left */}
      <div className="absolute top-2 left-2 z-10">
        <span className="inline-flex items-center gap-1 rounded-md bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-semibold text-slate-700 dark:text-slate-200 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
          <Map className="h-3 w-3 text-blue-500" />
          {drawingName || "Blueprint"}
        </span>
      </div>

      {/* Open Preview Button in top-right */}
      <div className="absolute top-2 right-2 z-10">
        <span className="inline-flex items-center gap-1 rounded-md bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-1.5 py-0.5 text-[10px] font-semibold text-blue-600 dark:text-blue-400 shadow-sm border border-blue-200/60 dark:border-blue-900/60">
          <Maximize2 className="h-3 w-3" />
          Preview
        </span>
      </div>
    </div>
  );
}

function LocationCard({
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

  const allAttachments = React.useMemo(() => {
    const list = [...(pin.attachments ?? [])];
    if (pin.item_detail?.attachments && Array.isArray(pin.item_detail.attachments)) {
      for (const itemAtt of pin.item_detail.attachments) {
        if (
          !list.some(
            (a) =>
              (a.id && itemAtt.id && a.id === itemAtt.id) ||
              (a.file_name && itemAtt.file_name && a.file_name === itemAtt.file_name),
          )
        ) {
          list.push(itemAtt as any);
        }
      }
    }
    return list;
  }, [pin.attachments, pin.item_detail]);

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

      {/* 2. Title Section: Location & Product Name */}
      <div className="px-3.5 py-2.5 sm:px-4 sm:py-3 border-b border-slate-100 dark:border-slate-800/80">
        <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate">
          Location #{locationText}
        </h2>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate mt-0.5">
          {productName}
        </p>
      </div>

      {/* 3. Details list */}
      <div className="p-3.5 sm:p-4 space-y-2.5 sm:space-y-3 overflow-y-auto min-h-0 flex-1">
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
            Details
          </h3>
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {/* 1. Product Name */}
            <DetailRowItem icon={Package} label="Product Name" value={productName} />

            {/* 2. Quantity */}
            <DetailRowItem icon={Hash} label="Quantity" value={pin.quantity ?? 1} />

            {/* 3. Status */}
            <DetailRowItem
              icon={Activity}
              label="Status"
              value={
                <div
                  className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-semibold"
                  style={{ backgroundColor: statusColor, color: statusTextColor }}
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {statusName}
                </div>
              }
            />

            {/* 4. Location */}
            <DetailRowItem icon={MapPin} label="Location" value={locationText} />

            {/* 5. Plot */}
            <DetailRowItem icon={LayoutGrid} label="Plot" value={plotName} />

            {/* 6. Level */}
            <DetailRowItem icon={Layers} label="Level" value={levelName} />

            {/* 7. Description */}
            <DetailRowItem icon={FileText} label="Description" value={pin.description || "-"} />

            {/* 8. Attachments */}
            {allAttachments.length > 0 ? (
              <div className="py-2 border-b border-slate-100 dark:border-slate-800/50">
                <div className="flex items-center gap-2 mb-1.5">
                  <Paperclip className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Attachments</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
                  {allAttachments.map((att: any, idx: number) => {
                    const url = att.file_url ?? att.url ?? (typeof att.file === "string" ? att.file : null);
                    const name = att.file_name ?? att.name ?? `Attachment #${att.id || idx + 1}`;
                    return (
                      <a
                        key={idx}
                        href={url || "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                      >
                        <span className="truncate" title={name}>{name}</span>
                        <Download className="h-3 w-3 text-slate-400 shrink-0" />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {/* 9. Form */}
            <DetailRowItem icon={FileCheck} label="Form" value={formLabel} />

            {/* 10. Variation */}
            <DetailRowItem
              icon={ToggleLeft}
              label="Variation"
              value={
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
              }
            />

            {/* 11. QA Remarks */}
            <DetailRowItem
              icon={MessageSquare}
              label="QA Remarks"
              value={pin.qa_remarks || pinQa?.remarks || "-"}
            />
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

export default LocationDetailScreen;
