"use client";

import * as React from "react";
import { Layers, MapPinned } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import {
  isJobFormPinCheckboxDisabled,
  isPinToDoStatus,
  collectPinIdsFromJobLevels,
} from "@/features/jobs/utils/job-levels.util";
import type { JobLevelSnapshot } from "@/features/jobs/types/job.types";
import { DrawingPinPreviewModal } from "@/features/projects/components/drawing-pin-preview-modal";
import type { Drawing, DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
import type { ProjectPagination } from "@/features/projects/types/project.types";
import { cn } from "@/core/utils/http.util";
import { useLevelSnapshots, type LevelSnapshotState } from "@/shared/hooks/use-level-snapshots.hook";
import { PinThumbnailCropped } from "@/shared/components/pin-thumbnail-cropped";

const PIN_TABLE_GRID =
  "grid min-w-0 w-full max-w-full grid-cols-[minmax(0,1.5rem)_minmax(0,5rem)_minmax(0,1fr)_minmax(0,0.5fr)_minmax(0,0.4fr)_minmax(0,0.4fr)_minmax(0,0.45fr)_minmax(0,3.5rem)] items-center gap-x-3";
const PIN_TABLE_HEADER_CLASS = cn(
  PIN_TABLE_GRID,
  "border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
);
const PIN_TABLE_ROW_CLASS = cn(
  PIN_TABLE_GRID,
  "px-4 py-3 text-sm transition-colors border-b border-slate-100 last:border-b-0 dark:border-slate-800/80",
);

function getSelectionState(ids: number[], selectedIds: ReadonlySet<number>): "none" | "partial" | "all" {
  if (ids.length === 0) return "none";
  let count = 0;
  for (const id of ids) {
    if (selectedIds.has(id)) count++;
  }
  if (count === 0) return "none";
  if (count === ids.length) return "all";
  return "partial";
}

function toggleSelection(ids: number[], selectedIds: ReadonlySet<number>): Set<number> {
  const next = new Set(selectedIds);
  const state = getSelectionState(ids, selectedIds);
  if (state === "all") {
    for (const id of ids) next.delete(id);
  } else {
    for (const id of ids) next.add(id);
  }
  return next;
}

function GroupCheckbox({
  ids,
  selectedIds,
  onToggle,
  className,
}: {
  ids: number[];
  selectedIds: ReadonlySet<number>;
  onToggle: (ids: number[]) => void;
  className?: string;
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
        className,
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
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold"
      style={{
        backgroundColor: sd.bg_colour || "#e2e8f0",
        color: sd.text_colour || "#475569",
      }}
    >
      {sd.status_name}
    </span>
  );
}

function JobFormPinTableHeader() {
  const locale = useLocale();
  const isEs = locale === "es";
  return (
    <div className={cn("min-w-0", PIN_TABLE_HEADER_CLASS)}>
      <span aria-hidden />
      <span className="min-w-0 truncate">Pin ID</span>
      <span className="min-w-0 truncate">Product</span>
      <span className="min-w-0 truncate">{isEs ? "Variación" : "Variation"}</span>
      <span className="min-w-0 truncate">Quantity</span>
      <span className="min-w-0 truncate">Is a Job</span>
      <span className="min-w-0 truncate">Status</span>
      <span className="sr-only">Actions</span>
    </div>
  );
}

function JobFormPinRow({
  pin,
  selected,
  disabled,
  onToggle,
  onPreview,
  drawingFile,
  drawingFileType,
  snapshotState,
}: {
  pin: DrawingPin;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onPreview: () => void;
  drawingFile?: string;
  drawingFileType?: string | null;
  snapshotState?: LevelSnapshotState;
}) {
  const locale = useLocale();
  const isEs = locale === "es";
  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const sku = pin.item_detail?.sku;
  const variationText = pin.variation ? (isEs ? "Sí" : "Yes") : isEs ? "No" : "No";

  return (
    <div
      className={cn(
        "min-w-0",
        PIN_TABLE_ROW_CLASS,
        disabled ? "bg-slate-50/60 dark:bg-slate-950/40" : "hover:bg-slate-50/90 dark:hover:bg-slate-800/30",
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        className={cn(
          "h-3.5 w-3.5 shrink-0 rounded-[3px] border-slate-300 dark:border-slate-600 dark:bg-slate-900",
          disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer accent-(--dash-accent,#f97316)",
        )}
        checked={selected}
        onChange={onToggle}
      />
      <span className="min-w-0 font-semibold text-slate-500">#{pin.id}</span>
      <div className="flex min-w-0 flex-col">
        <span className="min-w-0 truncate font-medium text-slate-900 dark:text-slate-100">{productName}</span>
        {sku ? <span className="min-w-0 truncate text-xs text-slate-400">{sku}</span> : null}
      </div>
      <span className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">{variationText}</span>
      <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">{pin.quantity ?? 1}</span>
      <span className="min-w-0 text-xs font-medium text-slate-600 dark:text-slate-400">
        {pin.is_converted_job ? "Yes" : "No"}
      </span>
      <div>
        <PinStatusChip pin={pin} />
      </div>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview();
          }}
          title="Preview on Drawing"
          className="relative flex h-7 w-12 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
          ) : (
            <MapPinned className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function PlotPinsBlock({
  plotName,
  pins,
  selectedIds,
  drawingFile,
  drawingFileType,
  snapshotState,
  isPinDisabled,
  onTogglePlot,
  onTogglePin,
  onPreviewPin,
}: {
  plotName: string;
  pins: DrawingPin[];
  selectedIds: ReadonlySet<number>;
  drawingFile?: string;
  drawingFileType?: string | null;
  snapshotState?: LevelSnapshotState;
  isPinDisabled: (pin: DrawingPin) => boolean;
  onTogglePlot: (ids: number[]) => void;
  onTogglePin: (id: number) => void;
  onPreviewPin: (pin: DrawingPin) => void;
}) {
  const selectablePinIds = React.useMemo(
    () => pins.filter((pin) => !isPinDisabled(pin)).map((pin) => pin.id),
    [pins, isPinDisabled],
  );

  return (
    <div className="min-w-0 w-full rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-linear-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950/40">
        <GroupCheckbox ids={selectablePinIds} selectedIds={selectedIds} onToggle={onTogglePlot} />
        <Layers className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{plotName}</span>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {pins.length === 1 ? "1 Pin" : `${pins.length} Pins`}
        </span>
      </div>
      <div className="min-w-0 w-full">
        {pins.length === 0 ? (
          <p className="bg-slate-50/30 p-4 text-center text-sm text-slate-500 dark:bg-transparent dark:text-slate-400">
            No pins in this plot.
          </p>
        ) : (
          <>
            <JobFormPinTableHeader />
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pins.map((pin) => (
                <JobFormPinRow
                  key={pin.id}
                  pin={pin}
                  selected={selectedIds.has(pin.id)}
                  disabled={isPinDisabled(pin)}
                  drawingFile={drawingFile}
                  drawingFileType={drawingFileType}
                  snapshotState={snapshotState}
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

type Props = {
  projectId: number;
  initialJobLevels: JobLevelSnapshot[];
  selectedPinIds: ReadonlySet<number>;
  onSelectedPinIdsChange: (ids: Set<number>) => void;
  onLocationsChange: (locations: Drawing[]) => void;
  disabled?: boolean;
};

export function JobFormLevelsSection({
  projectId,
  initialJobLevels,
  selectedPinIds,
  onSelectedPinIdsChange,
  onLocationsChange,
  disabled = false,
}: Props) {
  const t = useTranslations("Dashboard.jobs.levelsHierarchy");

  const [locations, setLocations] = React.useState<Drawing[]>([]);
  const levelSnapshots = useLevelSnapshots(locations);

  const currentJobPinIds = React.useMemo(() => {
    return collectPinIdsFromJobLevels(initialJobLevels);
  }, [initialJobLevels]);

  const isPinDisabled = React.useCallback(
    (pin: DrawingPin) => {
      return !isPinToDoStatus(pin) || (pin.is_converted_job === true && !currentJobPinIds.has(pin.id));
    },
    [currentJobPinIds],
  );
  // Mirror locations in a ref so the async effect can read the latest value
  // without adding `locations` to its dependency array (which would cause loops).
  const locationsRef = React.useRef<Drawing[]>(locations);
  locationsRef.current = locations;
  const [loading, setLoading] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const pageSize = 20;
  const [pagination, setPagination] = React.useState<ProjectPagination>({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: pageSize,
    next: null,
    previous: null,
  });
  const [previewPinData, setPreviewPinData] = React.useState<{
    pin: DrawingPin;
    plots: DrawingPlot[];
    drawingFile: string;
    drawingName: string;
  } | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLocationsPage() {
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      setLoadError(null);

      try {
        const { items, pagination: p } = await fetchDrawingsPage(projectId, page, pageSize);
        if (cancelled) return;
        // Compute next outside the setter — calling onLocationsChange (which updates
        // parent state) inside a setState updater causes the React "setState during
        // render" error. We use locationsRef to get the latest value without a
        // stale closure.
        const next = page === 1 ? items : [...locationsRef.current, ...items];
        setLocations(next);
        onLocationsChange(next);
        setPagination(p);
      } catch (error) {
        if (cancelled) return;
        setLoadError(
          typeof error === "object" && error && "message" in error
            ? String((error as { message?: unknown }).message)
            : t("loadError"),
        );
        if (page === 1) {
          setLocations([]);
          onLocationsChange([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    }

    void loadLocationsPage();
    return () => {
      cancelled = true;
    };
  }, [onLocationsChange, page, pageSize, projectId, t]);

  React.useEffect(() => {
    setPage(1);
    setLocations([]);
    onLocationsChange([]);
  }, [projectId, onLocationsChange]);

  const hasMorePages = pagination.current_page < pagination.total_pages;

  React.useEffect(() => {
    if (loading || loadingMore || !pagination.next || page >= pagination.total_pages) return;
    const element = sentinelRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setPage((currentPage) => Math.min(currentPage + 1, pagination.total_pages));
        }
      },
      { rootMargin: "250px" },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [loading, loadingMore, page, pagination.current_page, pagination.next, pagination.total_pages]);

  const pinById = React.useMemo(() => {
    const map = new Map<number, DrawingPin>();
    for (const level of locations) {
      for (const plot of level.plots ?? []) {
        for (const pin of plot.pins ?? []) {
          map.set(pin.id, pin);
        }
      }
    }
    return map;
  }, [locations]);

  const handleToggleGroup = React.useCallback(
    (ids: number[]) => {
      const selectableIds = ids.filter((id) => {
        const pin = pinById.get(id);
        return pin ? !isPinDisabled(pin) : false;
      });
      const next = toggleSelection(selectableIds, selectedPinIds);
      for (const id of ids) {
        const pin = pinById.get(id);
        if (pin && isPinDisabled(pin) && selectedPinIds.has(id)) {
          next.add(id);
        }
      }
      onSelectedPinIdsChange(next);
    },
    [onSelectedPinIdsChange, pinById, selectedPinIds, isPinDisabled],
  );

  const handleTogglePin = React.useCallback(
    (pinId: number) => {
      const pin = pinById.get(pinId);
      if (!pin || isPinDisabled(pin)) return;
      const next = new Set(selectedPinIds);
      if (next.has(pinId)) next.delete(pinId);
      else next.add(pinId);
      onSelectedPinIdsChange(next);
    },
    [onSelectedPinIdsChange, pinById, selectedPinIds, isPinDisabled],
  );

  if (loading && locations.length === 0) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
    );
  }

  if (loadError && locations.length === 0) {
    return <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>;
  }

  return (
    <div className={cn(disabled && "pointer-events-none opacity-60")}>
      {loadError && locations.length > 0 ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {loadError}
        </p>
      ) : null}

      <div className="space-y-8">
        {locations.map((level) => {
          const levelSelectablePinIds = (level.plots ?? []).flatMap((plot) =>
            (plot.pins ?? []).filter((pin) => isPinToDoStatus(pin) && !pin.is_converted_job).map((pin) => pin.id),
          );

          return (
            <section key={level.id} className="space-y-4">
              <div className="flex items-center gap-2">
                <GroupCheckbox
                  ids={levelSelectablePinIds}
                  selectedIds={selectedPinIds}
                  onToggle={handleToggleGroup}
                />
                <span className="h-4 w-1 rounded-full bg-(--dash-accent,#f97316)" aria-hidden />
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-700 dark:text-slate-200">
                  {level.name}
                </h3>
              </div>
              <div className="space-y-4">
                {(level.plots ?? []).length === 0 ? (
                  <p className="pl-9 text-sm text-slate-500 dark:text-slate-400">{t("noPlotsInLevel")}</p>
                ) : (
                  (level.plots ?? []).map((plot) => (
                    <PlotPinsBlock
                      key={`${level.id}-${plot.id}`}
                      plotName={plot.name}
                      pins={plot.pins ?? []}
                      selectedIds={selectedPinIds}
                      drawingFile={level.drawing_file}
                      drawingFileType={level.drawing_file_type}
                      snapshotState={levelSnapshots.get(level.id)}
                      isPinDisabled={isPinDisabled}
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

        {locations.length === 0 && initialJobLevels.length > 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("emptyLoaded")}</p>
        ) : null}

        {loadingMore ? (
          <div className="flex items-center justify-center py-4">
            <span className="animate-pulse text-sm text-slate-500">{t("loadingMore")}</span>
          </div>
        ) : null}
        {hasMorePages ? <div ref={sentinelRef} className="h-6" aria-hidden="true" /> : null}
      </div>

      {previewPinData ? (
        <DrawingPinPreviewModal
          open={previewPinData !== null}
          onClose={() => setPreviewPinData(null)}
          pin={previewPinData.pin}
          plots={previewPinData.plots}
          drawingFile={previewPinData.drawingFile}
          drawingName={previewPinData.drawingName}
        />
      ) : null}
    </div>
  );
}
