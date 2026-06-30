"use client";

import {
  AppButton,
  CheckmarkSelect,
  ListPageEmptyStates,
  ListPageSearchField,
} from "@/shared/ui";
import { useTranslations } from "next-intl";
import { fetchLocation as fetchLocationApi } from "@/features/projects/api/project.api";
import type { Drawing, DrawingPin } from "@/features/projects/types/drawing.types";
import { useParams } from "next/navigation";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { ListEmptyStateKind } from "@/shared/hooks/use-list-active-inactive-empty";
import { Dialog } from "@base-ui/react";

const PIN_TABLE_GRID =
  "grid w-full max-w-full grid-cols-[1.5rem_6rem_minmax(0,1.5fr)_minmax(0,1.8fr)_5rem_8rem] items-center gap-x-3 sm:gap-x-4";

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
  className,
}: {
  ids: number[];
  selectedIds: Set<number>;
  onToggle: (ids: number[]) => void;
  className?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  const state = getSelectionState(ids, selectedIds);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = state === "partial";
    }
  }, [state]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-900 cursor-pointer accent-[color:var(--dash-accent,#f97316)]",
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
  return (
    <div className={PIN_TABLE_HEADER_CLASS}>
      <span aria-hidden />
      <span>Pin ID</span>
      <span>Product</span>
      <span>Description</span>
      <span>Quantity</span>
      <span>Status</span>
    </div>
  );
}

function ProjectPinRow({
  pin,
  selected,
  onToggle,
}: {
  pin: DrawingPin;
  selected: boolean;
  onToggle: () => void;
}) {
  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const sku = pin.item_detail?.sku;

  return (
    <div className={cn(PIN_TABLE_ROW_CLASS, "hover:bg-slate-50/90 dark:hover:bg-slate-800/30")}>
      <input
        type="checkbox"
        className="h-3.5 w-3.5 shrink-0 cursor-pointer rounded-[3px] border-slate-300 accent-[color:var(--dash-accent,#f97316)] dark:border-slate-600 dark:bg-slate-900"
        checked={selected}
        onChange={onToggle}
      />
      <span className="font-semibold text-slate-500">#{pin.id}</span>
      <div className="flex flex-col min-w-0">
        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">{productName}</span>
        {sku && <span className="text-xs text-slate-400 truncate">{sku}</span>}
      </div>
      <span className="text-xs text-slate-500 dark:text-slate-400 truncate" title={pin.description || undefined}>
        {pin.description || "—"}
      </span>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{pin.quantity ?? 1}</span>
      <div>
        <PinStatusChip pin={pin} />
      </div>
    </div>
  );
}

function PlotPinsBlock({
  plotName,
  pins,
  selectedIds,
  onTogglePlot,
  onTogglePin,
}: {
  plotName: string;
  pins: DrawingPin[];
  selectedIds: Set<number>;
  onTogglePlot: (ids: number[]) => void;
  onTogglePin: (id: number) => void;
}) {
  const pinIds = useMemo(() => pins.map((p) => p.id), [pins]);

  return (
    <div className="max-w-full overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-950/30">
      <div className="flex items-center gap-2.5 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-4 py-3 dark:border-slate-800 dark:from-slate-900/80 dark:to-slate-950/40">
        <GroupCheckbox
          ids={pinIds}
          selectedIds={selectedIds}
          onToggle={onTogglePlot}
        />
        <Layers className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{plotName}</span>
        <span className="ml-auto shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {pins.length === 1 ? "1 Pin" : `${pins.length} Pins`}
        </span>
      </div>
      <div className="min-w-0 max-w-full overflow-hidden">
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
                  onToggle={() => onTogglePin(pin.id)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const ProjectPinsListTab = () => {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<number | undefined>();
  const [plotFilter, setPlotFilter] = useState<number | undefined>();
  const [locations, setLocations] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());

  const t = useTranslations("Dashboard.projects.location");

  const loadLocation = useCallback(async (): Promise<void> => {
    setLoading(true);
    setLoadError(null);
    try {
      if (id) {
        const response = await fetchLocationApi(id);
        setLocations(response);
      }
    } catch (e) {
      console.error(e);
      setLoadError(
        typeof e === "object" && e && "message" in e
          ? String(e.message)
          : "Failed to load locations",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

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
              const productName = (pin.item_detail?.name || pin.group_detail?.name || "").toLowerCase();
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

        const finalPlots = searchActive ? plots.filter((p) => p.pins.length > 0) : plots;
        return { ...level, plots: finalPlots };
      })
      .filter((level) => {
        if (searchActive) return level.plots.length > 0;
        return true;
      });
  }, [locations, search, levelFilter, plotFilter]);

  const levelOptions = useMemo(() => {
    return locations.map((level) => ({
      value: String(level.id),
      label: level.name,
    }));
  }, [locations]);

  const plotOptions = useMemo(() => {
    const source = levelFilter != null ? locations.filter((l) => l.id === levelFilter) : locations;
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

  const allPinIds = useMemo(() => {
    return filteredLocations.flatMap((level) =>
      level.plots.flatMap((plot) => plot.pins.map((pin) => pin.id)),
    );
  }, [filteredLocations]);

  const allSelected = allPinIds.length > 0 && allPinIds.every((pinId) => selectedIds.has(pinId));

  const handleSelectAllToggle = useCallback(() => {
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const pinId of allPinIds) {
          next.delete(pinId);
        }
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const pinId of allPinIds) {
          next.add(pinId);
        }
        return next;
      });
    }
  }, [allPinIds, allSelected]);

  const handleToggleGroup = useCallback((ids: number[]) => {
    setSelectedIds((prev) => toggleSelection(ids, prev));
  }, []);

  const handleTogglePin = useCallback((pinId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(pinId)) {
        next.delete(pinId);
      } else {
        next.add(pinId);
      }
      return next;
    });
  }, []);

  const hasActiveFilters = search.trim() !== "" || levelFilter != null || plotFilter != null;

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

  return (
    <div className="min-w-0 divide-y divide-slate-100 dark:divide-slate-800">
      {
        dialogVisible && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-99">
            <div className="bg-white p-6 rounded-lg">
              <h2 className="text-lg font-semibold">Create Job</h2>
              <p className="mt-2">Are you sure you want to create a job for the selected pins?</p>
              <div className="mt-4 flex justify-end gap-2">
                <AppButton
                  onClick={() => setDialogVisible(false)}
                  size="lg"
                  variant="secondary"
                >
                  Cancel
                </AppButton>
                <AppButton
                  onClick={() => setDialogVisible(false)}
                  size="lg"
                  variant="primary"
                >
                  Create Job
                </AppButton>
              </div>
            </div>
          </div>
        )
      }
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
          onCommit={setSearch}
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
          onChange={(v) => setPlotFilter(v ? Number.parseInt(v, 10) : undefined)}
        />
        {
          selectedIds.size > 0 && (
            <AppButton
              variant="primary"
              size="lg"
              onClick={() => setDialogVisible(true)}
            >
              Create Job
            </AppButton>
          )
        }
        {console.log("the slected ids", selectedIds)}
        {allPinIds.length > 0 && (
          <AppButton
            variant="primary"
            size="lg"
            onClick={handleSelectAllToggle}
            className=""
          >
            <span>{allSelected ? "Deselect All" : "Select All"}</span>
          </AppButton>
        )}
      </div>

      <div>
        {loadError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">
            {loadError}
          </p>
        ) : loading ? (
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
              title: "No locations yet",
              description: "No locations or blueprints have been added to this project yet.",
              action: null,
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <div className="space-y-8 px-4 py-4 sm:px-6 sm:py-6">
            {filteredLocations.map((level) => {
              const levelPinIds = level.plots.flatMap((p) => p.pins.map((pin) => pin.id));

              return (
                <section key={level.id} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GroupCheckbox
                      ids={levelPinIds}
                      selectedIds={selectedIds}
                      onToggle={handleToggleGroup}
                    />
                    <span
                      className="h-4 w-1 rounded-full bg-[color:var(--dash-accent,#f97316)]"
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
                          plotName={plot.name}
                          pins={plot.pins}
                          selectedIds={selectedIds}
                          onTogglePlot={handleToggleGroup}
                          onTogglePin={handleTogglePin}
                        />
                      ))
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPinsListTab;
