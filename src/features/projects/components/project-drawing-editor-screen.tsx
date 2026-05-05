"use client";

import * as React from "react";
import { Crosshair, Hand, MapPinned, SquareDashed, X, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchDrawingDetail, updateDrawingPlots } from "@/features/projects/api/drawing.api";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import { fetchGroupsPage } from "@/features/groups/api/group.api";
import { fetchPinStatusesPage } from "@/features/pin-status/api/pin-status.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { Group } from "@/features/groups/types/group.types";
import type { PinStatus } from "@/features/pin-status/types/pin-status.types";
import type { DrawingPin, DrawingPlot, DrawingPlotUpsert } from "@/features/projects/types/drawing.types";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { AppButton, CheckmarkSelect, DetailPanel, SurfaceShell, surfaceInputClassName } from "@/shared/ui";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  projectId: number;
  drawingId: number;
};

type Tool = "pen" | "plot-select" | "pin" | "hand";

type LocalPlot = {
  id: number;
  name: string;
  coordinates: number[][];
  pins: DrawingPin[];
};

function inside(point: number[], vs: number[][]): boolean {
  const x = point[0];
  const y = point[1];
  let isInside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i]?.[0] ?? 0;
    const yi = vs[i]?.[1] ?? 0;
    const xj = vs[j]?.[0] ?? 0;
    const yj = vs[j]?.[1] ?? 0;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) isInside = !isInside;
  }
  return isInside;
}

function normalizePlot(p: DrawingPlot): LocalPlot {
  return {
    id: p.id,
    name: p.name,
    coordinates: Array.isArray(p.coordinates) ? p.coordinates : [],
    pins: Array.isArray(p.pins) ? p.pins : [],
  };
}

function toStagePoint(pt: number[], pageSize: { width: number; height: number }): number[] {
  const x = pt?.[0] ?? 0;
  const y = pt?.[1] ?? 0;
  if (x >= 0 && x <= 100 && y >= 0 && y <= 100) {
    return [Math.round((x / 100) * pageSize.width), Math.round((y / 100) * pageSize.height)];
  }
  return [x, y];
}

function getCentroid(points: number[][]): number[] {
  if (!points.length) return [0, 0];
  const [sx, sy] = points.reduce((acc, p) => [acc[0] + (p[0] ?? 0), acc[1] + (p[1] ?? 0)], [0, 0]);
  return [Math.round(sx / points.length), Math.round(sy / points.length)];
}

export function ProjectDrawingEditorScreen({ projectId, drawingId }: Props) {
  const t = useTranslations("Dashboard.projects.drawings.editor");
  const router = useRouter();

  const [loading, setLoading] = React.useState(true);
  const [savingPlot, setSavingPlot] = React.useState(false);
  const [savingPin, setSavingPin] = React.useState(false);
  const [savingAll, setSavingAll] = React.useState(false);
  const [drawingName, setDrawingName] = React.useState("");
  const [filePath, setFilePath] = React.useState("");
  const [plots, setPlots] = React.useState<LocalPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = React.useState<string>("");
  const [activeTool, setActiveTool] = React.useState<Tool>("hand");
  const [dirty, setDirty] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [items, setItems] = React.useState<CompositeItem[]>([]);
  const [statuses, setStatuses] = React.useState<PinStatus[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
  const [selectedCompositeId, setSelectedCompositeId] = React.useState<string>("");
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("");

  const [tempPoints, setTempPoints] = React.useState<number[][]>([]);
  const [selectionStart, setSelectionStart] = React.useState<number[] | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<number[] | null>(null);
  const [namingPlotOpen, setNamingPlotOpen] = React.useState(false);
  const [plotNameDraft, setPlotNameDraft] = React.useState("");
  const [plotDetailDraftName, setPlotDetailDraftName] = React.useState("");
  const [detailPlotId, setDetailPlotId] = React.useState<number | null>(null);
  const [detailPin, setDetailPin] = React.useState<DrawingPin | null>(null);

  const [pageSize, setPageSize] = React.useState({ width: 1200, height: 900 });
  const [panMode, setPanMode] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = React.useState({ left: 0, top: 0 });

  const viewportRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  const selectedPlot = React.useMemo(
    () => plots.find((p) => String(p.id) === selectedPlotId) ?? null,
    [plots, selectedPlotId],
  );
  const normalizedFileUrl = React.useMemo(() => resolveDrawingFileUrl(filePath), [filePath]);
  const isPdf = /\.pdf(\?|$)/i.test(filePath) || /\.pdf(\?|$)/i.test(normalizedFileUrl);

  const groupOptions = React.useMemo(
    () => [{ value: "", label: t("allGroups") }, ...groups.map((g) => ({ value: String(g.id), label: g.name }))],
    [groups, t],
  );
  const filteredItems = React.useMemo(() => {
    if (!selectedGroupId) return items;
    return items.filter((ci) => String(ci.group) === selectedGroupId);
  }, [items, selectedGroupId]);
  const compositeOptions = React.useMemo(
    () => [{ value: "", label: t("selectComposite") }, ...filteredItems.map((ci) => ({ value: String(ci.id), label: ci.name }))],
    [filteredItems, t],
  );
  const groupLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const g of groups) m[g.id] = g.name;
    return m;
  }, [groups]);
  const compositeLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const ci of items) m[ci.id] = ci.name;
    return m;
  }, [items]);

  const statusLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of statuses) m[s.id] = s.status_name;
    return m;
  }, [statuses]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detail, groupRes, itemRes, statusRes] = await Promise.all([
          fetchDrawingDetail(projectId, drawingId),
          fetchGroupsPage(1, 500),
          fetchCompositeItemsPage(1, 500),
          fetchPinStatusesPage(1, 500),
        ]);
        if (cancelled) return;
        const normalized = (detail.plots ?? []).map(normalizePlot);
        setDrawingName(detail.name);
        setFilePath(detail.drawing_file);
        setPlots(normalized);
        setGroups(groupRes.items);
        setItems(itemRes.items);
        setStatuses(statusRes.items);
        setSelectedPlotId(normalized[0] ? String(normalized[0].id) : "");
        setSelectedStatusId(statusRes.items[0] ? String(statusRes.items[0].id) : "");
      } catch {
        if (!cancelled) toastError(t("loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drawingId, projectId, t]);

  React.useEffect(() => {
    setSelectedCompositeId("");
  }, [selectedGroupId]);

  React.useEffect(() => {
    if (!namingPlotOpen) return;
    const id = window.setTimeout(() => nameInputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [namingPlotOpen]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) return;
      const key = e.key.toLowerCase();
      if (key === "p") setActiveTool("pen");
      if (key === "b") setActiveTool("plot-select");
      if (key === "z") setActiveTool("pin");
      if (key === "h") setActiveTool("hand");
      if (key === "+") setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))));
      if (key === "-") setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))));
      if (key === "0") setZoom(1);
      if (key === "backspace" && activeTool === "pen") {
        setTempPoints((prev) => prev.slice(0, -1));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeTool]);

  function stagePointFromEvent(e: React.MouseEvent): number[] | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) / zoom);
    const y = Math.round((e.clientY - rect.top) / zoom);
    if (x < 0 || y < 0 || x > pageSize.width || y > pageSize.height) return null;
    return [x, y];
  }

  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "hand" || activeTool === "plot-select") return;
    const pt = stagePointFromEvent(e);
    if (!pt) return;
    if (activeTool === "pen") {
      const nearIndex = tempPoints.findIndex((p) => Math.hypot((p[0] ?? 0) - pt[0], (p[1] ?? 0) - pt[1]) < 12);
      if (nearIndex >= 0) {
        setTempPoints((prev) => prev.filter((_, idx) => idx !== nearIndex));
        return;
      }
      setTempPoints((prev) => [...prev, pt]);
      return;
    }
    if (activeTool === "pin") {
      void placePin(pt);
    }
  }

  function onPointerDown(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "plot-select") {
      const pt = stagePointFromEvent(e);
      if (pt) {
        setSelectionStart(pt);
        setSelectionEnd(pt);
      }
      return;
    }
    if (activeTool !== "hand") return;
    const vp = viewportRef.current;
    if (!vp) return;
    setPanMode(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({ left: vp.scrollLeft, top: vp.scrollTop });
  }

  function onPointerMove(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "plot-select" && selectionStart) {
      const pt = stagePointFromEvent(e);
      if (pt) setSelectionEnd(pt);
      return;
    }
    if (!panMode || activeTool !== "hand") return;
    const vp = viewportRef.current;
    if (!vp) return;
    e.preventDefault();
    vp.scrollLeft = scrollStart.left - (e.clientX - panStart.x);
    vp.scrollTop = scrollStart.top - (e.clientY - panStart.y);
  }

  function onPointerUp() {
    if (activeTool === "plot-select" && selectionStart && selectionEnd) {
      const [x1, y1] = selectionStart;
      const [x2, y2] = selectionEnd;
      if (Math.abs(x1 - x2) > 4 && Math.abs(y1 - y2) > 4) {
        setTempPoints([
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
        ]);
        setNamingPlotOpen(true);
      }
      setSelectionStart(null);
      setSelectionEnd(null);
    }
    setPanMode(false);
  }

  function toPayload(localPlots: LocalPlot[]): DrawingPlotUpsert[] {
    return localPlots.map((p) => ({
      ...(p.id > 0 ? { id: p.id } : {}),
      name: p.name,
      coordinates: p.coordinates,
      pins: p.pins.map((pin) => ({
        ...(pin.id > 0 ? { id: pin.id } : {}),
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
        status: pin.status,
        status_id: pin.status_id,
        group: pin.group ?? null,
        composite_item: pin.composite_item ?? null,
      })),
    }));
  }

  async function persistPlots(localPlots: LocalPlot[]) {
    const updated = await updateDrawingPlots(projectId, drawingId, { plots: toPayload(localPlots) });
    const normalized = (updated.plots ?? []).map(normalizePlot);
    setPlots(normalized);
    setDirty(false);
  }

  async function savePlotFromModal() {
    const name = plotNameDraft.trim();
    if (!name) {
      toastError(t("plotNameRequired"));
      return;
    }
    if (tempPoints.length < 3) {
      toastError(t("plotCoordinatesRequired"));
      return;
    }
    const nextPlots = [...plots, { id: Date.now() * -1, name, coordinates: tempPoints, pins: [] }];
    setPlots(nextPlots);
    const created = nextPlots.at(-1);
    if (created) setSelectedPlotId(String(created.id));
    setPlotNameDraft("");
    setTempPoints([]);
    setNamingPlotOpen(false);
    setDirty(true);
    toastSuccess(t("plotSaved"));
  }

  async function placePin(point: number[]) {
    if (!selectedGroupId) {
      toastError(t("groupRequired"));
      return;
    }
    if (!selectedCompositeId) {
      toastError(t("compositeRequired"));
      return;
    }
    if (!selectedPlot) {
      toastError(t("pinOutsidePlot"));
      return;
    }
    const selectedPlotStageCoordinates = selectedPlot.coordinates.map((p) => toStagePoint(p, pageSize));
    if (!inside(point, selectedPlotStageCoordinates)) {
      toastError(t("pinOutsidePlot"));
      return;
    }
    const selectedStatus = statuses.find((s) => String(s.id) === selectedStatusId);
    if (!selectedStatus) {
      toastError(t("statusRequired"));
      return;
    }

    const nextPin = {
      x_coordinate: point[0],
      y_coordinate: point[1],
      status: selectedStatus.status_name,
      status_id: selectedStatus.id,
      group: Number.parseInt(selectedGroupId, 10),
      composite_item: Number.parseInt(selectedCompositeId, 10),
    };

    const nextPlots = plots.map((p) =>
      p.id === selectedPlot.id ? { ...p, pins: [...p.pins, { id: Date.now() * -1, ...nextPin }] } : p,
    );
    setPlots(nextPlots);
    setDetailPin(null);
    setDetailPlotId(null);
    setDirty(true);
    toastSuccess(t("pinSaved"));
  }

  async function saveSelectedPlotName() {
    if (!detailPlotId) return;
    const nextName = plotDetailDraftName.trim();
    if (!nextName) {
      toastError(t("plotNameRequired"));
      return;
    }
    const nextPlots = plots.map((p) => (p.id === detailPlotId ? { ...p, name: nextName } : p));
    setPlots(nextPlots);
    setDirty(true);
    toastSuccess(t("plotSaved"));
  }

  async function saveAllChanges() {
    setSavingAll(true);
    try {
      await persistPlots(plots);
      toastSuccess(t("savedAll"));
    } catch {
      toastError(t("saveAllError"));
    } finally {
      setSavingAll(false);
    }
  }

  const detailPlot = React.useMemo(
    () => (detailPlotId ? plots.find((p) => p.id === detailPlotId) ?? null : null),
    [detailPlotId, plots],
  );

  return (
    <div className="space-y-4 pb-8">
      {namingPlotOpen ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t("plotNameTitle")}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t("plotNameHint")}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNamingPlotOpen(false);
                  setTempPoints([]);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <input
              ref={nameInputRef}
              value={plotNameDraft}
              onChange={(e) => setPlotNameDraft(e.target.value)}
              placeholder={t("plotNamePlaceholder")}
              className={surfaceInputClassName}
              onKeyDown={(e) => {
                if (e.key === "Enter") void savePlotFromModal();
              }}
            />
            <div className="mt-5 flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setNamingPlotOpen(false);
                  setTempPoints([]);
                }}
              >
                {t("cancel")}
              </AppButton>
              <AppButton type="button" variant="primary" className="flex-1" loading={savingPlot} onClick={() => void savePlotFromModal()}>
                {t("createPlot")}
              </AppButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{drawingName || t("title")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
          </div>
          <AppButton type="button" variant="secondary" size="sm" onClick={() => router.push(`${routes.dashboard.projects}/${projectId}`)}>
            {t("close")}
          </AppButton>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <CheckmarkSelect
            listLabel={`${t("choosePlot")} *`}
            options={plots.map((p) => ({ value: String(p.id), label: p.name }))}
            value={selectedPlotId}
            onChange={setSelectedPlotId}
            emptyLabel={t("choosePlot")}
          />
          <CheckmarkSelect listLabel={`${t("chooseGroup")} *`} options={groupOptions} value={selectedGroupId} onChange={setSelectedGroupId} emptyLabel={t("allGroups")} />
          <CheckmarkSelect listLabel={`${t("chooseComposite")} *`} options={compositeOptions} value={selectedCompositeId} onChange={setSelectedCompositeId} emptyLabel={t("selectComposite")} />

          {[
            { id: "pen", icon: <MapPinned className="size-4" />, label: t("toolPlot") },
            { id: "plot-select", icon: <SquareDashed className="size-4" />, label: t("toolBox") },
            { id: "pin", icon: <Crosshair className="size-4" />, label: t("toolPin"), disabled: !selectedPlot || !selectedGroupId || !selectedCompositeId || savingPin },
            { id: "hand", icon: <Hand className="size-4" />, label: t("toolHand") },
          ].map((tool) => (
            <AppButton
              key={tool.id}
              type="button"
              size="sm"
              variant={activeTool === tool.id ? "primary" : "secondary"}
              disabled={Boolean(tool.disabled)}
              onClick={() => setActiveTool(tool.id as Tool)}
              className={cn(activeTool !== tool.id && "hover:bg-slate-100 dark:hover:bg-slate-800")}
            >
              {tool.icon} {tool.label}
            </AppButton>
          ))}
          <AppButton type="button" size="sm" variant="primary" disabled={!dirty || savingAll} loading={savingAll} onClick={() => void saveAllChanges()}>
            {t("saveAll")}
          </AppButton>
          <AppButton type="button" size="sm" variant="secondary" onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}>
            <ZoomOut className="size-4" />
          </AppButton>
          <AppButton type="button" size="sm" variant="secondary" onClick={() => setZoom(1)}>
            {Math.round(zoom * 100)}%
          </AppButton>
          <AppButton type="button" size="sm" variant="secondary" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))))}>
            <ZoomIn className="size-4" />
          </AppButton>
        </div>
      </div>

      <SurfaceShell className="overflow-hidden p-0">
        <div
          ref={viewportRef}
          className={cn("max-h-[74vh] overflow-auto bg-slate-100 p-6 dark:bg-slate-900/60", activeTool === "hand" && "cursor-grab")}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
        >
          {loading ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">{t("loading")}</p>
          ) : !normalizedFileUrl ? (
            <p className="p-6 text-sm text-slate-500 dark:text-slate-400">{t("renderUnavailable")}</p>
          ) : (
            <div
              ref={stageRef}
              className="relative mx-auto w-fit origin-top-left select-none"
              style={{ transform: `scale(${zoom})` }}
              onClick={onStageClick}
              onMouseDown={onPointerDown}
              onDoubleClick={() => {
                if (activeTool === "pen" && tempPoints.length >= 3) setNamingPlotOpen(true);
              }}
            >
              {isPdf ? (
                <Document file={normalizedFileUrl} onLoadError={() => toastError(t("pdfRenderError"))}>
                  <Page
                    pageNumber={1}
                    scale={1}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                    onLoadSuccess={(page) => {
                      const vp = page.getViewport({ scale: 1 });
                      setPageSize({ width: Math.round(vp.width), height: Math.round(vp.height) });
                    }}
                  />
                </Document>
              ) : (
                <img
                  src={normalizedFileUrl}
                  alt={drawingName}
                  className="block max-w-none rounded-lg"
                  onLoad={(e) => {
                    const el = e.currentTarget;
                    setPageSize({ width: el.naturalWidth, height: el.naturalHeight });
                  }}
                />
              )}

              <svg
                className="absolute left-0 top-0"
                width={pageSize.width}
                height={pageSize.height}
                viewBox={`0 0 ${pageSize.width} ${pageSize.height}`}
              >
                {plots.map((plot) => {
                  const plotPoints = plot.coordinates.map((p) => toStagePoint(p, pageSize));
                  const [labelX, labelY] = getCentroid(plotPoints);
                  const isSelected = selectedPlotId === String(plot.id);
                  const minX = plotPoints.length ? Math.min(...plotPoints.map((p) => p[0])) : 0;
                  const minY = plotPoints.length ? Math.min(...plotPoints.map((p) => p[1])) : 0;
                  const maxX = plotPoints.length ? Math.max(...plotPoints.map((p) => p[0])) : 0;
                  const maxY = plotPoints.length ? Math.max(...plotPoints.map((p) => p[1])) : 0;
                  const labelText = plot.name.length > 24 ? `${plot.name.slice(0, 24)}...` : plot.name;
                  const badgeWidth = Math.max(90, Math.min(220, labelText.length * 7 + 20));
                  return (
                    <g key={plot.id}>
                      <defs>
                        <clipPath id={`plot-clip-${plot.id}`}>
                          <polygon points={plotPoints.map((p) => `${p[0]},${p[1]}`).join(" ")} />
                        </clipPath>
                      </defs>
                      {plotPoints.length >= 3 ? (
                        <polygon
                          points={plotPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
                          fill={isSelected ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.05)"}
                          stroke={isSelected ? "rgb(220,38,38)" : "rgb(5,150,105)"}
                          strokeWidth={2}
                          strokeDasharray="5 4"
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTool === "pin") return;
                            setSelectedPlotId(String(plot.id));
                            setDetailPin(null);
                            setDetailPlotId(plot.id);
                            setPlotDetailDraftName(plot.name);
                          }}
                        />
                      ) : plotPoints.length === 2 ? (
                        <line
                          x1={plotPoints[0][0]}
                          y1={plotPoints[0][1]}
                          x2={plotPoints[1][0]}
                          y2={plotPoints[1][1]}
                          stroke={isSelected ? "rgb(220,38,38)" : "rgb(5,150,105)"}
                          strokeWidth={3}
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (activeTool === "pin") return;
                            setSelectedPlotId(String(plot.id));
                            setDetailPin(null);
                            setDetailPlotId(plot.id);
                            setPlotDetailDraftName(plot.name);
                          }}
                        />
                      ) : null}
                      {isSelected && plotPoints.length >= 3 ? (
                        <g clipPath={`url(#plot-clip-${plot.id})`} className="pointer-events-none">
                          <line x1={minX} y1={minY} x2={maxX} y2={maxY} stroke="rgb(220,38,38)" strokeWidth={1.5} strokeDasharray="5 5" />
                          <line x1={maxX} y1={minY} x2={minX} y2={maxY} stroke="rgb(220,38,38)" strokeWidth={1.5} strokeDasharray="5 5" />
                        </g>
                      ) : null}
                      <g className="pointer-events-none">
                        <rect
                          x={labelX - badgeWidth / 2}
                          y={Math.max(8, labelY - 30)}
                          width={badgeWidth}
                          height={24}
                          rx={12}
                          fill="rgba(15,23,42,0.9)"
                        />
                        <text x={labelX} y={Math.max(24, labelY - 14)} fill="white" fontSize={12} fontWeight={700} textAnchor="middle">
                          {labelText}
                        </text>
                      </g>
                    </g>
                  );
                })}

                {tempPoints.length > 0 ? (
                  <>
                    <polyline
                      points={tempPoints.map((p) => `${p[0]},${p[1]}`).join(" ")}
                      fill="none"
                      stroke="rgb(37,99,235)"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                    />
                    {tempPoints.map((pt, idx) => (
                      <circle key={`pt-${idx}`} cx={pt[0]} cy={pt[1]} r={4} fill="rgb(37,99,235)" stroke="white" strokeWidth={1.5} />
                    ))}
                  </>
                ) : null}

                {activeTool === "plot-select" && selectionStart && selectionEnd ? (
                  <rect
                    x={Math.min(selectionStart[0], selectionEnd[0])}
                    y={Math.min(selectionStart[1], selectionEnd[1])}
                    width={Math.abs(selectionStart[0] - selectionEnd[0])}
                    height={Math.abs(selectionStart[1] - selectionEnd[1])}
                    fill="rgba(59,130,246,0.18)"
                    stroke="rgb(37,99,235)"
                    strokeDasharray="4 3"
                    strokeWidth={2}
                  />
                ) : null}

                {plots.flatMap((plot) => plot.pins).map((pin) => {
                  const [pinX, pinY] = toStagePoint([pin.x_coordinate, pin.y_coordinate], pageSize);
                  const isPersisted = pin.id > 0;
                  return (
                    <circle
                      key={`pin-${pin.id}`}
                      cx={pinX}
                      cy={pinY}
                      r={6}
                      fill="rgb(239 68 68)"
                      stroke="white"
                      strokeWidth={2}
                      className={cn("transition", isPersisted && activeTool !== "pin" ? "cursor-pointer" : "cursor-default")}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeTool === "pin") return;
                        if (!isPersisted) return;
                        setDetailPlotId(null);
                        setDetailPin(pin);
                      }}
                    />
                  );
                })}
              </svg>
            </div>
          )}
        </div>
      </SurfaceShell>

      <DetailPanel
        open={detailPin !== null || detailPlot !== null}
        onClose={() => {
          setDetailPin(null);
          setDetailPlotId(null);
        }}
        title={detailPin ? `${t("pin")} #${detailPin.id}` : detailPlot ? detailPlot.name : t("pin")}
        subtitle={detailPin?.status ?? (detailPlot ? t("plotSection") : undefined)}
      >
        {detailPlot ? (
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("plotNamePlaceholder")}</p>
              <input value={plotDetailDraftName} onChange={(e) => setPlotDetailDraftName(e.target.value)} className={surfaceInputClassName} />
              <AppButton type="button" variant="primary" size="sm" loading={savingPlot} onClick={() => void saveSelectedPlotName()}>
                {t("savePlot")}
              </AppButton>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-slate-500 dark:text-slate-400">{t("pointsCount", { count: detailPlot.coordinates.length })}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPlot.coordinates.length}</span>
              <span className="text-slate-500 dark:text-slate-400">{t("pinSection")}</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPlot.pins.length}</span>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Coordinates</p>
              <div className="max-h-32 overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs dark:border-slate-700 dark:bg-slate-900/60">
                {detailPlot.coordinates.map((c, idx) => (
                  <div key={`coord-${idx}`} className="font-mono text-slate-700 dark:text-slate-200">
                    {idx + 1}. [{c[0]}, {c[1]}]
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Pins</p>
              {detailPlot.pins.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">No pins in this plot.</p>
              ) : (
                <div className="max-h-48 space-y-2 overflow-auto">
                  {detailPlot.pins.map((pin) => (
                    <div key={`plot-pin-${pin.id}`} className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700">
                      <div className="grid grid-cols-[68px_1fr] gap-1">
                        <span className="text-slate-500 dark:text-slate-400">Pin</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">#{pin.id > 0 ? pin.id : "new"}</span>
                        <span className="text-slate-500 dark:text-slate-400">X / Y</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {pin.x_coordinate}, {pin.y_coordinate}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Group</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {pin.group ? (groupLabelById[pin.group] ?? `#${pin.group}`) : "—"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Product</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {pin.composite_item ? (compositeLabelById[pin.composite_item] ?? `#${pin.composite_item}`) : "—"}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">Status</span>
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {pin.status_id ? (statusLabelById[pin.status_id] ?? pin.status) : pin.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
        {detailPin ? (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-slate-500 dark:text-slate-400">X</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPin.x_coordinate}</span>
              <span className="text-slate-500 dark:text-slate-400">Y</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPin.y_coordinate}</span>
              <span className="text-slate-500 dark:text-slate-400">Status</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPin.status}</span>
              <span className="text-slate-500 dark:text-slate-400">Group</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">{detailPin.group ? (groupLabelById[detailPin.group] ?? `#${detailPin.group}`) : "—"}</span>
              <span className="text-slate-500 dark:text-slate-400">Composite item</span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {detailPin.composite_item ? (compositeLabelById[detailPin.composite_item] ?? `#${detailPin.composite_item}`) : "—"}
              </span>
            </div>
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
}

