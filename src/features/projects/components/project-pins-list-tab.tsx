"use client";

import {
  AppButton,
  CheckmarkSelect,
  ListPageEmptyStates,
  ListPageSearchField,
  MultiCheckSelect,
  surfaceInputClassName,
} from "@/shared/ui";
import { useLocale, useTranslations } from "next-intl";
import { createJobFromLocation, fetchProject } from "@/features/projects/api/project.api";
import { fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import type {
  Drawing,
  DrawingPin,
  DrawingPlot,
} from "@/features/projects/types/drawing.types";
import type {
  ProjectPagination,
  ProjectSiteRef,
} from "@/features/projects/types/project.types";
import { getProjectTypeId } from "@/features/projects/utils/project-type-id.util";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Layers, MapPinned } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import { useForm } from "react-hook-form";
import { DrawingPinPreviewModal } from "./drawing-pin-preview-modal";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { DrawingFilePreviewFill } from "@/features/projects/components/drawing-file-preview";
import { DrawingPinThumbnailOverlay } from "@/features/projects/components/drawing-pin-thumbnail-overlay";
import { DrawingFilePreview } from "@/features/projects/components/drawing-file-preview";
import { fetchChecklistTypesPage } from "@/features/checklist-types/api/checklist-type.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { useLevelSnapshots, type LevelSnapshotState } from "@/shared/hooks/use-level-snapshots.hook";
import { PinThumbnailCropped } from "@/shared/components/pin-thumbnail-cropped";



const PIN_TABLE_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-[minmax(0,1.4rem)_minmax(0,5rem)_minmax(0,1fr)_minmax(0,6rem)_minmax(0,0.5fr)_minmax(0,0.4fr)_minmax(0,0.4fr)_minmax(0,0.45fr)] items-center gap-x-3";
const PIN_TABLE_HEADER_CLASS = cn(
  PIN_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

const PIN_TABLE_ROW_CLASS = cn(
  PIN_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
);

const getSelectionState = (
  ids: number[],
  selectedIds: Set<number>,
): "none" | "partial" | "all" => {
  if (ids.length === 0) return "none";
  let count = 0;
  for (const id of ids) {
    if (selectedIds.has(id)) count++;
  }
  if (count === 0) return "none";
  if (count === ids.length) return "all";
  return "partial";
};

const toggleSelection = (
  ids: number[],
  selectedIds: Set<number>,
): Set<number> => {
  const next = new Set(selectedIds);
  const state = getSelectionState(ids, selectedIds);
  if (state === "all") {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  return next;
};

function GroupCheckbox({
  ids,
  selectedIds,
  onToggle,
}: {
  ids: number[];
  selectedIds: Set<number>;
  onToggle: (ids: number[]) => void;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const state = getSelectionState(ids, selectedIds);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = state === "partial";
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer accent-(--dash-accent,#f97316)",
      )}
      checked={state === "all"}
      disabled={ids.length === 0}
      onChange={() => onToggle(ids)}
    />
  );
}

function PinStatusChip({ pin }: { pin: DrawingPin }) {
  const sd = pin.status_detail;
  if (!sd) return <span className="text-xs text-slate-500">—</span>;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold animate-fade-in"
      style={{
        backgroundColor: sd.bg_colour || "#e2e8f0",
        color: sd.text_colour || "#475569",
      }}
    >
      {sd.status_name}
    </span>
  );
}

function ProjectPinTableHeader() {
  const locale = useLocale();
  const isEs = locale === "es";
  return (
    <div className={cn("min-w-0", PIN_TABLE_HEADER_CLASS)}>
      <span aria-hidden />
      <span className="min-w-0 truncate">Pin ID</span>
      <span className="min-w-0 truncate">Product</span>
      <span className="min-w-0 truncate">Preview</span>
      <span className="min-w-0 truncate">
        {isEs ? "Variación" : "Variation"}
      </span>
      <span className="min-w-0 truncate">Quantity</span>
      <span className="min-w-0 truncate">Is a Job</span>
      <span className="min-w-0 truncate">Status</span>
    </div>
  );
}

function ProjectPinRow({
  pin,
  selected,
  disabled,
  onToggle,
  onPreview,
  drawingFile,
  drawingFileType, // ← add this
  snapshotState,
  plots,
  drawingName,
}: {
  pin: DrawingPin;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  drawingFile?: string;
  drawingFileType?: string; // ← add this
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  plots: DrawingPlot[];
}) {
  const locale = useLocale();
  const isEs = locale === "es";
  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const sku = pin.item_detail?.sku;
  const variationText = pin.variation
    ? isEs
      ? "Sí"
      : "Yes"
    : isEs
      ? "No"
      : "No";

  return (
    <div
      className={cn(
        "min-w-0",
        PIN_TABLE_ROW_CLASS,
        disabled
          ? "bg-slate-50/60 dark:bg-slate-950/40"
          : "hover:bg-slate-50/90 dark:hover:bg-slate-800/30",
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded-[3px] border-slate-300 dark:border-slate-600 dark:bg-slate-900",
          disabled
            ? "cursor-not-allowed opacity-40"
            : "cursor-pointer accent-(--dash-accent,#f97316)",
        )}
        checked={selected}
        onChange={onToggle}
      />

      <span className="min-w-0 font-semibold text-slate-500">#{pin.id}</span>

      <div className="flex flex-col min-w-0">
        <span className="min-w-0 font-medium text-slate-900 dark:text-slate-100 truncate">
          {productName}
        </span>
        {sku && (
          <span className="min-w-0 text-xs text-slate-400 truncate">{sku}</span>
        )}
      </div>

      {/* Preview now sits right here, right after Product */}
      <div className="flex items-center justify-start">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title={
            drawingName ? `Preview on ${drawingName}` : "Preview on Drawing"
          }
          aria-label={`Preview pin #${pin.id} on drawing`}
          className="relative h-9 w-16 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900"
        >
          {snapshotState?.status === "ready" && snapshotState.snapshot ? (
            <PinThumbnailCropped
              snapshotUrl={snapshotState.snapshot.objectUrl}
              snapshotWidth={snapshotState.snapshot.width}
              snapshotHeight={snapshotState.snapshot.height}
              xPercent={pin.x_coordinate}
              yPercent={pin.y_coordinate}
              pinColor={pin.status_detail?.bg_colour || "#10b981"}
              className="absolute inset-0"
              alt=""
            />
          ) : snapshotState?.status === "loading" ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-full animate-pulse bg-slate-100 dark:bg-slate-800" />
            </div>
          ) : drawingFile && plots.length > 0 ? (
            <span className="absolute inset-0">
              <div
                className="absolute inset-0"
                style={{
                  transformOrigin: `${pin.x_coordinate}% ${pin.y_coordinate}%`,
                  transform: `translate(${50 - pin.x_coordinate}%, ${50 - pin.y_coordinate}%) scale(3)`,
                }}
              >
                <DrawingFilePreviewFill
                  drawingFile={drawingFile}
                  fileType={drawingFileType}
                  alt=""
                  className="size-full"
                />
                <DrawingPinThumbnailOverlay
                  plots={plots}
                  activePinId={pin.id}
                />
              </div>
            </span>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-500">
              Preview
            </span>
          )}
          <span className="sr-only">Preview</span>
        </button>
      </div>

      <span className="min-w-0 text-xs text-slate-500 dark:text-slate-400 truncate">
        {variationText}
      </span>

      <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">
        {pin.quantity ?? 1}
      </span>

      <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">
        {pin.is_converted_job ? "Yes" : "No"}
      </span>

      <div>
        <PinStatusChip pin={pin} />
      </div>
    </div>
  );
}

function PlotPinsBlock({
  plot,
  plotName,
  pins,
  selectedIds,
  onTogglePlot,
  onTogglePin,
  onPreviewPin,
  drawingFile,
  drawingFileType, // ← add
  snapshotState,
  drawingName,
}: {
  plot: DrawingPlot;
  plotName: string;
  pins: DrawingPin[];
  selectedIds: Set<number>;
  onTogglePlot: (ids: number[]) => void;
  onTogglePin: (id: number) => void;
  onPreviewPin: (pin: DrawingPin) => void;
  drawingFile?: string;
  drawingFileType?: string; // ← add
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
}) {
  const selectablePinIds = useMemo(
    () => pins.filter((p) => !p.is_converted_job).map((p) => p.id),
    [pins],
  );

  return (
    <div className="min-w-0 w-full rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      {/* header unchanged */}
      <div className="min-w-0 w-full">
        {pins.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50/30 dark:bg-transparent">
            No pins in this plot.
          </p>
        ) : (
          <>
            <ProjectPinTableHeader />
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pins.map((pin) => (
                <ProjectPinRow
                  key={pin.id}
                  pin={pin}
                  selected={selectedIds.has(pin.id)}
                  disabled={pin.is_converted_job === true}
                  drawingFile={drawingFile}
                  drawingFileType={drawingFileType} // ← add
                  snapshotState={snapshotState}
                  drawingName={drawingName}
                  plots={[plot]}
                  onToggle={() => onTogglePin(pin.id)}
                  onPreview={() => onPreviewPin(pin)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
const ProjectPinsListTab = ({
  sites,
}: {
  sites?: Array<number | ProjectSiteRef> | null;
}) => {
  


  const siteOptions = useMemo(() => {
    if (!sites || sites.length === 0) return [] as { value: string; label: string }[];
    return sites
      .map((site) => {
        if (typeof site === "number") return { value: String(site), label: `#${site}` };
        return { value: String(site.id), label: site.site_name?.trim() || `#${site.id}` };
      })
      .filter((option) => option.value);
  }, [sites]);

  const { id } = useParams<{ id: string }>();

  const [search, setSearch] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<number | undefined>();
  const [plotFilter, setPlotFilter] = useState<number | undefined>();
  const [locations, setLocations] = useState<Drawing[]>([]);
  const levelSnapshots = useLevelSnapshots(locations);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [pagination, setPagination] = useState<ProjectPagination>({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: pageSize,
    next: null,
    previous: null,
  });
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [checkListData, setCheckListData] = useState<
    { id: number | string; label: string }[]
  >([]);
  const [checkListLoading, setCheckListLoading] = useState(false);
  const [previewPinData, setPreviewPinData] = useState<{
    pin: DrawingPin;
    plots: DrawingPlot[];
    drawingFile: string;
    drawingName: string;
  } | null>(null);
  const [dialogSiteId, setDialogSiteId] = useState<number | undefined>(
    undefined,
  );
const [dialogChecklistIds, setDialogChecklistIds] = useState<number[]>([]);
  const [checklistSearch, setChecklistSearch] = useState<string>("");
  const [projectTypeId, setProjectTypeId] = useState<number | null>(null);
  const [dialogAssignedWorkerId, setDialogAssignedWorkerId] = useState<
    number | undefined
  >(undefined);
  const [workerOptions, setWorkerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogJobStatusId, setDialogJobStatusId] = useState<number | undefined>(undefined);
  const [jobStatusOptions, setJobStatusOptions] = useState<{ value: string; label: string }[]>([]);
  const [loadingJobStatuses, setLoadingJobStatuses] = useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  const t = useTranslations("Dashboard.projects.location");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    setLoadingWorkers(true);
    loadTechnicianOptions()
      .then((options) => {
        if (!cancelled) setWorkerOptions(options);
      })
      .catch(() => {
        if (!cancelled) setWorkerOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingWorkers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoadingJobStatuses(true);
    fetchJobStatusesPage(1, 500)
      .then((res) => {
        if (!cancelled)
          setJobStatusOptions(
            res.items.map((s: WorkflowColourStatus) => ({
              value: String(s.id),
              label: s.status_name,
            }))
          );
      })
      .catch(() => {
        if (!cancelled) setJobStatusOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingJobStatuses(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadLocationsPage(): Promise<void> {
      if (!id) return;

      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setLoadError(null);

      try {
        const { items, pagination: p } = await fetchDrawingsPage(
          Number(id),
          page,
          pageSize,
          search || undefined,
        );
        if (cancelled) return;
        setLocations((prev) => (page === 1 ? items : [...prev, ...items]));
        setPagination(p);
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setLoadError(
          typeof e === "object" && e && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to load locations",
        );
        if (page === 1) setLocations([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    loadLocationsPage();
    return () => {
      cancelled = true;
    };
  }, [id, page, pageSize, search]);

  useEffect(() => {
    if (!id || !/^\d+$/.test(id)) {
      setProjectTypeId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const project = await fetchProject(Number.parseInt(id, 10));
        if (!cancelled) {
          setProjectTypeId(getProjectTypeId(project));
        }
      } catch {
        if (!cancelled) setProjectTypeId(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);
 const fetchCheckListData = useCallback(
  async (searchTerm?: string): Promise<void> => {
    if (!projectTypeId) {
      setCheckListData([]);
      return;
    }

    try {
      setCheckListLoading(true);
      const response = await fetchChecklistTypesPage(1, 100, {
        is_active: true,
        project_type: projectTypeId,
        search: searchTerm || undefined,
      });
      setCheckListData(
        response.items.map((item) => ({
          id: item.id,
          label: item.title ?? `Checklist #${item.id}`,
        })),
      );
      setCheckListLoading(false);
    } catch (e) {
      console.error("Failed to fetch checklist types:", e);
      setCheckListLoading(false);
    }
  },
  [projectTypeId],
);

  const commitSearch = useCallback(
    (value: string) => {
      setSearch(value);
      setPage(1);
      setLocations([]);
      setPagination({
        total_records: 0,
        total_pages: 1,
        current_page: 1,
        page_size: pageSize,
        next: null,
        previous: null,
      });
    },
    [pageSize],
  );

useEffect(() => {
  if (!dialogVisible) return;
  const timeout = window.setTimeout(() => {
    void fetchCheckListData(checklistSearch);
  }, 300);
  return () => window.clearTimeout(timeout);
}, [dialogVisible, checklistSearch, fetchCheckListData]);


  useEffect(() => {
    if (
      loading ||
      loadingMore ||
      !pagination.next ||
      page >= pagination.total_pages
    )
      return;

    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((currentPage) =>
            Math.min(currentPage + 1, pagination.total_pages),
          );
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [loading, loadingMore, pagination.next, pagination.total_pages, page]);


 const checklistOptions = useMemo(
  () =>
    checkListData.map((item) => ({
      value: String(item.id),
      label: item.label,
    })),
  [checkListData],
);
  const {
    handleSubmit,
    reset,
    register,
    setValue,
    formState: { errors },
  } = useForm<{
    start_date: string;
    site: string;
  }>({ defaultValues: { start_date: "", site: "" } });

  const filteredLocations = useMemo(() => {
    const searchActive = search.trim() !== "";
    return locations
      .filter((level) => levelFilter == null || level.id === levelFilter)
      .map((level) => {
        const plots = (level.plots ?? [])
          .filter((plot) => plotFilter == null || plot.id === plotFilter)
          .map((plot) => {
            const pins = (plot.pins ?? []).filter((pin) => {
              const q = search.trim().toLowerCase();
              if (!q) return true;
              const pinId = String(pin.id);
              const productName = (
                pin.item_detail?.name ||
                pin.group_detail?.name ||
                ""
              ).toLowerCase();
              const sku = (pin.item_detail?.sku || "").toLowerCase();
              const description = (pin.description || "").toLowerCase();
              return (
                pinId.includes(q) ||
                productName.includes(q) ||
                sku.includes(q) ||
                description.includes(q)
              );
            });
            return { ...plot, pins };
          });

        const finalPlots = searchActive
          ? plots.filter((p) => p.pins.length > 0)
          : plots;
        return { ...level, plots: finalPlots };
      })
      .filter((level) => (searchActive ? level.plots.length > 0 : true));
  }, [locations, search, levelFilter, plotFilter]);

  const levelOptions = useMemo(
    () =>
      locations.map((level) => ({
        value: String(level.id),
        label: level.name,
      })),
    [locations],
  );

  const plotOptions = useMemo(() => {
    const source =
      levelFilter != null
        ? locations.filter((l) => l.id === levelFilter)
        : locations;
    const seen = new Set<number>();
    const options: { value: string; label: string }[] = [];
    for (const level of source) {
      for (const plot of level.plots ?? []) {
        if (seen.has(plot.id)) continue;
        seen.add(plot.id);
        options.push({ value: String(plot.id), label: plot.name });
      }
    }
    return options;
  }, [locations, levelFilter]);

  const selectablePinIds = useMemo(() => {
    return filteredLocations.flatMap((level) =>
      level.plots.flatMap((plot) =>
        plot.pins.filter((pin) => !pin.is_converted_job).map((pin) => pin.id),
      ),
    );
  }, [filteredLocations]);

  const effectiveSelectedIds = useMemo(() => {
    const next = new Set<number>();
    for (const pinId of selectedIds) {
      if (selectablePinIds.includes(pinId)) next.add(pinId);
    }
    return next;
  }, [selectedIds, selectablePinIds]);

  const allSelected =
    selectablePinIds.length > 0 &&
    selectablePinIds.every((pinId) => effectiveSelectedIds.has(pinId));

  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const pinId of selectablePinIds) next.delete(pinId);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const pinId of selectablePinIds) next.add(pinId);
        return next;
      });
    }
  }, [selectablePinIds, allSelected]);

  const handleToggleGroup = useCallback((ids: number[]) => {
    setSelectedIds((prev) => toggleSelection(ids, prev));
  }, []);

  const handleTogglePin = useCallback((pinId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      return next;
    });
  }, []);

  const hasMorePages =
    pagination.next !== null && page < pagination.total_pages;

  const emptyStateKind: ListEmptyStateKind = useMemo(() => {
    if (loading || loadError) return "none";
    if (locations.length === 0) return "onboarding";
    if (filteredLocations.length === 0) return "filtered";
    return "none";
  }, [loading, loadError, locations.length, filteredLocations.length]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setLevelFilter(undefined);
    setPlotFilter(undefined);
  }, []);

  const handleCreateJob = async (formData: {
    start_date: string;
  }): Promise<void> => {
    setIsSubmitting(true);
    try {
      const res = await createJobFromLocation({
        project: Number(id),
        pin_ids: Array.from(effectiveSelectedIds),
        site: dialogSiteId,
        start_date: formData.start_date,
        assigned_worker: dialogAssignedWorkerId,
        checklists: dialogChecklistIds,
        job_status: dialogJobStatusId,
      });
      setDialogVisible(false);
      reset();
      setDialogSiteId(undefined);
      setDialogAssignedWorkerId(undefined);
      setDialogChecklistIds([]);
      setDialogJobStatusId(undefined);
      router.push(`${routes.dashboard.jobs}/${res.id}`);
    } catch (e) {
      console.log("error in here", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
      {dialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-99">
          <div className="bg-white p-6 rounded-lg">
            <h2 className="text-lg font-semibold">Create Job</h2>
            <p className="mt-2">
              Are you sure you want to create a job for the selected pins?
            </p>

            <div className="mt-2">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                {t("Start")} <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register("start_date", {
                  required: t("requiredJob"),
                })}
                placeholder={t("createJobPlaceHolder")}
                className={cn(
                  surfaceInputClassName,
                  errors.start_date
                    ? "border-red-300 ring ring-red-500"
                    : "border-slate-300",
                  "w-full p-2 rounded-md",
                )}
              />
              {errors.start_date && (
                <p className="text-red-500">{errors.start_date.message}</p>
              )}
            </div>

            <div className="mt-4">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                {t("site")} <span className="text-red-500">*</span>
              </label>
              <CheckmarkSelect
                listLabel={t("site")}
                buttonAriaLabel={t("site")}
                options={siteOptions}
                value={dialogSiteId != null ? String(dialogSiteId) : ""}
                emptyLabel={t("selectSite")}
                portaled
                searchable
                clearable
                className={cn(
                  "w-full",
                  errors.site && "ring ring-red-500 rounded-lg",
                )}
                onChange={(value) => {
                  setDialogSiteId(
                    value ? Number.parseInt(value, 10) : undefined,
                  );
                  setValue("site", value ?? "", { shouldValidate: true });
                }}
              />
              <input
                type="hidden"
                {...register("site", {
                  required: t("requiredSite") || "Site is required",
                })}
              />
              {errors.site && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.site.message}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                {t("assignedWorker")}
              </label>
              <CheckmarkSelect
                listLabel={t("assignedWorker")}
                buttonAriaLabel={t("assignedWorker")}
                options={workerOptions}
                value={
                  dialogAssignedWorkerId != null
                    ? String(dialogAssignedWorkerId)
                    : ""
                }
                emptyLabel={t("selectWorker") || "Select Worker"}
                portaled
                searchable
                clearable
                className="w-full"
                disabled={loadingWorkers || workerOptions.length === 0}
                onChange={(value) =>
                  setDialogAssignedWorkerId(
                    value ? Number.parseInt(value, 10) : undefined,
                  )
                }
              />
            </div>

            <div className="mt-4">
  <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
    {t("checkList")}
  </label>
  <MultiCheckSelect
    id="checklist-select"
    options={checklistOptions}
    values={dialogChecklistIds.map(String)}
    onChange={(values: string[]) =>
      setDialogChecklistIds(values.map((v) => Number.parseInt(v, 10)))
    }
    placeholder={t("selectChecklist") || "Select Checklist"}
    listLabel={t("checkList")}
    disabled={checkListLoading}
    className="w-full"
  />
</div>

            <div className="mt-4">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                Job Status
              </label>
              <CheckmarkSelect
                listLabel="Job Status"
                buttonAriaLabel="Job Status"
                options={jobStatusOptions}
                value={dialogJobStatusId != null ? String(dialogJobStatusId) : ""}
                emptyLabel="Select Job Status"
                portaled
                searchable
                clearable
                className="w-full"
                disabled={loadingJobStatuses || jobStatusOptions.length === 0}
                onChange={(value) =>
                  setDialogJobStatusId(value ? Number.parseInt(value, 10) : undefined)
                }
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <AppButton
                onClick={() => {
                  reset();
                  setDialogSiteId(undefined);
                  setDialogAssignedWorkerId(undefined);
                  setDialogVisible(false);
                  setDialogChecklistIds([]);
                  setDialogJobStatusId(undefined);
                }}
                size="lg"
                variant="secondary"
              >
                Cancel
              </AppButton>
              <AppButton
                onClick={handleSubmit(handleCreateJob)}
                size="lg"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
              >
                {t("createJob")}
              </AppButton>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("title")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:px-6">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchAria")}
          className="sm:max-w-sm"
        />

        <CheckmarkSelect
          listLabel={t("filterLevel")}
          buttonAriaLabel={t("filterLevel")}
          options={levelOptions}
          value={levelFilter != null ? String(levelFilter) : ""}
          emptyLabel={t("filterAllLevels")}
          portaled
          searchable
          clearable
          className="w-full min-w-0 sm:w-44"
          onChange={(v) => {
            setLevelFilter(v ? Number.parseInt(v, 10) : undefined);
            setPlotFilter(undefined);
          }}
        />

        <CheckmarkSelect
          listLabel={t("filterPlot")}
          buttonAriaLabel={t("filterPlot")}
          options={plotOptions}
          value={plotFilter != null ? String(plotFilter) : ""}
          emptyLabel={t("filterAllPlots")}
          portaled
          searchable
          clearable
          disabled={plotOptions.length === 0}
          className="w-full min-w-0 sm:w-44"
          onChange={(v) =>
            setPlotFilter(v ? Number.parseInt(v, 10) : undefined)
          }
        />

        {effectiveSelectedIds.size > 0 && (
          <AppButton
            variant="primary"
            size="lg"
            onClick={() => setDialogVisible(true)}
          >
            Create Job
          </AppButton>
        )}

        {selectablePinIds.length > 0 && (
          <AppButton
            variant="primary"
            size="lg"
            onClick={handleSelectAllToggle}
          >
            <span>{allSelected ? "Deselect All" : "Select All"}</span>
          </AppButton>
        )}
      </div>

      <div>
        {loadError && locations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">
            {loadError}
          </p>
        ) : loading && locations.length === 0 ? (
          <div className="space-y-4 p-4 sm:p-6">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-6 w-40 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                <div className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              </div>
            ))}
          </div>
        ) : emptyStateKind !== "none" ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "pinStatus",
              title: "No locations ayet",
              description:
                "No locations or blueprints have been added to this project yet.",
              action: null,
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-6">
            {loadError && locations.length > 0 && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {loadError}
              </p>
            )}

            {filteredLocations.map((level) => {
              const levelPinIds = level.plots.flatMap((p) =>
                p.pins.map((pin) => pin.id),
              );

              return (
                <section key={level.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GroupCheckbox
                      ids={levelPinIds.filter((id) => {
                        const plot = level.plots
                          .flatMap((p) => p.pins)
                          .find((pin) => pin.id === id);
                        return plot ? !plot.is_converted_job : true;
                      })}
                      selectedIds={selectedIds}
                      onToggle={handleToggleGroup}
                    />
                    <span
                      className="h-4 w-1 rounded-full bg-(--dash-accent,#f97316)"
                      aria-hidden
                    />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                      {level.name}
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {level.plots.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 pl-9">
                        No plots in this level.
                      </p>
                    ) : (
                      level.plots.map((plot) => (
                        <PlotPinsBlock
                          key={`${level.id}-${plot.id}`}
                          plot={plot}
                          plotName={plot.name}
                          pins={plot.pins}
                          selectedIds={selectedIds}
                          drawingFile={level.drawing_file}
                          drawingFileType={level.drawing_file_type} // ← add
                          snapshotState={levelSnapshots.get(level.id)}
                          drawingName={level.name}
                          onTogglePlot={handleToggleGroup}
                          onTogglePin={handleTogglePin}
                          onPreviewPin={(pin) => {
                            setPreviewPinData({
                              pin,
                              plots: [plot],
                              drawingFile: level.drawing_file,
                              drawingName: level.name,
                            });
                          }}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}

            {loadingMore && (
              <div className="flex items-center justify-center py-4">
                <span className="text-sm text-slate-500 animate-pulse">
                  Loading more locations…
                </span>
              </div>
            )}

            {hasMorePages && (
              <div ref={sentinelRef} className="h-6" aria-hidden="true" />
            )}
          </div>
        )}
      </div>

      {previewPinData && (
        <DrawingPinPreviewModal
          open={previewPinData !== null}
          onClose={() => setPreviewPinData(null)}
          pin={previewPinData.pin}
          plots={previewPinData.plots}
          drawingFile={previewPinData.drawingFile}
          drawingName={previewPinData.drawingName}
        />
      )}
    </div>
  );
};

export default ProjectPinsListTab;
