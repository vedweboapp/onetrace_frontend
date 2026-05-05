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

// ─── Pin Components ──────────────────────────────────────────────────────────
type PinMarkerProps = {
  label: string | number;
  abbreviation?: string;
  color?: string;
};

const PinMarker = ({ label, abbreviation, color = "#10b981" }: PinMarkerProps) => (
  <svg width="40" height="46" viewBox="0 0 40 46" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.2))" }}>
    <defs>
      <path id="textCurve" d="M 10 25 A 10 10 0 0 1 30 25" />
    </defs>
    <circle cx="20" cy="20" r="18" fill="white" stroke={color} strokeWidth="3.5" />
    <text fontSize="7.5" fontWeight="800" fontFamily="Inter, sans-serif" fill={color}>
      <textPath href="#textCurve" startOffset="50%" textAnchor="middle">
        {abbreviation || "PIN"}
      </textPath>
    </text>
    <path d="M20 44L17 37H23L20 44Z" fill={color} />
    <text x="20" y="31" textAnchor="middle" fill={color} fontSize="15" fontWeight="bold" fontFamily="Inter, sans-serif">
      {label}
    </text>
  </svg>
);

const PinTooltip = ({ pin, productName, quantity = 1 }: { pin: DrawingPin; productName: string; quantity?: number }) => (
  <div className="pointer-events-none absolute z-50" style={{ bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: "10px" }}>
    <div className="whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-xl">
      <span>{productName}</span>
      <span className="ml-1.5 opacity-80 text-slate-400">| {quantity} Unit</span>
    </div>
    <div className="absolute left-1/2 top-full h-2.5 w-2.5 -translate-x-1/2 -mt-1.5 rotate-45 bg-slate-900" />
  </div>
);

// ─── Pin Detail Icons ────────────────────────────────────────────────────────
const PackageIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <polyline points="3.29 7 12 12 20.71 7" />
    <line x1="12" y1="22" x2="12" y2="12" />
  </svg>
);

const QuantityIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <line x1="8" y1="12" x2="16" y2="12" />
    <line x1="12" y1="8" x2="12" y2="16" />
  </svg>
);

const StatusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
  </svg>
);

const BlockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const LevelIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

const DetailRow = ({ icon: Icon, label, value, isEditing, onChange, type = "text", options = [], statusColor, statusTextColor }: any) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">
          <Icon />
        </div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex-1 flex justify-end">
        {isEditing ? (
          type === "select" ? (
            <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              {options.map((opt: string) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            />
          )
        ) : label === "Status" && statusColor ? (
          <div 
            className="flex items-center gap-2 rounded-lg px-2.5 py-1 text-[11px] font-bold"
            style={{ backgroundColor: statusColor, color: statusTextColor || "#fff" }}
          >
            <CheckCircleIcon />
            {value}
          </div>
        ) : (
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{value}</span>
        )}
      </div>
    </div>
  );
};

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
  const [pinEditData, setPinEditData] = React.useState<Partial<DrawingPin>>({});
  const [isPinEditing, setIsPinEditing] = React.useState(false);
  const [hoveredPinId, setHoveredPinId] = React.useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [pinDeleteConfirmOpen, setPinDeleteConfirmOpen] = React.useState(false);

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
        status: pin.status_id,
        group: pin.group ?? null,
        composite_item: pin.composite_item ?? null,
        quantity: pin.quantity || 1,
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

    const percentageCoordinates = tempPoints.map((pt) => [
      Number(((pt[0] / pageSize.width) * 100).toFixed(6)),
      Number(((pt[1] / pageSize.height) * 100).toFixed(6)),
    ]);

    const nextPlots = [...plots, { id: Date.now() * -1, name, coordinates: percentageCoordinates, pins: [] }];
    setPlots(nextPlots);
    const created = nextPlots.at(-1);
    if (created) setSelectedPlotId(String(created.id));
    setPlotNameDraft("");
    setTempPoints([]);
    setNamingPlotOpen(false);
    setDirty(true);
    toastSuccess(t("plotSaved"));
  }

  async function placePin(point: number[], targetPlot?: LocalPlot) {
    if (!selectedGroupId) {
      toastError(t("groupRequired"));
      return;
    }
    if (!selectedCompositeId) {
      toastError(t("compositeRequired"));
      return;
    }

    const plot = targetPlot ?? selectedPlot;

    if (!plot) {
      toastError(t("pinOutsidePlot"));
      return;
    }

    const plotStageCoordinates = plot.coordinates.map((p) => toStagePoint(p, pageSize));
    if (!inside(point, plotStageCoordinates)) {
      toastError(t("pinOutsidePlot"));
      return;
    }
    const selectedStatus = statuses.find((s) => String(s.id) === selectedStatusId);
    if (!selectedStatus) {
      toastError(t("statusRequired"));
      return;
    }

    const nextPin = {
      x_coordinate: Number(((point[0] / pageSize.width) * 100).toFixed(6)),
      y_coordinate: Number(((point[1] / pageSize.height) * 100).toFixed(6)),
      status: selectedStatus.status_name,
      status_id: selectedStatus.id,
      group: Number.parseInt(selectedGroupId, 10),
      composite_item: Number.parseInt(selectedCompositeId, 10),
    };

    const nextPlots = plots.map((p) =>
      p.id === plot.id ? { ...p, pins: [...p.pins, { id: Date.now() * -1, ...nextPin }] } : p,
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
    setDetailPlotId(null);
    setDirty(true);
    toastSuccess(t("plotSaved"));
  }

  async function deletePlot(id: number) {
    const nextPlots = plots.filter((p) => p.id !== id);
    setPlots(nextPlots);
    setDetailPlotId(null);
    setDeleteConfirmOpen(false);
    setDirty(true);
    toastSuccess("Plot deleted");
  }

  async function deletePin(pinId: number) {
    const nextPlots = plots.map((p) => ({
      ...p,
      pins: p.pins.filter((pin) => pin.id !== pinId),
    }));
    setPlots(nextPlots);
    setDetailPin(null);
    setPinDeleteConfirmOpen(false);
    setDirty(true);
    toastSuccess("Pin deleted");
  }

  async function savePinChanges() {
    if (!detailPin) return;
    const nextPlots = plots.map((p) => ({
      ...p,
      pins: p.pins.map((pin) => (pin.id === detailPin.id ? { ...pin, ...pinEditData } : pin)),
    }));
    setPlots(nextPlots);
    // @ts-ignore
    setDetailPin({ ...detailPin, ...pinEditData });
    setIsPinEditing(false);
    setDirty(true);
    toastSuccess(t("pinSaved"));
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

  const allPins = React.useMemo(() => plots.flatMap((p) => p.pins), [plots]);

  const detailPlot = React.useMemo(
    () => (detailPlotId ? plots.find((p) => p.id === detailPlotId) ?? null : null),
    [detailPlotId, plots],
  );

  const parentPlotOfPin = React.useMemo(() => {
    if (!detailPin) return null;
    return plots.find(p => p.pins.some(pin => pin.id === detailPin.id)) ?? null;
  }, [detailPin, plots]);

  return (
    <div className="w-full space-y-4 pb-8">
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
          className={cn("max-h-[74vh] w-full overflow-auto bg-slate-100 p-1 dark:bg-slate-900/60", activeTool === "hand" && "cursor-grab")}
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
                className="absolute p-3 left-0 top-0"
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
                            if (activeTool === "pin") {
                              const pt = stagePointFromEvent(e);
                              if (pt) {
                                setSelectedPlotId(String(plot.id));
                                void placePin(pt, plot);
                              }
                              return;
                            }
                            e.stopPropagation();
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
                            if (activeTool === "pin") {
                              const pt = stagePointFromEvent(e);
                              if (pt) {
                                setSelectedPlotId(String(plot.id));
                                void placePin(pt, plot);
                              }
                              return;
                            }
                            e.stopPropagation();
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
              </svg>

              {/* Pins Layer */}
              {plots.flatMap((plot) => plot.pins).map((pin, index) => {
                const [pinX, pinY] = toStagePoint([pin.x_coordinate, pin.y_coordinate], pageSize);
                const isPersisted = pin.id > 0;
                const statusObj = statuses.find(s => s.id === pin.status_id);
                const color = "#10b981";
                const productName = compositeLabelById[pin.composite_item ?? 0] || "PIN";
                const abbreviation = productName
                  .split(/[\s()]+/)
                  .filter(Boolean)
                  .map((word) => word[0])
                  .join("")
                  .slice(0, 3)
                  .toUpperCase();
                const isHovered = hoveredPinId === pin.id;

                return (
                  <div
                    key={`pin-${pin.id}`}
                    className="absolute"
                    style={{
                      left: pinX,
                      top: pinY,
                      transform: "translate(-50%, -100%)",
                      zIndex: isHovered ? 100 : 20,
                    }}
                    onMouseEnter={() => setHoveredPinId(pin.id)}
                    onMouseLeave={() => setHoveredPinId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailPlotId(null);
                      setDetailPin(pin);
                      setPinEditData(pin);
                      setIsPinEditing(false);
                    }}
                  >
                    {isHovered && <PinTooltip pin={pin} productName={productName} />}
                    <div className={cn("transition-transform duration-200", isHovered && "scale-110", "cursor-pointer")}>
                      <PinMarker label={index + 1} abbreviation={abbreviation} color={color} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SurfaceShell>

      <DetailPanel
        open={detailPin !== null}
        onClose={() => {
          setDetailPin(null);
          setIsPinEditing(false);
          setPinDeleteConfirmOpen(false);
        }}
        title={detailPin ? (pinDeleteConfirmOpen ? "Delete Pin?" : `Location #${allPins.findIndex(p => p.id === detailPin.id) + 1}`) : ""}
        subtitle={detailPin ? (pinDeleteConfirmOpen ? "This action cannot be undone" : (compositeLabelById[detailPin.composite_item ?? 0] || "Pin Details")) : ""}
        action={
          detailPin && !pinDeleteConfirmOpen && (
            <div className="flex items-center gap-2 pr-1">
              {isPinEditing ? (
                <>
                  <button
                    onClick={() => setIsPinEditing(false)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void savePinChanges()}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all shadow-md shadow-blue-100 dark:shadow-none"
                  >
                    Save
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsPinEditing(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
          )
        }
      >
        {detailPin ? (
          pinDeleteConfirmOpen ? (
            <div className="flex flex-col items-center justify-center h-full py-10 text-center">
              <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Are you sure?</h3>
              <p className="mt-2 text-sm text-slate-500 max-w-[240px]">
                Removing this pin will delete all associated equipment data for this location.
              </p>
              <div className="mt-10 flex flex-col w-full gap-3">
                <button
                  onClick={() => void deletePin(detailPin.id)}
                  className="w-full rounded-xl bg-red-600 py-3.5 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-lg shadow-red-100 dark:shadow-none"
                >
                  Yes, delete pin
                </button>
                <button
                  onClick={() => setPinDeleteConfirmOpen(false)}
                  className="w-full rounded-xl py-3.5 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                >
                  No, keep it
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Details</h3>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  <DetailRow
                    icon={PackageIcon}
                    label="Product Name"
                    value={compositeLabelById[detailPin.composite_item ?? 0] || "-"}
                    isEditing={isPinEditing}
                    type="select"
                    options={filteredItems.map(i => i.name)}
                    onChange={(val: string) => {
                      const item = filteredItems.find(i => i.name === val);
                      if (item) setPinEditData(prev => ({ ...prev, composite_item: item.id }));
                    }}
                  />
                  <DetailRow
                    icon={QuantityIcon}
                    label="Quantity"
                    value={pinEditData.quantity || 1}
                    isEditing={isPinEditing}
                    onChange={(val: string) => setPinEditData(prev => ({ ...prev, quantity: parseInt(val) || 1 }))}
                  />
                  <DetailRow
                    icon={StatusIcon}
                    label="Status"
                    value={statusLabelById[detailPin.status_id ?? 0] || detailPin.status}
                    isEditing={isPinEditing}
                    type="select"
                    options={statuses.map(s => s.status_name)}
                    statusColor={statuses.find(s => s.id === (pinEditData.status_id || detailPin.status_id))?.bg_colour}
                    statusTextColor={statuses.find(s => s.id === (pinEditData.status_id || detailPin.status_id))?.text_colour}
                    onChange={(val: string) => {
                      const s = statuses.find(st => st.status_name === val);
                      if (s) setPinEditData(prev => ({ ...prev, status_id: s.id, status: s.status_name }));
                    }}
                  />
                  <DetailRow
                    icon={BlockIcon}
                    label="Plot"
                    value={parentPlotOfPin?.name || "N/A"}
                    isEditing={false}
                  />
                  <DetailRow
                    icon={LevelIcon}
                    label="Level"
                    value={drawingName || "N/A"}
                    isEditing={false}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</h3>
                <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">X Coordinate</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{detailPin.x_coordinate.toFixed(2)}%</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-medium text-slate-400 uppercase">Y Coordinate</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{detailPin.y_coordinate.toFixed(2)}%</p>
                  </div>
                </div>
              </div>

              {!isPinEditing && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60">
                  <button
                    onClick={() => setPinDeleteConfirmOpen(true)}
                    className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Delete Pin
                  </button>
                </div>
              )}
            </div>
          )
        ) : null}
      </DetailPanel>

      {detailPlotId && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            {deleteConfirmOpen ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Delete Plot?</h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  This will permanently remove this plot and all equipment pins inside it. This action cannot be undone.
                </p>
                <div className="mt-8 flex flex-col gap-2">
                  <button
                    onClick={() => void deletePlot(detailPlotId)}
                    className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-colors shadow-lg shadow-red-100 dark:shadow-none"
                  >
                    Yes, delete plot
                  </button>
                  <button
                    onClick={() => setDeleteConfirmOpen(false)}
                    className="w-full rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    No, keep it
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Edit Plot</h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Rename or remove this plot from the drawing.</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 uppercase">Plot name</label>
                    <input
                      value={plotDetailDraftName}
                      onChange={(e) => setPlotDetailDraftName(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
                      placeholder="e.g. Room A"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <button
                      onClick={() => setDetailPlotId(null)}
                      className="w-full rounded-xl py-3 text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => void saveSelectedPlotName()}
                      className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 transition-colors"
                    >
                      Save
                    </button>
                  </div>

                  <button
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="w-full rounded-xl bg-red-50 py-3 text-sm font-bold text-red-600 hover:bg-red-100 transition-colors"
                  >
                    Delete Plot & Pins
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

