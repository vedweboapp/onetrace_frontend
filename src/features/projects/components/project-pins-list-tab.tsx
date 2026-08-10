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
import {
  createJobFromLocation,
  fetchProject,
  fetchProjectFormsPage,
  massUpdatePins,
} from "@/features/projects/api/project.api";
import { fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
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
import { ChevronRight, Layers, MapPinned } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import { Controller, useForm } from "react-hook-form";
import { DrawingPinPreviewModal } from "./drawing-pin-preview-modal";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { buildProjectDetailTabHref } from "@/shared/utils/detail-from-list.util";
import { DrawingFilePreviewFill } from "@/features/projects/components/drawing-file-preview";
import { DrawingPinThumbnailOverlay } from "@/features/projects/components/drawing-pin-thumbnail-overlay";
import { DrawingFilePreview } from "@/features/projects/components/drawing-file-preview";
import { fetchChecklistTypesPage } from "@/features/checklist-types/api/checklist-type.api";
import { fetchJobStatusesPage } from "@/features/job-status/api/job-status.api";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import {
  useLevelSnapshots,
  type LevelSnapshotState,
} from "@/shared/hooks/use-level-snapshots.hook";
import { PinThumbnailCropped } from "@/shared/components/pin-thumbnail-cropped";
import { number } from "zod";

const PIN_TABLE_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-[minmax(0,1.4rem)_minmax(0,5rem)_minmax(0,1fr)_minmax(0,6rem)_minmax(0,0.5fr)_minmax(0,0.4fr)_minmax(0,0.4fr)_minmax(0,1fr)_minmax(0,0.45fr)] items-center gap-x-3";
const PIN_TABLE_HEADER_CLASS = cn(
  PIN_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);

const PIN_TABLE_ROW_CLASS = cn(
  PIN_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
);

const SELECTION_CHECKBOX_CLASS_NAME =
  "h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer accent-(--dash-accent,#f97316)";

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

function ProjectPinsListLoadingSkeleton() {
  return (
    <>
      {Array.from({ length: 2 }, (_, levelIndex) => (
        <section key={levelIndex} className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-48 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800" />
          </div>

          <div className="space-y-4">
            {Array.from({ length: 2 }, (_, plotIndex) => (
              <div
                key={plotIndex}
                className="min-w-0 w-full rounded-xl border border-slate-200 bg-slate-50 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-950/20 flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800" />
                  <div className="h-4 w-36 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800" />
                </div>
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/5 rounded-full animate-pulse bg-slate-100 dark:bg-slate-800" />
                  <div className="overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                    {Array.from({ length: 2 }, (_, rowIndex) => (
                      <div
                        key={rowIndex}
                        className="grid min-w-0 grid-cols-[minmax(0,1.4rem)_minmax(0,5rem)_minmax(0,1fr)_minmax(0,6rem)_minmax(0,0.5fr)_minmax(0,0.4fr)_minmax(0,0.4fr)_minmax(0,0.45fr)] items-center gap-x-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800"
                      >
                        {Array.from({ length: 8 }, (_, cellIndex) => (
                          <div
                            key={cellIndex}
                            className="h-6 rounded bg-slate-200 dark:bg-slate-800 animate-pulse"
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}

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
      className={SELECTION_CHECKBOX_CLASS_NAME}
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
      <span className="min-w-0 truncate">
        {isEs ? "Formulario" : "Form"}
      </span>
      <span className="min-w-0 truncate">Status</span>
    </div>
  );
}

type PinCategory = {
  id: string;
  item_name: string;
  pins: DrawingPin[];
};

function PlotPinCategoryGroup({
  category,
  selectedIds,
  onTogglePin,
  onToggleCategory,
  onPreviewPin: onPreviewPinProp,
  onOpenPinDetail,
  expanded,
  onToggleExpanded,
  drawingFile,
  drawingFileType,
  snapshotState,
  drawingName,
  plot,
  resolveFormName,
}: {
  category: PinCategory;
  selectedIds: Set<number>;
  onTogglePin: (id: number) => void;
  onToggleCategory: (ids: number[]) => void;
  onPreviewPin: (pin: DrawingPin) => void;
  onOpenPinDetail: (pin: DrawingPin) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  plot: DrawingPlot;
  resolveFormName?: (pin: DrawingPin) => string;
}) {
  const categoryPinIds = useMemo(
    () => category.pins.map((pin) => pin.id),
    [category.pins],
  );

  const categoryState = useMemo(
    () => getSelectionState(categoryPinIds, selectedIds),
    [categoryPinIds, selectedIds],
  );

  const categoryCheckboxRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (categoryCheckboxRef.current)
      categoryCheckboxRef.current.indeterminate = categoryState === "partial";
  }, [categoryState]);

  return (
    <div
      key={category.id}
      className="border-b border-slate-200 dark:border-slate-800/60"
    >
      <div className="px-4 py-2 bg-slate-50/70 dark:bg-slate-900/40 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <input
            ref={categoryCheckboxRef}
            type="checkbox"
            className={SELECTION_CHECKBOX_CLASS_NAME}
            checked={categoryState === "all"}
            disabled={categoryPinIds.length === 0}
            onChange={() => onToggleCategory(categoryPinIds)}
          />
          <button
            type="button"
            className="inline-flex items-center gap-2 text-left text-xs font-medium text-slate-600 dark:text-slate-300"
            onClick={onToggleExpanded}
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                expanded && "rotate-90",
              )}
            />
            <span>{category.item_name}</span>
          </button>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {category.pins.length} {category.pins.length === 1 ? "item" : "items"}
        </span>
      </div>
      {expanded && (
        <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
          {category.pins.map((pin) => (
            <ProjectPinRow
              key={pin.id}
              pin={pin}
              selected={selectedIds.has(pin.id)}
              disabled={false}
              drawingFile={drawingFile}
              drawingFileType={drawingFileType}
              snapshotState={snapshotState}
              drawingName={drawingName}
              plots={[plot]}
              onToggle={() => onTogglePin(pin.id)}
              onPreview={() => onPreviewPinProp(pin)}
              onOpenDetail={() => onOpenPinDetail(pin)}
              resolveFormName={resolveFormName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function LazyPreviewContent({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = React.useState(false);

  React.useEffect(() => {
    if (
      shouldRender ||
      typeof window === "undefined" ||
      !containerRef.current
    ) {
      return;
    }

    if (typeof IntersectionObserver === "undefined") {
      setShouldRender(true);
      return;
    }

    const node = containerRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "220px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {shouldRender ? children : fallback}
    </div>
  );
}

function ProjectPinRow({
  pin,
  selected,
  disabled,
  onToggle,
  onPreview,
  onOpenDetail,
  drawingFile,
  drawingFileType,
  snapshotState,
  plots,
  drawingName,
  resolveFormName,
}: {
  pin: DrawingPin;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  onOpenDetail: () => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  plots: DrawingPlot[];
  resolveFormName?: (pin: DrawingPin) => string;
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
      role="button"
      tabIndex={0}
      onClick={onOpenDetail}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenDetail();
        }
      }}
      className={cn(
        "min-w-0 cursor-pointer",
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
            : SELECTION_CHECKBOX_CLASS_NAME,
        )}
        checked={selected}
        onClick={(e) => e.stopPropagation()}
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
          <LazyPreviewContent
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800/80 dark:text-slate-400">
                Preview
              </div>
            }
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
          </LazyPreviewContent>
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

      <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400 truncate">
        {resolveFormName ? resolveFormName(pin) : "—"}
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
  onToggleCategory,
  onPreviewPin,
  onOpenPinDetail,
  drawingFile,
  drawingFileType,
  snapshotState,
  drawingName,
  resolveFormName,
}: {
  plot: DrawingPlot;
  plotName: string;
  pins: DrawingPin[];
  selectedIds: Set<number>;
  onTogglePlot: (ids: number[]) => void;
  onTogglePin: (id: number) => void;
  onToggleCategory: (ids: number[]) => void;
  onPreviewPin: (pin: DrawingPin) => void;
  onOpenPinDetail: (pin: DrawingPin) => void;
  drawingFile?: string;
  drawingFileType?: string;
  snapshotState?: LevelSnapshotState;
  drawingName?: string;
  resolveFormName?: (pin: DrawingPin) => string;
}) {
  const [plotExpanded, setPlotExpanded] = useState<boolean>(true);

  const togglePlotExpanded = useCallback(() => {
    setPlotExpanded((v) => !v);
  }, []);
  const selectablePinIds = useMemo(
    () => pins.map((p) => p.id),
    [pins],
  );

  const plotHeaderRef = React.useRef<HTMLInputElement>(null);
  const plotState = getSelectionState(selectablePinIds, selectedIds);

  React.useEffect(() => {
    if (plotHeaderRef.current)
      plotHeaderRef.current.indeterminate = plotState === "partial";
  }, [plotState]);

  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set<string>(),
  );

  const categorizedPins = useMemo(() => {
    return pins.reduce(
      (
        acc: Array<{ id: string; item_name: string; pins: DrawingPin[] }>,
        currentPin,
      ) => {
        const categoryId = String(
          currentPin?.item_detail?.id ??
          currentPin?.group_detail?.id ??
          "uncategorized",
        );
        const existingCategory = acc.find((cat) => cat.id === categoryId);

        const itemName =
          currentPin?.item_detail?.name ??
          currentPin?.group_detail?.name ??
          "Uncategorized";

        if (existingCategory) {
          existingCategory.pins.push(currentPin);
        } else {
          acc.push({
            id: categoryId,
            item_name: itemName,
            pins: [currentPin],
          });
        }

        return acc;
      },
      [] as Array<{ id: string; item_name: string; pins: DrawingPin[] }>,
    );
  }, [pins]);

  const toggleCategoryExpanded = useCallback((categoryId: string) => {
    setExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) next.delete(categoryId);
      else next.add(categoryId);
      return next;
    });
  }, []);

  const handleToggleCategory = useCallback(
    (categoryPinIds: number[]) => {
      onToggleCategory(categoryPinIds);
    },
    [onToggleCategory],
  );

  return (
    <div className="min-w-0 w-full rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 flex items-center gap-3">
        {plotExpanded ? (
          <>
            <input
              ref={plotHeaderRef}
              type="checkbox"
              className={SELECTION_CHECKBOX_CLASS_NAME}
              checked={plotState === "all"}
              disabled={selectablePinIds.length === 0}
              onChange={() => onTogglePlot(selectablePinIds)}
            />
            <button
              type="button"
              onClick={togglePlotExpanded}
              className="inline-flex cursor-pointer items-center gap-2"
            >
              <ChevronRight
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  plotExpanded && "rotate-90",
                )}
              />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {plotName}
              </h3>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={togglePlotExpanded}
            className="inline-flex cursor-pointer items-center gap-2"
          >
            <ChevronRight
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                plotExpanded && "rotate-90",
              )}
            />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {plotName}
            </h3>
          </button>
        )}
      </div>
      <div className="min-w-0 w-full">
        {pins.length === 0 ? (
          <p className="p-4 text-sm text-slate-500 dark:text-slate-400 text-center bg-slate-50/30 dark:bg-transparent">
            No pins in this plot.
          </p>
        ) : plotExpanded ? (
          <>
            <ProjectPinTableHeader />
            {categorizedPins.map((category) => (
              <PlotPinCategoryGroup
                key={category.id}
                category={category}
                selectedIds={selectedIds}
                onTogglePin={onTogglePin}
                onToggleCategory={handleToggleCategory}
                onPreviewPin={onPreviewPin}
                onOpenPinDetail={onOpenPinDetail}
                expanded={expandedCategoryIds.has(category.id)}
                onToggleExpanded={() => toggleCategoryExpanded(category.id)}
                drawingFile={drawingFile}
                drawingFileType={drawingFileType}
                snapshotState={snapshotState}
                drawingName={drawingName}
                plot={plot}
                resolveFormName={resolveFormName}
              />
            ))}
          </>
        ) : null}
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
    if (!sites || sites.length === 0)
      return [] as { value: string; label: string }[];
    return sites
      .map((site) => {
        if (typeof site === "number")
          return { value: String(site), label: `#${site}` };
        return {
          value: String(site.id),
          label: site.site_name?.trim() || `#${site.id}`,
        };
      })
      .filter((option) => option.value);
  }, [sites]);

  const { id } = useParams<{ id: string }>();

  const [collapsedLevelIds, setCollapsedLevelIds] = useState<Set<number>>(
    () => new Set(),
  );

  const toggleLevelExpanded = useCallback((levelId: number) => {
    setCollapsedLevelIds((prev) => {
      const next = new Set(prev);
      if (next.has(levelId)) next.delete(levelId);
      else next.add(levelId);
      return next;
    });
  }, []);

  const isLevelExpanded = useCallback(
    (levelId: number) => !collapsedLevelIds.has(levelId),
    [collapsedLevelIds],
  );

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
    drawingId?: number;
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
  const [dialogJobStatusId, setDialogJobStatusId] = useState<
    number | undefined
  >(undefined);
  const [jobStatusOptions, setJobStatusOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [loadingJobStatuses, setLoadingJobStatuses] = useState(false);
  const [selectedJobStatus, setSelectedJobStatus] = useState("false");
  const [selectedQuoteStatus, setSelectedQuoteStatus] = useState("approved");
  const [selectedAction, setSelectedAction] = useState("");
  const [selectedActionField, setSelectedActionField] = useState("");
  const [selectedFormId, setSelectedFormId] = useState("");
  const [selectedVariation, setSelectedVariation] = useState("");
  const [selectedQuantity, setSelectedQuantity] = useState("");
  const [formOptions, setFormOptions] = useState<{ value: string; label: string }[]>([]);
  const [projectForms, setProjectForms] = useState<any[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [jobConflictWarning, setJobConflictWarning] = useState(false);
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
        if (!cancelled) {
          const options = res.items.map((s: WorkflowColourStatus) => ({
            value: String(s.id),
            label: s.status_name,
          }));
          setJobStatusOptions(options);

          // Find "To Do" (or "todo") by default from dynamic list
          const todoOption = options.find((opt) =>
            opt.label.toLowerCase().includes("to do") || opt.label.toLowerCase().includes("todo"),
          ) ?? options[0];

          if (todoOption) {
            setDialogJobStatusId(Number.parseInt(todoOption.value, 10));
            setValue("job_status", todoOption.value, { shouldValidate: true });
          }
        }
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

  const loadLocationsPage = useCallback(
    async (silent = false): Promise<void> => {
      if (!id) return;

      if (!silent) {
        if (page === 1) setLoading(true);
        else setLoadingMore(true);
      }
      setLoadError(null);

      try {
        const rawParams: Record<string, string> = {
          is_converted_job: selectedJobStatus,
          quote_status: selectedQuoteStatus,
        };
        // Strip empty-string values — empty means "All", so omit them entirely
        const params = Object.fromEntries(
          Object.entries(rawParams).filter(([, v]) => v !== "")
        );
        const { items, pagination: p } = await fetchDrawingsPage(
          Number(id),
          page,
          pageSize,
          search || undefined,
          params,
        );
        setLocations((prev) => (page === 1 ? items : [...prev, ...items]));
        setPagination(p);
      } catch (e) {
        console.error(e);
        setLoadError(
          typeof e === "object" && e && "message" in e
            ? String((e as { message?: unknown }).message)
            : "Failed to load locations",
        );
        if (page === 1) setLocations([]);
      } finally {
        if (!silent) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [id, page, pageSize, search, selectedJobStatus, selectedQuoteStatus],
  );

  useEffect(() => {
    let cancelled = false;
    loadLocationsPage().catch(() => { });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, page, pageSize, search, selectedJobStatus, selectedQuoteStatus]);

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

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingForms(true);
    fetchProjectFormsPage(Number(id), 1, 500)
      .then((res) => {
        if (!cancelled) {
          setProjectForms(res.items);
          setFormOptions(
            res.items.map((form) => ({
              value: String(form.id),
              label: form.name,
            })),
          );
        }
      })
      .catch((err) => {
        console.error("Failed to fetch project forms:", err);
      })
      .finally(() => {
        if (!cancelled) setLoadingForms(false);
      });
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
    control,
    setValue,
    formState: { errors },
  } = useForm<{
    start_date: string | null;
    site: string;
    checklists: string[];
    job_status: string;
    assigned_worker: string;
  }>({
    defaultValues: {
      start_date: null,
      site: "",
      checklists: [],
      job_status: "",
      assigned_worker: "",
    },
  });

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
          })
          .filter((p) => p.pins.length > 0); // always hide plots with no pins

        return { ...level, plots };
      })
      .filter((level) => level.plots.length > 0); // always hide levels with no plots
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
        plot.pins.map((pin) => pin.id),
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


  // Pins among the selection that are already converted to jobs
  const alreadyJobPins = useMemo(() => {
    const result: DrawingPin[] = [];
    for (const level of filteredLocations) {
      for (const plot of level.plots) {
        for (const pin of plot.pins) {
          if (effectiveSelectedIds.has(pin.id) && pin.is_converted_job) {
            result.push(pin);
          }
        }
      }
    }
    return result;
  }, [filteredLocations, effectiveSelectedIds]);

  // Pin IDs safe to use for Create Job (exclude already-converted ones)
  const jobEligiblePinIds = useMemo(
    () =>
      Array.from(effectiveSelectedIds).filter((pinId) =>
        !alreadyJobPins.some((p) => p.id === pinId),
      ),
    [effectiveSelectedIds, alreadyJobPins],
  );

  const formNameById = useMemo(() => {
    const map = new Map<number, string>();
    for (const form of projectForms) {
      map.set(form.id, form.name);
    }
    return map;
  }, [projectForms]);

  const resolveFormName = useCallback(
    (pin: DrawingPin) => {
      if (!pin) return "—";
      const pf = pin.project_form;
      if (pf && typeof pf === "object") {
        if (pf.name) return pf.name;
        const mappedName = formNameById.get(pf.id);
        if (mappedName) return mappedName;
      } else if (typeof pf === "number") {
        const mappedName = formNameById.get(pf);
        if (mappedName) return mappedName;
      }
      const fId = pin.formId;
      if (typeof fId === "number") {
        const mappedName = formNameById.get(fId);
        if (mappedName) return mappedName;
      }
      return "—";
    },
    [formNameById],
  );

  const allSelected =
    selectablePinIds.length > 0 &&
    selectablePinIds.every((pinId) => effectiveSelectedIds.has(pinId));

  const handleSelectAllToggle = useCallback(
    (_ids: number[]) => {
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
    },
    [selectablePinIds, allSelected],
  );

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
    start_date: string | null;
    site: string;
    checklists: string[];
    job_status: string;
    assigned_worker: string;
  }): Promise<void> => {
    setIsSubmitting(true);
    try {
      const safeStartDate = formData.start_date?.trim() ? formData.start_date : undefined;
      const res = await createJobFromLocation({
        project: Number(id),
        pin_ids: jobEligiblePinIds,
        site: formData.site ? Number(formData.site) : undefined,
        start_date: safeStartDate,
        assigned_worker: formData.assigned_worker
          ? Number(formData.assigned_worker)
          : undefined,
        checklists: formData.checklists.map(Number),
        job_status: formData.job_status
          ? Number(formData.job_status)
          : undefined,
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

  const handleApplyMassUpdate = async () => {
    if (!selectedActionField || selectedIds.size === 0 || !id) return;

    setIsSubmitting(true);
    try {
      const pinIds = Array.from(selectedIds);
      const payload: import("@/features/projects/api/project.api").ProjectMassUpdatePayload = {
        pin_ids: pinIds,
      };

      if (selectedActionField === "update_form") {
        payload.form_id = selectedFormId ? Number(selectedFormId) : null;
      } else if (selectedActionField === "update_variation") {
        payload.variation = selectedVariation === "true";
      } else if (selectedActionField === "update_quantity") {
        payload.quantity = selectedQuantity ? Number(selectedQuantity) : 1;
      }

      await massUpdatePins(Number(id), payload);

      // Refresh data from server
      await loadLocationsPage(true);
      setSelectedIds(new Set());
      setSelectedAction("");
      setSelectedActionField("");
      setSelectedFormId("");
      setSelectedVariation("");
      setSelectedQuantity("");
      toastSuccess("Pins updated successfully");
    } catch (err) {
      console.error("Failed to mass update pins:", err);
      toastError("Failed to update pins");
    } finally {
      setIsSubmitting(false);
    }
  };

  const QuoteFilerOptions = [
    { value: "", label: "All Quotes" },
    { value: "draft", label: "Draft" },
    { value: "approved", label: "Quote Approved" },
    // { value: "rejected", label: "Rejected" },
  ];
  const jobStatus = [
    { value: "", label: "All Jobs Pins" },
    { value: "true", label: "Is a job" },
    { value: "false", label: "Not a job" },
  ];
  const massActionOptions = [
    {
      value: "update",
      label: t("massUpdate"),
    },
  ];
  const actionFields = [
    {
      value: "update_form",
      label: t("actionFieldForm"),
    },
    {
      value: "update_variation",
      label: t("actionFieldVariation"),
    },
    {
      value: "update_quantity",
      label: t("actionFieldQuantity"),
    },
  ];
  return (
    <div className="min-w-0 w-full ">
      {dialogVisible && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-99 px-4">
          <div className="w-full max-w-md bg-white p-6 rounded-lg dark:bg-slate-950">
            <h2 className="text-lg font-semibold">Create Job</h2>
            <p className="mt-2">
              Are you sure you want to create a job for the selected pins?
            </p>

            <div className="mt-2">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                {t("Start")}
                {/* <span className="text-red-500">*</span> */}
              </label>
              <input
                type="date"
                {...register("start_date", {
                  // required: t("requiredJob"),
                })}
                placeholder={t("createJobPlaceHolder")}
                className={cn(
                  surfaceInputClassName,
                  errors.start_date
                    ? "border-red-300 ring ring-red-500"
                    : "border-slate-300",
                  "w-full p-2 rounded-md bg-white dark:bg-slate-900",
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
              <Controller
                control={control}
                name="site"
                rules={{
                  required: t("requiredSite") || "Site is required",
                }}
                render={({ field }) => (
                  <CheckmarkSelect
                    listLabel={t("site")}
                    buttonAriaLabel={t("site")}
                    options={siteOptions}
                    value={field.value}
                    emptyLabel={t("selectSite")}
                    portaled
                    searchable
                    clearable
                    className={cn(
                      "w-full",
                      errors.site && "ring ring-red-500 rounded-lg",
                    )}
                    // onChange={(value) => {
                    //   setDialogSiteId(
                    //     value ? Number.parseInt(value, 10) : undefined,
                    //   );
                    //   setValue("site", value ?? "", { shouldValidate: true });
                    // }}
                    onChange={(option) => field.onChange(option)}
                  />
                )}
              />
              {/*               
              <input
                type="hidden"
                {...register("site", {
                  required: t("requiredSite") || "Site is required",
                })}
              /> */}
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
              <Controller
                name="assigned_worker"
                rules={{
                  required: false,
                }}
                control={control}
                render={({ field }) => (
                  <CheckmarkSelect
                    listLabel={t("assignedWorker")}
                    buttonAriaLabel={t("assignedWorker")}
                    options={workerOptions}
                    value={field.value || ""}
                    emptyLabel={t("selectWorker") || "Select Worker"}
                    portaled
                    searchable
                    clearable
                    className="w-full"
                    disabled={loadingWorkers || workerOptions.length === 0}
                    onChange={(value) => field.onChange(value)}
                  />
                )}
              />
            </div>

            <div className="mt-4">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                {t("checkList")} <span className="text-red-500">*</span>
              </label>
              <Controller
                control={control}
                name="checklists"
                rules={{
                  required: t("requiredChecklist") || "Checklist is required",
                }}
                render={({ field }) => (
                  <MultiCheckSelect
                    id="checklist-select"
                    options={checklistOptions}
                    // values={dialogChecklistIds.map(String)}
                    values={field.value ?? []}
                    onChange={(options: string[]) => field.onChange(options)}
                    placeholder={t("selectChecklist") || "Select Checklist"}
                    listLabel={t("checkList")}
                    disabled={checkListLoading}
                    className="w-full "
                  />
                )}
              />

              {/* <input
    type="hidden"
    {...register("checklists", {
      required: t("requiredChecklist") || "Checklist is required",
    })}
  /> */}
              {errors.checklists && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.checklists.message}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label className="text-md font-semibold text-slate-800 dark:text-slate-200">
                Job Status <span className="text-red-500">*</span>
              </label>
              <CheckmarkSelect
                listLabel="Job Status"
                buttonAriaLabel="Job Status"
                options={jobStatusOptions}
                value={
                  dialogJobStatusId != null ? String(dialogJobStatusId) : ""
                }
                emptyLabel="Select Job Status"
                portaled
                searchable
                clearable
                className="w-full"
                disabled={loadingJobStatuses || jobStatusOptions.length === 0}
                onChange={(value) => {
                  setDialogJobStatusId(
                    value ? Number.parseInt(value, 10) : undefined,
                  );
                  setValue("job_status", value ?? "", { shouldValidate: true });
                }}
              />
              <input
                type="hidden"
                {...register("job_status", {
                  required: t("requiredJobStatus") || "Job status is required",
                })}
              />
              {errors.job_status && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.job_status.message}
                </p>
              )}
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

      {/* Already-a-job conflict warning modal */}
      {jobConflictWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700/80 overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-3 px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-50">
                  These pins are already assigned a job
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {alreadyJobPins.length} of {effectiveSelectedIds.size} selected{" "}
                  {effectiveSelectedIds.size === 1 ? "pin" : "pins"}{" "}
                  {alreadyJobPins.length === 1 ? "is" : "are"} assigned to a job and will not be included in the new job
                </p>
              </div>
            </div>

            {/* Table of conflicting pins */}
            <div className="px-6 py-4 max-h-60 overflow-y-auto">
              <div className="rounded-lg border border-slate-200 dark:border-slate-700/80 overflow-hidden">
                <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)_minmax(0,1.5fr)] bg-slate-50 dark:bg-slate-800/50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <span>Pin#</span>
                  <span>Product</span>
                  <span>Form</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {alreadyJobPins.map((pin) => (
                    <div
                      key={pin.id}
                      className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)_minmax(0,1.5fr)] px-4 py-2.5 text-sm"
                    >
                      <span className="font-semibold text-slate-500">#{pin.id}</span>
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {pin.item_detail?.name || pin.group_detail?.name || "—"}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 truncate">
                        {resolveFormName ? resolveFormName(pin) : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer note */}
            {jobEligiblePinIds.length > 0 && (
              <div className="px-6 pb-2">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  Only the remaining {jobEligiblePinIds.length}{" "}
                  {jobEligiblePinIds.length === 1 ? "pin" : "pins"} will be included in the new job.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800 px-6 py-4">
              <AppButton
                variant="secondary"
                size="sm"
                onClick={() => setJobConflictWarning(false)}
              >
                Cancel
              </AppButton>
              <AppButton
                variant="primary"
                size="sm"
                disabled={jobEligiblePinIds.length === 0}
                onClick={() => {
                  setJobConflictWarning(false);
                  setDialogVisible(true);
                }}
              >
                Continue
              </AppButton>
            </div>
          </div>
        </div>
      )}

      {/* ── Sticky header: title + filters (single responsive row) ── */}
      <div className="sticky top-0 z-10 shrink-0 divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950">

        <div className="flex min-w-0 flex-col gap-3 px-4 lg:px-6 py-3 lg:flex-row sm:items-center sm:justify-between sm:gap-4 w-full">
          {/* Title + subtitle */}
          <div className="min-w-0 shrink-0">
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
              {t("title")}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
              {t("subtitle")}
            </p>
          </div>

          {/* Filters — wrap on mobile, single row on sm+ */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <ListPageSearchField
              value={search}
              onCommit={commitSearch}
              placeholder={t("searchPlaceholder")}
              ariaLabel={t("searchAria")}
              className="w-full min-w-0 sm:w-48"
            />
            <CheckmarkSelect
              listLabel={t("quoteStatus")}
              buttonAriaLabel={t("quoteStatus")}
              options={QuoteFilerOptions}
              value={selectedQuoteStatus}
              emptyLabel={t("quoteStatus")}
              className="min-w-0 flex-1 sm:flex-none sm:w-36"
              onChange={(o) => {
                setSelectedQuoteStatus(o);
              }}
              clearable
            />
            <CheckmarkSelect
              options={jobStatus}
              listLabel={t("pinsStatus")}
              buttonAriaLabel={t("pinsStatus")}
              emptyLabel={t("pinsStatus")}
              clearable
              className="min-w-0 flex-1 sm:flex-none sm:w-36"
              value={selectedJobStatus}
              onChange={(e) => {
                setSelectedJobStatus(e);
              }}
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
              className="min-w-0 flex-1 sm:flex-none sm:w-36"
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
              className="min-w-0 flex-1 sm:flex-none sm:w-36"
              onChange={(v) =>
                setPlotFilter(v ? Number.parseInt(v, 10) : undefined)
              }
            />
          </div>
        </div>
        {selectedIds.size > 0 && <div className="px-4 lg:px-6 py-2 mb-2">
          <div className="bg-white drak:bg-slate-900/20 p-2 sm:px-4 sm:py-2  dark:bg-slate-900/20 border dark:border-slate-700/80  rounded-lg border-slate-200/90 flex items-center justify-between gap-3 overflow-hidden">
            <div className="flex items-center  gap-4">
              <span className="shrink-0 whitespace-nowrap rounded-md bg-[color:var(--dash-accent,#111)]/10 px-2 py-1 text-xs font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {selectedIds.size} {selectedIds.size === 1 ? "pin" : "pins"}{" "}
                selected
              </span>
              <div className="bg-slate-200  h-4"></div>
              <CheckmarkSelect
                listLabel={t("massAction")}
                buttonAriaLabel={t("massAction")}
                options={massActionOptions}
                emptyLabel={t("selectAction")}
                className="w-42"
                value={selectedAction}
                clearable
                size="sm"
                portaled
                onChange={(e) => {
                  setSelectedAction(e);
                }}
              />
              {selectedAction && (
                <div className="flex items-center gap-3">
                  <CheckmarkSelect
                    listLabel={t("actionField")}
                    buttonAriaLabel={t("actionField")}
                    options={actionFields}
                    emptyLabel={t("selectField")}
                    value={selectedActionField}
                    clearable
                    size="sm"
                    portaled
                    className="w-40"
                    onChange={(e) => {
                      setSelectedActionField(e);
                      setSelectedFormId("");
                      setSelectedVariation("");
                      setSelectedQuantity("");
                    }}
                  />

                  {selectedActionField === "update_form" && (
                    <CheckmarkSelect
                      listLabel="Form"
                      buttonAriaLabel="Form"
                      options={formOptions}
                      emptyLabel={loadingForms ? "Loading..." : "Select Form"}
                      value={selectedFormId}
                      clearable
                      size="sm"
                      portaled
                      className="w-44"
                      disabled={loadingForms}
                      onChange={(e) => setSelectedFormId(e)}
                    />
                  )}

                  {selectedActionField === "update_variation" && (
                    <CheckmarkSelect
                      listLabel="Variation"
                      buttonAriaLabel="Variation"
                      options={[
                        { value: "true", label: "Yes" },
                        { value: "false", label: "No" },
                      ]}
                      emptyLabel="Select Variation"
                      value={selectedVariation}
                      clearable
                      size="sm"
                      portaled
                      className="w-40"
                      onChange={(e) => setSelectedVariation(e)}
                    />
                  )}

                  {selectedActionField === "update_quantity" && (
                    <input
                      type="number"
                      min="1"
                      max={200}
                      value={selectedQuantity}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") { setSelectedQuantity(""); return; }
                        const clamped = Math.min(200, Math.max(1, Number(raw)));
                        setSelectedQuantity(String(clamped));
                      }}
                      className={cn(
                        surfaceInputClassName,
                        "w-24 px-3 h-8 py-1 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100",
                      )}
                      placeholder="Qty"
                    />
                  )}

                  <AppButton
                    variant="primary"
                    size="sm"
                    onClick={handleApplyMassUpdate}
                    loading={isSubmitting}
                    disabled={
                      isSubmitting ||
                      !selectedActionField ||
                      (selectedActionField === "update_form" && !selectedFormId) ||
                      (selectedActionField === "update_variation" && !selectedVariation) ||
                      (selectedActionField === "update_quantity" && !selectedQuantity)
                    }
                  >
                    Apply
                  </AppButton>

                </div>
              )}
            </div>


            {effectiveSelectedIds.size > 0 && selectedQuoteStatus == "approved" && (
              <AppButton
                variant="primary"
                size="sm"
                onClick={() => {
                  const todoOption = jobStatusOptions.find((opt) =>
                    opt.label.toLowerCase().includes("to do") || opt.label.toLowerCase().includes("todo"),
                  ) ?? jobStatusOptions[0];

                  if (todoOption) {
                    setDialogJobStatusId(Number.parseInt(todoOption.value, 10));
                    setValue("job_status", todoOption.value, { shouldValidate: true });
                  }

                  if (alreadyJobPins.length > 0) {
                    setJobConflictWarning(true);
                  } else {
                    setDialogVisible(true);
                  }
                }}
              >
                Create Job
              </AppButton>
            )}
          </div>
        </div>}

      </div>{/* end sticky header */}

      {/* ── Scrollable content ── */}
      <div>
        {loadError && locations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">
            {loadError}
          </p>
        ) : loading ? (
          <ProjectPinsListLoadingSkeleton />
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
          <div className="mt-2">
            <label className="inline-flex shrink-0 items-center gap-2 cursor-pointer px-4 lg:px-6 py-2">
              <GroupCheckbox
                ids={selectablePinIds}
                selectedIds={effectiveSelectedIds}
                onToggle={handleSelectAllToggle}
              />
              <span className="whitespace-nowrap text-sm text-slate-700 dark:text-slate-200">
                {allSelected ? "Deselect All" : "Select All"}
              </span>
            </label>
            <div className="space-y-8 px-4 lg:px-6 py-4 sm:py-2">
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
                  <section
                    key={level.id}
                    className="space-y-4 p-4 bg-white dark:border-slate-700/80 border border-slate-200/90 dark:bg-slate-900/50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <GroupCheckbox
                        ids={levelPinIds}
                        selectedIds={selectedIds}
                        onToggle={handleToggleGroup}
                      />
                      <span
                        className="h-4 w-1 rounded-full bg-(--dash-accent,#f97316)"
                        aria-hidden
                      />
                      <button
                        type="button"
                        onClick={() => toggleLevelExpanded(level.id)}
                        className="flex flex-1 cursor-pointer items-center gap-2 rounded-md py-1 text-left"
                      >
                        <ChevronRight
                          className={cn(
                            "h-3 w-3 transition-transform duration-200",
                            isLevelExpanded(level.id) && "rotate-90",
                          )}
                        />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                          {level.name}
                        </h3>
                      </button>
                    </div>

                    {isLevelExpanded(level.id) && (
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
                              drawingFileType={level.drawing_file_type}
                              snapshotState={levelSnapshots.get(level.id)}
                              drawingName={level.name}
                              onTogglePlot={handleToggleGroup}
                              onToggleCategory={handleToggleGroup}
                              onTogglePin={handleTogglePin}
                              resolveFormName={resolveFormName}
                              onPreviewPin={(pin) => {
                                setPreviewPinData({
                                  pin,
                                  plots: level.plots,
                                  drawingFile: level.drawing_file,
                                  drawingName: level.name,
                                  drawingId: level.id,
                                });
                              }}
                              onOpenPinDetail={(pin) => {
                                router.push(
                                  `${routes.dashboard.projectPinDetail(id, pin.id, level.id)}&back=${encodeURIComponent(
                                    buildProjectDetailTabHref(Number(id), "location"),
                                  )}`,
                                );
                              }}
                            />
                          ))
                        )}
                      </div>
                    )}
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
          projectId={Number(id)}
          drawingId={previewPinData.drawingId}
          editUrl={previewPinData.drawingId ? `/projects/${id}/drawings/${previewPinData.drawingId}` : undefined}
          onSaveSuccess={(updatedPin) => {
            setPreviewPinData(prev => prev ? { ...prev, pin: updatedPin } : null);
            setLocations(prevLocations =>
              prevLocations.map(drawing => {
                if (drawing.id !== previewPinData.drawingId) return drawing;
                return {
                  ...drawing,
                  plots: (drawing.plots ?? []).map(plot => ({
                    ...plot,
                    pins: (plot.pins ?? []).map(p => p.id === updatedPin.id ? updatedPin : p)
                  }))
                };
              })
            );
          }}
        />
      )}
    </div>
  );
};

export default ProjectPinsListTab;

