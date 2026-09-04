"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import {
  fetchJobFormSchema,
  loadJobFormSubmission,
} from "@/features/job-forms/api/job-form.api";
import {
  applyReadOnlyToSections,
  buildFieldMaps,
  enrichSectionsWithSubmissionFiles,
} from "@/features/job-forms/utils/job-form-schema.util";
import { mapSubmissionValuesToFormDefaults } from "@/features/job-forms/utils/job-form-values.util";
import { fetchJob } from "@/features/jobs/api/job.api";
import {
  parseJobCategoryParam,
  resolveJobCategory,
  type JobCategoryApi,
} from "@/features/jobs/constants/job-category";
import { jobFormEntries } from "@/features/jobs/utils/job-nested-fields.util";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import { fetchDrawingDetail, fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import type { DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
import {
  resolvePinFormMeta,
  type PinFormMeta,
} from "@/features/projects/utils/pin-form-meta.util";
import { collectFormImagePreviews } from "@/features/projects/utils/pin-form-images.util";
import FormRenderer from "@/shared/form/formbuilder/FormRenderer";
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
import { QualityAssuranceDetailGrid } from "@/features/jobs/components/quality-assurance-status";
import { isQualityAssuranceDecided } from "@/features/jobs/types/quality-assurance.types";
import { isPinEligibleForQualityAssurance } from "@/features/jobs/utils/quality-assurance-eligibility.util";
import { routes } from "@/shared/config/routes";
import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { resolveFormBackUrl } from "@/shared/utils/quick-create-navigation.util";
import { buildProjectDetailTabHref } from "@/shared/utils/detail-from-list.util";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { SurfaceShell } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

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

type LevelLike = {
  id: number;
  name: string;
  drawing_file?: string;
  plots?: Array<DrawingPlot & { coordinates?: number[][] }>;
};

function findPinInLevels(
  levels: LevelLike[],
  pinId: number,
): Omit<PinContext, "formMeta" | "projectId"> | null {
  for (const level of levels) {
    const plots = (level.plots ?? []) as DrawingPlot[];
    for (const plot of plots) {
      const pin = (plot.pins ?? []).find((entry) => {
        if (entry.id === pinId) return true;
        const jobPinId = Number(entry.job_pin_id);
        return Number.isFinite(jobPinId) && jobPinId > 0 && jobPinId === pinId;
      });
      if (pin) {
        return {
          pin,
          plots: [plot],
          drawingFile: level.drawing_file ?? "",
          drawingName: level.name,
          drawingId: level.id,
        };
      }
    }
  }
  return null;
}

async function resolvePinFromProjectDrawings(
  projectId: number,
  pinId: number,
  drawingIdHint?: number | null,
): Promise<Omit<PinContext, "formMeta"> | null> {
  if (drawingIdHint != null && drawingIdHint > 0) {
    const drawing = await fetchDrawingDetail(projectId, drawingIdHint);
    const found = findPinInLevels(
      [
        {
          id: drawing.id,
          name: drawing.name,
          drawing_file: drawing.drawing_file,
          plots: drawing.plots,
        },
      ],
      pinId,
    );
    if (found) return { ...found, projectId };
  }

  const page = await fetchDrawingsPage(projectId, 1, 200);
  for (const drawing of page.items) {
    const detail =
      drawing.plots && drawing.plots.length > 0
        ? drawing
        : await fetchDrawingDetail(projectId, drawing.id);
    const found = findPinInLevels(
      [
        {
          id: detail.id,
          name: detail.name,
          drawing_file: detail.drawing_file,
          plots: detail.plots,
        },
      ],
      pinId,
    );
    if (found) return { ...found, projectId };
  }
  return null;
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
  const [schemaSections, setSchemaSections] = React.useState<
    ReturnType<typeof applyReadOnlyToSections>
  >([]);
  const [rules, setRules] = React.useState<FormRule[]>([]);
  const [defaultValues, setDefaultValues] = React.useState<Record<string, unknown>>({});
  const [hasSubmission, setHasSubmission] = React.useState(false);

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
        if (jobId != null && jobId > 0) {
          const job = await fetchJob(jobId, { silent: true });
          if (cancelled) return;
          setJobCategoryForNav(resolveJobCategory(job));
          const typed = job as unknown as {
            levels?: LevelLike[];
            level?: LevelLike | LevelLike[];
            project?: number | { id: number };
          };
          const rawLevels = typed.levels ?? typed.level;
          const levels = Array.isArray(rawLevels) ? rawLevels : rawLevels ? [rawLevels] : [];
          const formEntries = jobFormEntries(job);
          const resolvedProjectId =
            typeof typed.project === "number"
              ? typed.project
              : typed.project && typeof typed.project === "object"
                ? typed.project.id
                : undefined;

          let found: Omit<PinContext, "formMeta"> | null = (() => {
            const inJob = findPinInLevels(levels, pinId);
            return inJob ? { ...inJob, projectId: resolvedProjectId } : null;
          })();
          // Job payload may omit full pin geometry — fall back to project drawings API.
          if (!found && resolvedProjectId != null && resolvedProjectId > 0) {
            found = await resolvePinFromProjectDrawings(
              resolvedProjectId,
              pinId,
              drawingIdHint,
            );
          }

          if (!found) {
            setContext(null);
            setLoadError(tPins("loadError"));
            return;
          }
          setContext({
            ...found,
            projectId: resolvedProjectId ?? found.projectId,
            formMeta: resolvePinFormMeta(found.pin, { formEntries }),
          });
          return;
        }

        if (projectId != null && projectId > 0) {
          const found = await resolvePinFromProjectDrawings(projectId, pinId, drawingIdHint);
          if (!found) {
            setContext(null);
            setLoadError(tPins("loadError"));
            return;
          }
          setContext({
            ...found,
            formMeta: resolvePinFormMeta(found.pin),
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
  const projectFormId = formMeta?.projectFormId ?? null;
  const jobFormId = formMeta?.jobFormId ?? null;
  const submissionId = formMeta?.submissionId ?? null;
  const submittedHint = formMeta?.submitted ?? false;

  React.useEffect(() => {
    if (!context?.pin || projectFormId == null || projectFormId <= 0) {
      setSchemaSections([]);
      setRules([]);
      setDefaultValues({});
      setFormError(null);
      setHasSubmission(false);
      setLoadingForm(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoadingForm(true);
      setFormError(null);
      try {
        const schema = await fetchJobFormSchema(projectFormId);
        if (cancelled) return;

        setRules(normalizeRules((schema.rules ?? []) as FormRule[]));

        let nextDefaults: Record<string, unknown> = {};
        let nextHasSubmission = false;
        let sectionsForRender = schema.sections;

        if (jobId != null && jobId > 0 && jobFormId != null && jobFormId > 0) {
          const existing = await loadJobFormSubmission(
            jobId,
            jobFormId,
            projectFormId,
            submissionId ?? undefined,
          );
          if (cancelled) return;
          if (existing) {
            nextHasSubmission = true;
            sectionsForRender = enrichSectionsWithSubmissionFiles(
              schema.sections,
              existing.files,
            );
            const mapsForDefaults = buildFieldMaps(sectionsForRender);
            nextDefaults = mapSubmissionValuesToFormDefaults(
              existing.values,
              sectionsForRender,
              mapsForDefaults.apiNameByFieldId,
              mapsForDefaults.fieldTypeByFieldId,
              existing.files,
            );
          }
        }

        const readOnly = nextHasSubmission || submittedHint || jobId == null;
        setHasSubmission(nextHasSubmission);
        setDefaultValues(nextDefaults);
        setSchemaSections(applyReadOnlyToSections(sectionsForRender, readOnly));
      } catch (error) {
        if (!cancelled) {
          setFormError(getApiErrorDisplayMessage(error, t("loadError")));
          setSchemaSections([]);
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
    jobId,
    submissionId,
    submittedHint,
    t,
  ]);

  const title =
    context?.pin != null
      ? `Location #${context.pin.location || context.pin.id}`
      : tPins("pageTitle");
  const productName =
    context?.pin?.item_detail?.name ||
    context?.pin?.group_detail?.name ||
    (context?.pin?.item != null ? `#${context.pin.item}` : null);
  const rendererKey = `${context?.pin?.id ?? "pin"}-${hasSubmission ? "view" : "fill"}-${Object.keys(defaultValues).length}`;
  const qaPinId = context?.pin?.id ?? null;
  const pinQa = context?.pin?.quality_assurance ?? null;
  const tQa = useTranslations("Dashboard.jobs.qualityAssurance");
  const qaDecided = isQualityAssuranceDecided(pinQa);
  const showPinQualityAssurance =
    context?.pin != null && isPinEligibleForQualityAssurance(context.pin) && !qaDecided;
  const formImages = React.useMemo(
    () => collectFormImagePreviews(schemaSections, defaultValues),
    [schemaSections, defaultValues],
  );
  const columnMaxHeightClass = "lg:max-h-[calc(100dvh-11rem)]";

  return (
    <>
      <DetailPageHeader
        title={loading ? <DetailPageHeaderTitleSkeleton /> : title}
        titleLoading={loading}
        backHref={safeBack}
        backAriaLabel={tPins("backAria")}
        subtitle={productName ?? undefined}
        actions={
          jobId != null && qaPinId != null && showPinQualityAssurance ? (
            <JobQualityAssuranceControls
              jobId={jobId}
              pinIds={[qaPinId]}
              existing={pinQa}
              onSuccess={() => setReloadToken((n) => n + 1)}
            />
          ) : null
        }
      />
      <DetailPagePadding>
        {loading ? (
          <div className={cn(detailMapFormGridClassName)}>
            <div className="h-[28rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-[28rem] animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : loadError || !context ? (
          <SurfaceShell className="px-4 py-10 sm:px-6">
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
          <div className={cn(detailMapFormGridClassName, "lg:items-start")}>
            <DetailPanelCard
              title={tPins("assignedForm")}
              collapsible={false}
              className={cn("flex min-h-0 flex-col overflow-hidden", columnMaxHeightClass)}
              bodyClassName="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
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
                <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>
              ) : schemaSections.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-950">
                  <FormRenderer
                    key={rendererKey}
                    schema={schemaSections}
                    rules={rules}
                    defaultValues={defaultValues}
                    renderMode="desktop"
                  />
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  {t("emptySchema")}
                </p>
              )}
            </DetailPanelCard>

            <div
              className={cn(
                "min-w-0 lg:sticky lg:top-4 lg:self-start lg:overflow-y-auto",
                columnMaxHeightClass,
              )}
            >
              <DrawingPinPreviewModal
                open
                onClose={() => undefined}
                pin={context.pin}
                plots={context.plots}
                drawingFile={context.drawingFile}
                drawingName={context.drawingName}
                projectId={context.projectId}
                drawingId={context.drawingId}
                formSummary={
                  formMeta
                    ? {
                        label: formMeta.label,
                        projectFormId: formMeta.projectFormId,
                        submitted: hasSubmission || formMeta.submitted,
                      }
                    : null
                }
                embedded
                hideDrawing
                onSaveSuccess={() => {
                  setReloadToken((n) => n + 1);
                }}
                detailsFooter={
                  qaDecided || formImages.length > 0 ? (
                    <div className="space-y-6">
                      {qaDecided && pinQa ? (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {tQa("sectionTitle")}
                          </h3>
                          <QualityAssuranceDetailGrid record={pinQa} dateFmt={dateFmt} />
                        </div>
                      ) : null}
                      {formImages.length > 0 ? (
                        <div className="space-y-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            {tPins("formImages")}
                          </h3>
                          <div className="grid grid-cols-2 gap-3">
                            {formImages.map((image) => (
                              <a
                                key={image.url}
                                href={image.url}
                                target="_blank"
                                rel="noreferrer"
                                className="group overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50"
                                title={image.label}
                              >
                                <img
                                  src={image.url}
                                  alt={image.label}
                                  className="h-28 w-full object-cover transition group-hover:opacity-90"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null
                }
              />
            </div>
          </div>
        )}
      </DetailPagePadding>
    </>
  );
}
