import type { Job } from "@/features/jobs/types/job.types";
import type { DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
import { jobFormEntries } from "@/features/jobs/utils/job-nested-fields.util";
import { resolvePinFormMeta, resolvePinProjectFormId } from "@/features/projects/utils/pin-form-meta.util";
import { fetchDrawingsPage, fetchDrawingDetail } from "@/features/projects/api/drawing.api";
import { routes } from "@/shared/config/routes";

type JobDrawingPlot = Omit<DrawingPlot, "coordinates"> & {
  coordinates?: number[][];
  pins?: DrawingPin[];
};

type JobDrawingLevel = {
  id: number;
  name: string;
  drawing_file?: string;
  drawing_file_type?: string;
  plots?: JobDrawingPlot[];
};

export type TrimmedPinNavigationItem = {
  pinId: number;
  projectId: number;
  drawingId: number;
  jobId: number;
  formId: number;
  job_form_id: number;
  name: string;
  job_pin_id: number;
  back: string;
  submission_id?: number | null;
};

export function getPinNavigationSessionKey(jobId: number | string): string {
  return `pins_job_${jobId}`;
}

export function savePinsToSessionStorage(
  jobId: number | string,
  pins: TrimmedPinNavigationItem[],
): void {
  if (typeof window === "undefined" || !window.sessionStorage) return;
  try {
    window.sessionStorage.setItem(getPinNavigationSessionKey(jobId), JSON.stringify(pins));
  } catch (err) {
    console.warn("Failed to save pins to sessionStorage", err);
  }
}

export function loadPinsFromSessionStorage(jobId: number | string): TrimmedPinNavigationItem[] {
  if (typeof window === "undefined" || !window.sessionStorage) return [];
  try {
    const raw = window.sessionStorage.getItem(getPinNavigationSessionKey(jobId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Failed to load pins from sessionStorage", err);
    return [];
  }
}

export function buildPinPreviewUrl(item: TrimmedPinNavigationItem): string {
  const params = new URLSearchParams();
  params.set("back", item.back);
  params.set("drawingId", String(item.drawingId));
  params.set("jobId", String(item.jobId));
  params.set("formId", String(item.formId));
  params.set("job_form_id", String(item.job_form_id));
  params.set("name", item.name);
  params.set("job_pin_id", String(item.job_pin_id));
  if (item.submission_id != null && item.submission_id > 0) {
    params.set("submission_id", String(item.submission_id));
  }

  const basePath =
    item.projectId > 0
      ? `/projects/${item.projectId}/pins/${item.pinId}`
      : `/jobs/${item.jobId}/pins/${item.pinId}`;

  return `${basePath}?${params.toString()}`;
}

export function extractTrimmedPinsFromJob(
  job: Job,
  options?: {
    formEntries?: Array<{
      id: number;
      project_form_id?: number | null;
      name?: string | null;
    }>;
  },
): TrimmedPinNavigationItem[] {
  const typedJob = job as unknown as {
    levels?: JobDrawingLevel[];
    level?: JobDrawingLevel | JobDrawingLevel[];
    project?: number | { id: number };
  };
  const rawLevels = typedJob.levels ?? typedJob.level;
  const levels = Array.isArray(rawLevels) ? rawLevels : rawLevels ? [rawLevels] : [];

  const projectId =
    typeof typedJob.project === "number" && typedJob.project > 0
      ? typedJob.project
      : typedJob.project &&
          typeof typedJob.project === "object" &&
          typeof (typedJob.project as { id: number }).id === "number"
        ? (typedJob.project as { id: number }).id
        : 0;

  const jobId = job.id;
  const back = `${routes.dashboard.jobs}/${jobId}`;
  const formEntries = options?.formEntries ?? jobFormEntries(job);

  const result: TrimmedPinNavigationItem[] = [];

  for (const level of levels) {
    const drawingId = level.id;
    const plots = (level.plots ?? []) as JobDrawingPlot[];
    for (const plot of plots) {
      const pins = (plot.pins ?? []) as DrawingPin[];
      for (const pin of pins) {
        if (!pin || pin.id == null) continue;
        const meta = resolvePinFormMeta(pin, { formEntries });
        const formId = meta?.projectFormId ?? resolvePinProjectFormId(pin) ?? 0;
        const jobFormId = meta?.jobFormId ?? formId;
        const name = meta?.label ?? "";
        const jobPinId = Number(pin.job_pin_id ?? pin.id);
        const effectiveSubmissionId =
          meta?.submissionId != null && meta.submissionId > 0 ? meta.submissionId : undefined;

        result.push({
          pinId: pin.id,
          projectId,
          drawingId,
          jobId,
          formId,
          job_form_id: jobFormId,
          name,
          job_pin_id: Number.isFinite(jobPinId) && jobPinId > 0 ? jobPinId : pin.id,
          back,
          ...(effectiveSubmissionId ? { submission_id: effectiveSubmissionId } : {}),
        });
      }
    }
  }

  return result;
}

export async function fetchAndBuildJobTrimmedPins(
  job: Job,
): Promise<TrimmedPinNavigationItem[]> {
  const fromJob = extractTrimmedPinsFromJob(job);
  if (fromJob.length > 0) {
    return fromJob;
  }

  const projectId =
    typeof job.project === "number" && job.project > 0
      ? job.project
      : job.project &&
          typeof job.project === "object" &&
          typeof (job.project as { id: number }).id === "number"
        ? (job.project as { id: number }).id
        : 0;

  if (projectId > 0) {
    try {
      const page = await fetchDrawingsPage(projectId, 1, 200);
      const formEntries = jobFormEntries(job);
      const back = `${routes.dashboard.jobs}/${job.id}`;
      const result: TrimmedPinNavigationItem[] = [];

      for (const item of page.items) {
        const drawing =
          item.plots && item.plots.length > 0
            ? item
            : await fetchDrawingDetail(projectId, item.id);

        for (const plot of drawing.plots ?? []) {
          for (const pin of plot.pins ?? []) {
            if (!pin || pin.id == null) continue;
            const meta = resolvePinFormMeta(pin, { formEntries });
            const formId = meta?.projectFormId ?? resolvePinProjectFormId(pin) ?? 0;
            const jobFormId = meta?.jobFormId ?? formId;
            const name = meta?.label ?? "";
            const jobPinId = Number(pin.job_pin_id ?? pin.id);
            const effectiveSubmissionId =
              meta?.submissionId != null && meta.submissionId > 0 ? meta.submissionId : undefined;

            result.push({
              pinId: pin.id,
              projectId,
              drawingId: drawing.id,
              jobId: job.id,
              formId,
              job_form_id: jobFormId,
              name,
              job_pin_id: Number.isFinite(jobPinId) && jobPinId > 0 ? jobPinId : pin.id,
              back,
              ...(effectiveSubmissionId ? { submission_id: effectiveSubmissionId } : {}),
            });
          }
        }
      }
      return result;
    } catch {
      return fromJob;
    }
  }

  return fromJob;
}
