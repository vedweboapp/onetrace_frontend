"use client";

import * as React from "react";
import { Crosshair, FileText, Hand, MapPinned, Maximize, SquareDashed, X, ZoomIn, ZoomOut } from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchDrawingDetail, updateDrawingPlots } from "@/features/projects/api/drawing.api";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import { fetchGroup, fetchGroupsPage } from "@/features/groups/api/group.api";
import { fetchPinStatusesPage } from "@/features/pin-status/api/pin-status.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { Group, GroupItemRef } from "@/features/groups/types/group.types";
import type { PinStatus } from "@/features/pin-status/types/pin-status.types";
import type { DrawingPin, DrawingPlot, DrawingPlotUpsert } from "@/features/projects/types/drawing.types";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { AppButton, ConfirmDialog, DetailPanel, SurfaceShell, surfaceInputClassName } from "@/shared/ui";
import { useDashboardSidebarStore } from "@/features/dashboard/store/dashboard-sidebar.store";
import DrawingBottomToolbar from "./drawing-bottom-toolbar";
import PlotToolbar from "./plot-toolbar";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = {
  projectId: number;
  drawingId: number;
};

export type Tool = "pen" | "plot-select" | "pin" | "hand" | "select";

export type LocalPlot = {
  id: number;
  name: string;
  coordinates: number[][];
  pins: DrawingPin[];
  plot_border?: string;
  plot_bg?: string;
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

const PLOT_PALETTE = [
  { border: "#059669", bg: "#0596690D" },  // Green
  { border: "#2563EB", bg: "#2563EB0D" },  // Blue
  { border: "#7C3AED", bg: "#7C3AED0D" },  // Purple
  { border: "#D946EF", bg: "#D946EF0D" },  // Fuchsia
  { border: "#EAB308", bg: "#EAB3080D" },  // Yellow
  { border: "#F97316", bg: "#F973160D" },  // Orange
  { border: "#DC2626", bg: "#DC26260D" },  // Red
];

function distanceToSegment(pt: number[], a: number[], b: number[]): number {
  const dx = (b[0] ?? 0) - (a[0] ?? 0);
  const dy = (b[1] ?? 0) - (a[1] ?? 0);
  if (dx === 0 && dy === 0) return Math.hypot(pt[0] - (a[0] ?? 0), pt[1] - (a[1] ?? 0));
  const t = ((pt[0] - (a[0] ?? 0)) * dx + (pt[1] - (a[1] ?? 0)) * dy) / (dx * dx + dy * dy);
  const tt = Math.max(0, Math.min(1, t));
  return Math.hypot(pt[0] - ((a[0] ?? 0) + tt * dx), pt[1] - ((a[1] ?? 0) + tt * dy));
}

function normalizePlot(p: DrawingPlot): LocalPlot {

  const colorIndex = Math.abs(p.id) % PLOT_PALETTE.length;
  const defaultColor = PLOT_PALETTE[colorIndex]!;

  return {
    id: p.id,
    name: p.name,
    coordinates: Array.isArray(p.coordinates) ? p.coordinates : [],
    pins: Array.isArray(p.pins) ? p.pins : [],
    plot_border: p.plot_border || defaultColor.border,
    plot_bg: p.plot_bg || defaultColor.bg,
  };
}

function segmentsIntersect(a: number[], b: number[], c: number[], d: number[]): boolean {
  const crossProduct = (p1: number[], p2: number[], p3: number[]) =>
    (p2[0] - p1[0]) * (p3[1] - p1[1]) - (p2[1] - p1[1]) * (p3[0] - p1[0]);
  const d1 = crossProduct(c, d, a);
  const d2 = crossProduct(c, d, b);
  const d3 = crossProduct(a, b, c);
  const d4 = crossProduct(a, b, d);
  return (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0)));
}

function doPolygonsIntersect(poly1: number[][], poly2: number[][]): boolean {
  if (!poly1.length || !poly2.length) return false;
  for (let i = 0; i < poly1.length; i++) {
    for (let j = 0; j < poly2.length; j++) {
      if (segmentsIntersect(poly1[i]!, poly1[(i + 1) % poly1.length]!, poly2[j]!, poly2[(j + 1) % poly2.length]!)) return true;
    }
  }
  if (inside(poly1[0]!, poly2)) return true;
  if (inside(poly2[0]!, poly1)) return true;
  return false;
}

function percentToPixel(pt: number[], pageSize: { width: number; height: number }): number[] {
  return [
    Math.round(((pt[0] ?? 0) / 100) * pageSize.width),
    Math.round(((pt[1] ?? 0) / 100) * pageSize.height),
  ];
}

function pixelToPercent(pt: number[], pageSize: { width: number; height: number }): number[] {
  return [
    Number(((pt[0] / pageSize.width) * 100).toFixed(6)),
    Number(((pt[1] / pageSize.height) * 100).toFixed(6)),
  ];
}

function getCentroid(points: number[][]): number[] {
  if (!points.length) return [0, 0];
  const [sx, sy] = points.reduce((acc, p) => [acc[0] + (p[0] ?? 0), acc[1] + (p[1] ?? 0)], [0, 0]);
  return [Math.round(sx / points.length), Math.round(sy / points.length)];
}

function applyStableLocations(plots: LocalPlot[]) {
  let maxLoc = 0;
  for (const p of plots) {
    for (const pin of p.pins) {
      if (pin.location) maxLoc = Math.max(maxLoc, Number(pin.location));
    }
  }
  let fallback = maxLoc > 0 ? maxLoc + 1 : 1;
  for (const p of plots) {
    for (const pin of p.pins) {
      if (!pin.location) {
        pin.location = fallback++;
      }
    }
  }
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

type DetailRowProps = {
  icon: React.ComponentType;
  label: string;
  value: string | number;
  isEditing?: boolean;
  onChange?: (v: string) => void;
  type?: "text" | "select";
  options?: string[] | { value: string | number; label: string }[];
  statusColor?: string;
  statusTextColor?: string;
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
  isEditing = false,
  onChange,
  type = "text",
  options = [],
  statusColor,
  statusTextColor,
}: DetailRowProps) => {
  const strValue = (value === null || value === undefined) ? "" : String(value);
  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50">
      <div className="flex items-center gap-3">
        <div className="text-slate-400">
          <Icon />
        </div>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex-1 flex justify-end">
        {isEditing && onChange ? (
          type === "select" ? (
            <select
              value={strValue}
              onChange={(e) => onChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
            >
              {options.map((opt) => {
                const optVal = typeof opt === "string" ? opt : String(opt.value);
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <option key={optVal} value={optVal}>
                    {optLabel}
                  </option>
                );
              })}
            </select>
          ) : (
            <input
              type="text"
              value={strValue}
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
  const sidebarOpen = useDashboardSidebarStore((s) => s.sidebarOpen);

  const [plotNameDraft, setPlotNameDraft] = React.useState("");
  const [plotColorDraft, setPlotColorDraft] = React.useState(PLOT_PALETTE[0]!);
  const [editingPlotId, setEditingPlotId] = React.useState<number | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [savingPlot, setSavingPlot] = React.useState(false);
  const [savingPin, setSavingPin] = React.useState(false);
  const [savingAll, setSavingAll] = React.useState(false);
  const [drawingName, setDrawingName] = React.useState("");
  const [filePath, setFilePath] = React.useState("");
  const [plots, setPlots] = React.useState<LocalPlot[]>([]);
  const [selectedPlotId, setSelectedPlotId] = React.useState<string>("");
  const [activeTool, setActiveTool] = React.useState<Tool>("select");
  const [dirty, setDirty] = React.useState(false);
  const [zoom, setZoom] = React.useState(0.4);
  const [showVariations, setShowVariations] = React.useState(false);

  const [groups, setGroups] = React.useState<Group[]>([]);
  const [items, setItems] = React.useState<CompositeItem[]>([]);
  const [statuses, setStatuses] = React.useState<PinStatus[]>([]);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
  const [selectedCompositeId, setSelectedCompositeId] = React.useState<string>("");
  const [selectedStatusId, setSelectedStatusId] = React.useState<string>("");
  const [selectedGroupItems, setSelectedGroupItems] = React.useState<GroupItemRef[] | null>(null);

  const [tempPoints, setTempPoints] = React.useState<number[][]>([]);
  const [selectionStart, setSelectionStart] = React.useState<number[] | null>(null);
  const [selectionEnd, setSelectionEnd] = React.useState<number[] | null>(null);
  const [namingPlotOpen, setNamingPlotOpen] = React.useState(false);
  const [plotDetailDraftName, setPlotDetailDraftName] = React.useState("");
  const [detailPlotId, setDetailPlotId] = React.useState<number | null>(null);
  const [detailPin, setDetailPin] = React.useState<DrawingPin | null>(null);
  const [pinEditData, setPinEditData] = React.useState<Partial<DrawingPin>>({});
  const [isPinEditing, setIsPinEditing] = React.useState(false);
  const [hoveredPinId, setHoveredPinId] = React.useState<number | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const [pinDeleteConfirmOpen, setPinDeleteConfirmOpen] = React.useState(false);
  const [abandonPlotConfirmOpen, setAbandonPlotConfirmOpen] = React.useState(false);
  const [pendingTool, setPendingTool] = React.useState<Tool | null>(null);
  const [isLeavingEditor, setIsLeavingEditor] = React.useState(false);
  const [draggingPinId, setDraggingPinId] = React.useState<number | null>(null);
  const [draggingVertex, setDraggingVertex] = React.useState<{ plotId: number, index: number } | null>(null);
  const [dragOffset, setDragOffset] = React.useState({ x: 0, y: 0 });
  const wasDraggingRef = React.useRef(false);
  const originalPinStateRef = React.useRef<{ x: number, y: number, plotId: number } | null>(null);
  const draggingVertexRef = React.useRef<{ plotId: number, index: number } | null>(null);

  const [pageSize, setPageSize] = React.useState({ width: 1200, height: 900 });
  const [panMode, setPanMode] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = React.useState({ left: 0, top: 0 });

  const lastPlacementTimeRef = React.useRef<number>(0);
  const [isQKeyPressed, setIsQKeyPressed] = React.useState(false);
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const stageRef = React.useRef<HTMLDivElement>(null);
  const nameInputRef = React.useRef<HTMLInputElement>(null);
  const lastPinConstraintToastRef = React.useRef(0);


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
    if (!selectedGroupItems || selectedGroupItems.length === 0) return [];
    const selectedItemIds = new Set(selectedGroupItems.map((entry) => entry.item));
    return items.filter((ci) => selectedItemIds.has(ci.id));
  }, [items, selectedGroupId, selectedGroupItems]);
  const compositeOptions = React.useMemo(
    () => {
      if (!selectedGroupId) {
        return [{ value: "", label: t("selectComposite") }, ...items.map((ci) => ({ value: String(ci.id), label: ci.name }))];
      }
      const itemNameById: Record<number, string> = {};
      for (const ci of items) itemNameById[ci.id] = ci.name;
      const uniqueByItem = new Map<number, { value: string; label: string }>();
      for (const entry of selectedGroupItems ?? []) {
        if (uniqueByItem.has(entry.item)) continue;
        uniqueByItem.set(entry.item, {
          value: String(entry.item),
          label: entry.item_name ?? itemNameById[entry.item] ?? `#${entry.item}`,
        });
      }
      const groupScoped = Array.from(uniqueByItem.values());
      return [{ value: "", label: t("selectComposite") }, ...groupScoped];
    },
    [selectedGroupId, items, selectedGroupItems, t],
  );
  const groupLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const g of groups) m[g.id] = g.name;
    return m;
  }, [groups]);
  const compositeLabelById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const ci of items) m[String(ci.id)] = ci.name;
    return m;
  }, [items]);

  const statusLabelById = React.useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of statuses) m[String(s.id)] = s.status_name;
    return m;
  }, [statuses]);

  const loadAllData = React.useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        fetchDrawingDetail(projectId, drawingId),
        fetchGroupsPage(1, 500),
        fetchCompositeItemsPage(1, 500),
        fetchPinStatusesPage(1, 500),
      ]);

      // 1. Drawing Detail (Critical)
      if (results[0].status === "fulfilled") {
        const detail = results[0].value;
        const normalized = (detail.plots ?? []).map(normalizePlot);
        applyStableLocations(normalized);
        setDrawingName(detail.name);
        setFilePath(detail.drawing_file);
        setPlots(normalized);
        setSelectedPlotId((prev) => prev || (normalized[0] ? String(normalized[0].id) : ""));
      } else {
        toastError(t("loadError"));
      }

      // 2. Groups
      if (results[1].status === "fulfilled") {
        setGroups(results[1].value.items);
      }

      // 3. Composite Items
      if (results[2].status === "fulfilled") {
        setItems(results[2].value.items);
      }

      // 4. Pin Statuses
      if (results[3].status === "fulfilled") {
        const statusItems = results[3].value.items;
        setStatuses(statusItems);
        setSelectedStatusId((prev) => prev || (statusItems[0] ? String(statusItems[0].id) : ""));
      }
    } catch {
      toastError(t("loadError"));
    }
  }, [drawingId, projectId, t]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadAllData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadAllData]);

  React.useEffect(() => {
    let cancelled = false;
    if (!selectedGroupId) {
      setSelectedGroupItems(null);
      return;
    }
    (async () => {
      try {
        const groupDetail = await fetchGroup(Number.parseInt(selectedGroupId, 10));
        if (!cancelled) {
          setSelectedGroupItems(groupDetail.items ?? []);
        }
      } catch {
        if (!cancelled) setSelectedGroupItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedGroupId]);

  React.useEffect(() => {
    if (!selectedCompositeId) return;
    const stillExists = compositeOptions.some((opt) => opt.value === selectedCompositeId);
    if (!stillExists) setSelectedCompositeId("");
  }, [compositeOptions, selectedCompositeId]);

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
      if (key === "q") setIsQKeyPressed(true);
      if (key === "v") setActiveTool("select");
      if (key === "p") setActiveTool("pen");
      if (key === "b") setActiveTool("plot-select");
      if (key === "a") setActiveTool("pin");
      if (key === "h") setActiveTool("hand");
      if (key === "+") setZoom((z) => Math.min(3, Number((z + 0.1).toFixed(2))));
      if (key === "-") setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))));
      if (key === "0") setZoom(1);
      if (key === "backspace" && activeTool === "pen") {
        setTempPoints((prev) => prev.slice(0, -1));
      }
    }
    function onKeyUp(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "q") setIsQKeyPressed(false);
    }
    function onBlur() {
      setIsQKeyPressed(false);
      lastPlacementTimeRef.current = 0;
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [activeTool]);

  function requestToolChange(tool: Tool) {
    if (tool !== "hand" && tool !== "pen" && tool !== "plot-select") {
      setEditingPlotId(null);
    }
    if (tempPoints.length > 0 && activeTool === "pen") {
      setPendingTool(tool);
      setIsLeavingEditor(false);
      setAbandonPlotConfirmOpen(true);
    } else {
      setActiveTool(tool);
    }
  }

  function requestClose() {
    if (tempPoints.length > 0 && activeTool === "pen") {
      setIsLeavingEditor(true);
      setPendingTool(null);
      setAbandonPlotConfirmOpen(true);
    } else {
      router.push(`${routes.dashboard.projects}/${projectId}`);
    }
  }

  function confirmAbandonPlot() {
    setTempPoints([]);
    setAbandonPlotConfirmOpen(false);
    if (isLeavingEditor) {
      router.push(`${routes.dashboard.projects}/${projectId}`);
    } else if (pendingTool) {
      if (pendingTool !== "hand" && pendingTool !== "pen" && pendingTool !== "plot-select") {
        setEditingPlotId(null);
      }
      setActiveTool(pendingTool);
    }
  }

  function stagePointFromEvent(e: React.MouseEvent): number[] | null {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const x = Math.max(0, Math.min(Math.round((e.clientX - rect.left) / zoom), pageSize.width));
    const y = Math.max(0, Math.min(Math.round((e.clientY - rect.top) / zoom), pageSize.height));
    return [x, y];
  }


  function onStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (activeTool === "hand" || activeTool === "select" || activeTool === "plot-select") return;
    const pt = stagePointFromEvent(e);
    if (!pt) return;
    if (activeTool === "pen") {
      for (const p of plots) {
        if (p.id === editingPlotId) continue;
        const poly = p.coordinates.map((c) => percentToPixel(c, pageSize));
        if (inside(pt, poly)) {
          toastError("Cannot draw inside another plot");
          return;
        }

        // If we have points, check if the new segment crosses other plots
        const pointsToCompare = editingPlotId
          ? plots.find(pl => pl.id === editingPlotId)?.coordinates.map(c => percentToPixel(c, pageSize))
          : tempPoints;

        if (pointsToCompare && pointsToCompare.length > 0) {
          const last = pointsToCompare[pointsToCompare.length - 1];
          for (let i = 0; i < poly.length; i++) {
            if (segmentsIntersect(last!, pt, poly[i]!, poly[(i + 1) % poly.length]!)) {
              toastError("Line cannot cross another plot boundary");
              return;
            }
          }
        }
      }

      // Check if point is over an existing pin
      const allExistingPins = plots.flatMap((p) =>
        p.pins.map((pin) => ({
          stagePoint: percentToPixel([pin.x_coordinate, pin.y_coordinate], pageSize),
        }))
      );
      for (const pin of allExistingPins) {
        if (Math.hypot(pin.stagePoint[0] - pt[0], pin.stagePoint[1] - pt[1]) < 12) {
          toastError("Cannot place point over an existing pin");
          return;
        }
      }

      const nearIndex = tempPoints.findIndex((p) => Math.hypot((p[0] ?? 0) - pt[0], (p[1] ?? 0) - pt[1]) < 12);
      if (nearIndex >= 0) {
        setTempPoints((prev) => prev.filter((_, idx) => idx !== nearIndex));
        return;
      }

      if (editingPlotId) {
        const pct = pixelToPercent(pt, pageSize);
        setPlots((prev) =>
          prev.map((p) => {
            if (p.id !== editingPlotId) return p;

        
            const coords = p.coordinates.map(c => percentToPixel(c, pageSize));
            let bestIdx = coords.length;
            let minDist = Infinity;

            for (let i = 0; i < coords.length; i++) {
              const d = distanceToSegment(pt, coords[i]!, coords[(i + 1) % coords.length]!);
              if (d < minDist) {
                minDist = d;
                bestIdx = i + 1;
              }
            }

            const nextCoords = [...p.coordinates];
            nextCoords.splice(bestIdx, 0, pct);
            return { ...p, coordinates: nextCoords };
          })
        );
        setDirty(true);
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
    if (activeTool === "hand") {
      const vp = viewportRef.current;
      if (!vp) return;
      setPanMode(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      setScrollStart({ left: vp.scrollLeft, top: vp.scrollTop });
      return;
    }

    if (activeTool === "plot-select") {
      const pt = stagePointFromEvent(e);
      if (pt) { setSelectionStart(pt); setSelectionEnd(pt); }
      return;
    }
  }

  function onPointerMove(e: React.MouseEvent<HTMLDivElement>) {
    const pt = stagePointFromEvent(e);
    if (!pt) {
      if (panMode) {
        const vp = viewportRef.current;
        if (!vp) return;
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        vp.scrollLeft = scrollStart.left - dx;
        vp.scrollTop = scrollStart.top - dy;
      }
      return;
    }

    if (activeTool === "plot-select" && selectionStart) {
      setSelectionEnd(pt);
      return;
    }

    if (activeTool === "pin" && isQKeyPressed && e.buttons === 1) {
      const now = Date.now();
      if (now - lastPlacementTimeRef.current > 200) {
        lastPlacementTimeRef.current = now;
        void placePin(pt);
      }
      return;
    }

    if (panMode) {
      const vp = viewportRef.current;
      if (!vp) return;
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      vp.scrollLeft = scrollStart.left - dx;
      vp.scrollTop = scrollStart.top - dy;
    }
  }

  const draggingPinIdRef = React.useRef<number | null>(null);
  const pageSizeRef = React.useRef(pageSize);
  const plotsRef = React.useRef(plots);
  React.useEffect(() => { pageSizeRef.current = pageSize; }, [pageSize]);
  React.useEffect(() => { plotsRef.current = plots; }, [plots]);
  React.useEffect(() => { draggingPinIdRef.current = draggingPinId; }, [draggingPinId]);
  React.useEffect(() => { draggingVertexRef.current = draggingVertex; }, [draggingVertex]);

  React.useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const pinId = draggingPinIdRef.current;
      const vertex = draggingVertexRef.current;
      if (pinId === null && vertex === null) return;

      const stage = stageRef.current;
      if (!stage) return;
      const rect = stage.getBoundingClientRect();
      const currentZoom = zoom;
      const ps = pageSizeRef.current;
      const x = Math.max(0, Math.min(Math.round((e.clientX - rect.left) / currentZoom), ps.width));
      const y = Math.max(0, Math.min(Math.round((e.clientY - rect.top) / currentZoom), ps.height));
      const currentPlots = plotsRef.current;


      if (!wasDraggingRef.current) {
        wasDraggingRef.current = true;
      }

      if (pinId !== null) {
        // Find the plot this pin belongs to
        const ownerPlot = currentPlots.find(p => p.pins.some(pin => pin.id === pinId));
        if (!ownerPlot) return;

        // RESTRICTION: Pin never leaves its plot
        const poly = ownerPlot.coordinates.map(c => percentToPixel(c, ps));
        if (!inside([x, y], poly)) {
          return; // Stop update if moving outside plot boundary
        }

        const pct = pixelToPercent([x, y], ps);
        setPlots(prev => prev.map(p => ({
          ...p,
          pins: p.pins.map(pin =>
            pin.id === pinId
              ? { ...pin, x_coordinate: pct[0]!, y_coordinate: pct[1]! }
              : pin
          )
        })));
      } else if (vertex !== null) {
        // Validation: Prevent dragging vertex into another plot or crossing boundaries
        const targetPlot = currentPlots.find(p => p.id === vertex.plotId);
        if (targetPlot) {
          const coords = targetPlot.coordinates.map(c => percentToPixel(c, ps));
          const prevIdx = (vertex.index + coords.length - 1) % coords.length;
          const nextIdx = (vertex.index + 1) % coords.length;
          const p1 = coords[prevIdx]!;
          const p2 = coords[nextIdx]!;
          const newPt = [x, y] as [number, number];

          for (const p of currentPlots) {
            if (p.id === vertex.plotId) continue;
            const poly = p.coordinates.map((c) => percentToPixel(c, ps));

            // 1. Point-in-poly check
            if (inside(newPt, poly)) return;

            // 2. Segment intersection check for both connected lines
            for (let i = 0; i < poly.length; i++) {
              const edgeStart = poly[i]!;
              const edgeEnd = poly[(i + 1) % poly.length]!;
              if (segmentsIntersect(p1, newPt, edgeStart, edgeEnd)) return;
              if (segmentsIntersect(newPt, p2, edgeStart, edgeEnd)) return;
            }
          }

          // 3. Pin containment check: Ensure no pin is left outside the transformed boundary
          const nextLogicalCoords = [...targetPlot.coordinates];
          nextLogicalCoords[vertex.index] = pixelToPercent([x, y], ps);
          const nextPolyPixels = nextLogicalCoords.map(c => percentToPixel(c, ps));

          for (const pin of targetPlot.pins) {
            const pinPt = percentToPixel([pin.x_coordinate, pin.y_coordinate], ps);
            if (!inside(pinPt, nextPolyPixels)) {
              const now = Date.now();
              if (now - lastPinConstraintToastRef.current > 2000) {
                toastError("Cannot move boundary: Pin would be outside the plot. Move the pin first or remove it.");
                lastPinConstraintToastRef.current = now;
              }
              return; // Block movement if any pin would be outside
            }
          }
        }



        const pct = pixelToPercent([x, y], ps);
        setPlots(prev => prev.map(p => {
          if (p.id !== vertex.plotId) return p;
          const nextCoords = [...p.coordinates];
          nextCoords[vertex.index] = pct;
          return { ...p, coordinates: nextCoords };
        }));
      }
    }

    function handleMouseUp() {
      const pinId = draggingPinIdRef.current;
      const vertex = draggingVertexRef.current;

      if (pinId !== null) {
        setDraggingPinId(null);
        draggingPinIdRef.current = null;
        setDirty(true);
      }

      if (vertex !== null) {
        setDraggingVertex(null);
        draggingVertexRef.current = null;
        setDirty(true);
      }

      if (pinId !== null || vertex !== null) {
        // Delay resetting wasDraggingRef so the 'click' event can see it
        setTimeout(() => {
          wasDraggingRef.current = false;
        }, 50);
        originalPinStateRef.current = null;
      }
      lastPlacementTimeRef.current = 0;
      setPanMode(false);
    }

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom]);

  function onPointerUp() {
    if (activeTool === "plot-select" && selectionStart && selectionEnd) {
      const [x1, y1] = selectionStart;
      const [x2, y2] = selectionEnd;
      if (Math.abs(x1 - x2) > 4 && Math.abs(y1 - y2) > 4) {
        const box = [
          [x1, y1],
          [x2, y1],
          [x2, y2],
          [x1, y2],
        ];

        // Validate box against existing plots
        for (const p of plots) {
          const poly = p.coordinates.map((c) => percentToPixel(c, pageSize));
          if (doPolygonsIntersect(box, poly)) {
            toastError("This box overlaps with an existing plot");
            setSelectionStart(null);
            setSelectionEnd(null);
            return;
          }
        }

        // Validate box against existing pins
        const allExistingPins = plots.flatMap((p) =>
          p.pins.map((pin) => ({
            stagePoint: percentToPixel([pin.x_coordinate, pin.y_coordinate], pageSize),
          }))
        );
        for (const pin of allExistingPins) {
          if (inside(pin.stagePoint, box)) {
            toastError("New plot cannot overlap existing pins");
            setSelectionStart(null);
            setSelectionEnd(null);
            return;
          }
        }

        setTempPoints(box);
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
      plot_border: p.plot_border,
      plot_bg: p.plot_bg,
      pins: p.pins.map((pin) => ({
        ...(pin.id > 0 ? { id: pin.id } : {}),
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
        status: pin.status ?? undefined,
        group: pin.group ?? null,
        item: pin.item ?? null,
        quantity: pin.quantity || 1,
        variation: pin.variation ?? false,
        location: pinLabels.get(pin.id),
      })),
    }));
  }

  async function persistPlots(localPlots: LocalPlot[]) {
    const updated = await updateDrawingPlots(projectId, drawingId, { plots: toPayload(localPlots) });
    const normalized = (updated.plots ?? []).map(normalizePlot);
    applyStableLocations(normalized);
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

    const percentageCoordinates = tempPoints.map((pt) => pixelToPercent(pt, pageSize));


    const nextPlots = [
      ...plots,
      {
        id: Date.now() * -1,
        name,
        coordinates: percentageCoordinates,
        pins: [],
        plot_border: plotColorDraft.border,
        plot_bg: plotColorDraft.bg
      }
    ];
    setPlots(nextPlots);
    const created = nextPlots.at(-1);
    if (created) setSelectedPlotId(String(created.id));
    setPlotNameDraft("");
    setPlotColorDraft(PLOT_PALETTE[0]!);
    setTempPoints([]);
    setNamingPlotOpen(false);
    setDirty(true);
    toastSuccess(t("plotSaved"));
  }

  async function placePin(point: number[], targetPlot?: LocalPlot) {
    if (!selectedCompositeId) {
      toastError(t("compositeRequired"));
      return;
    }

    let plot = targetPlot ?? selectedPlot;

    // If no plot matches or we are clicking a different one, try to find the actual plot under the point
    const plotUnderPoint = plots.find(p => {
      const poly = p.coordinates.map(c => percentToPixel(c, pageSize));
      return inside(point, poly);
    });

    if (plotUnderPoint) {
      plot = plotUnderPoint;
      if (String(plot.id) !== selectedPlotId) {
        setSelectedPlotId(String(plot.id));
      }
    }

    if (!plot) {
      toastError(t("pinOutsidePlot"));
      return;
    }

    const plotStageCoordinates = plot.coordinates.map((p) => percentToPixel(p, pageSize));
    if (!inside(point, plotStageCoordinates)) {
      toastError(t("pinOutsidePlot"));
      return;
    }

    const selectedStatus = statuses.find((s) => String(s.id) === selectedStatusId);
    if (!selectedStatus) {
      toastError(t("statusRequired"));
      return;
    }

    const selectedItem = items.find(i => String(i.id) === selectedCompositeId);

    const nextPin = {
      x_coordinate: Number(((point[0] / pageSize.width) * 100).toFixed(6)),
      y_coordinate: Number(((point[1] / pageSize.height) * 100).toFixed(6)),
      status: selectedStatus.id,
      variation: showVariations,
      group: selectedGroupId ? Number.parseInt(selectedGroupId, 10) : undefined,
      item: selectedCompositeId ? Number.parseInt(selectedCompositeId, 10) : undefined,
      status_detail: {
        id: selectedStatus.id,
        status_name: selectedStatus.status_name,
        bg_colour: selectedStatus.bg_colour,
        text_colour: selectedStatus.text_colour
      },
      item_detail: selectedItem ? {
        id: selectedItem.id,
        name: selectedItem.name,
        sku: selectedItem.sku || "",
        is_composite: selectedItem.is_composite
      } : null
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

    const nextStatus = statuses.find(s => s.id === (pinEditData.status ?? detailPin.status));
    const nextItem = items.find(i => i.id === (pinEditData.item ?? detailPin.item));

    const updatedPin = {
      ...detailPin,
      ...pinEditData,
      status_detail: nextStatus ? {
        id: nextStatus.id,
        status_name: nextStatus.status_name,
        bg_colour: nextStatus.bg_colour,
        text_colour: nextStatus.text_colour
      } : detailPin.status_detail,
      item_detail: nextItem ? {
        id: nextItem.id,
        name: nextItem.name,
        sku: nextItem.sku || "",
        is_composite: nextItem.is_composite
      } : detailPin.item_detail
    };

    const nextPlots = plots.map((p) => ({
      ...p,
      pins: p.pins.map((pin) => (pin.id === detailPin.id ? updatedPin : pin)),
    }));
    setPlots(nextPlots);
    setDetailPin(updatedPin as DrawingPin);
    setIsPinEditing(false);
    setDirty(true);
    toastSuccess(t("pinSaved"));
  }

  async function saveAllChanges() {
    setSavingAll(true);
    try {
      await persistPlots(plots);
      toastSuccess(t("savedAll"));
      // Refresh all data from API after successful save
      await loadAllData();
    } catch {
      toastError(t("saveAllError"));
    } finally {
      setSavingAll(false);
    }
  }

  const allPins = React.useMemo(() => plots.flatMap((p) => p.pins), [plots]);

  const pinLabels = React.useMemo(() => {
    const map = new Map<number, string | number>();

    // Pass 1: Find the max numeric location to continue numbering
    let maxLoc = 0;
    for (const plot of plots) {
      for (const pin of plot.pins) {
        if (pin.location) {
          const num = Number(pin.location);
          if (!isNaN(num)) maxLoc = Math.max(maxLoc, num);
        }
      }
    }

    let nextCounter = maxLoc + 1;

    // Pass 2: Assign labels
    for (const plot of plots) {
      for (const pin of plot.pins) {
        if (pin.location) {
          map.set(pin.id, pin.location);
        } else {
          map.set(pin.id, nextCounter);
          nextCounter++;
        }
      }
    }

    return map;
  }, [plots]);

  const detailPlot = React.useMemo(
    () => (detailPlotId ? plots.find((p) => p.id === detailPlotId) ?? null : null),
    [detailPlotId, plots],
  );

  const parentPlotOfPin = React.useMemo(() => {
    if (!detailPin) return null;
    return plots.find(p => p.pins.some(pin => pin.id === detailPin.id)) ?? null;
  }, [detailPin, plots]);

  return (
    <div className="flex h-full w-full flex-col space-y-1 pb-2">
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
            <div className="my-4">
              <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                Select Color
              </label>
              <div className="flex flex-wrap gap-2.5">
                {PLOT_PALETTE.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setPlotColorDraft(c);
                      if (detailPlotId) {
                        setPlots((prev) =>
                          prev.map((plot) =>
                            plot.id === detailPlotId
                              ? {
                                ...plot,
                                plot_border: c.border,
                                plot_bg: c.bg,
                              }
                              : plot
                          )
                        );
                        setDirty(true);
                      }
                    }}
                    className={cn(
                      "size-8 rounded-full border-2 transition-all",
                      plotColorDraft.border === c.border
                        ? "scale-110 border-slate-900 shadow-lg dark:border-white"
                        : "border-transparent opacity-60 hover:opacity-100"
                    )}
                    style={{ backgroundColor: c.border }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <AppButton
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => {
                  setNamingPlotOpen(false);
                  setTempPoints([]);
                  setPlotColorDraft(PLOT_PALETTE[0]!);
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

      <div
        className={cn(
          "fixed top-14 right-0 z-40 flex flex-col space-y-3 border-y border-slate-200 bg-white p-3  transition-all dark:border-slate-800 dark:bg-slate-950",
          sidebarOpen ? "md:left-64" : "md:left-[52px]",
          "left-0"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-50">{drawingName || t("title")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-3">
            <AppButton
              type="button"
              size="sm"
              variant="secondary"
              className="h-10 px-6 font-bold border-slate-200 dark:border-slate-800"
              onClick={requestClose}
            >
              {t("close")}
            </AppButton>
            <AppButton
              type="button"
              size="sm"
              variant="primary"
              className="h-10 px-6 font-bold shadow-lg shadow-blue-500/20"
              disabled={!dirty || savingAll}
              loading={savingAll}
              onClick={() => void saveAllChanges()}
            >
              {t("saveAll")}
            </AppButton>
          </div>
        </div>
      </div>

      {/* Header Spacer - matches the height of the fixed top header. Adjust 'h-[64px]' to change the gap below the header. */}
      <div className="h-[64px]" />

      <SurfaceShell className="relative flex-1 overflow-hidden p-0">
        <div className="absolute bottom-10 left-6 z-[60] flex flex-col gap-1">
          <AppButton
            type="button"
            variant="secondary"
            className="size-12 rounded-lg p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setZoom((z) => Math.min(4, Number((z + 0.1).toFixed(2))))}
          >
            <ZoomIn className="size-5" />
          </AppButton>

          <div className="flex h-9 items-center justify-center text-[12px] font-bold text-slate-600 dark:text-slate-400">
            {Math.round(zoom * 100)}%
          </div>

          <AppButton
            type="button"
            variant="secondary"
            className="size-12 rounded-lg p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setZoom((z) => Math.max(0.2, Number((z - 0.1).toFixed(2))))}
          >
            <ZoomOut className="size-5" />
          </AppButton>

          <div className="my-1.5 h-px bg-slate-100 dark:bg-slate-800" />

          <AppButton
            type="button"
            variant="secondary"
            className="size-12 rounded-lg p-0 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setZoom(1)}
          >
            <Maximize className="size-5" />
          </AppButton>
        </div>

        <div
          ref={viewportRef}
          className={cn(
            "relative flex h-[calc(100vh-210px)] min-h-[400px] w-full flex-col overflow-hidden bg-slate-100 p-1 transition-all dark:bg-slate-900/60",
            activeTool === "hand" && "cursor-grab"
          )}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
        >
          {loading ? (
            <div className="flex h-full w-full flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-10 size-20">
                <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-blue-600 border-l-blue-600/30" style={{ animationDuration: "0.8s" }} />
                <div className="absolute inset-2 animate-spin rounded-full border-[3px] border-transparent border-t-blue-400 border-r-blue-400/30" style={{ animationDuration: "1.2s", animationDirection: "reverse" }} />
                <div className="absolute inset-4 flex items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20">
                  <FileText className="size-6 text-blue-600 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 uppercase tracking-widest">{t("loading")}</h3>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 italic">Preparing workspace</p>
              </div>
            </div>
          ) : !normalizedFileUrl ? (
            <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800">
                <X className="size-6 opacity-50" />
              </div>
              <p className="text-sm font-medium">{t("renderUnavailable")}</p>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                minWidth: '100%',
                minHeight: '100%',
                width: 'max-content',
                height: 'max-content',
                justifyContent: 'safe center',
                alignItems: 'safe center',
                padding: '40px'
              }}
            >
              <div
                style={{
                  width: pageSize.width * zoom,
                  height: pageSize.height * zoom,
                  position: "relative"
                }}
              >
                <div
                  ref={stageRef}
                  className="relative select-none shadow-2xl transition-transform duration-200"
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top left",
                    width: pageSize.width,
                    height: pageSize.height,
                    cursor: activeTool === "hand" ? "grab" : activeTool === "pen" ? "crosshair" : activeTool === "pin" ? "crosshair" : activeTool === "plot-select" ? "crosshair" : "default",
                  }}
                  onClick={onStageClick}
                  onMouseDown={onPointerDown}
                  onMouseMove={onPointerMove}
                  onMouseUp={onPointerUp}
                  onDoubleClick={() => {
                    if (activeTool === "pen" && tempPoints.length >= 3) {
                      // Check for overlap with existing plots
                      for (const existing of plots) {
                        if (doPolygonsIntersect(tempPoints, existing.coordinates.map(c => percentToPixel(c, pageSize)))) {
                          toastError("This plot overlaps with an existing one");
                          return;
                        }
                      }

                      // Check if any existing pins are inside this new plot
                      const allExistingPins = plots.flatMap(p => p.pins.map(pin => ({
                        ...pin,
                        stagePoint: percentToPixel([pin.x_coordinate, pin.y_coordinate], pageSize)
                      })));

                      for (const pin of allExistingPins) {
                        if (inside(pin.stagePoint, tempPoints)) {
                          toastError("New plot cannot overlap existing pins");
                          return;
                        }
                      }

                      setNamingPlotOpen(true);
                    }
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
                      const plotPoints = plot.coordinates.map((p) => percentToPixel(p, pageSize));
                      const minX = plotPoints.length ? Math.min(...plotPoints.map((p) => p[0])) : 0;
                      const minY = plotPoints.length ? Math.min(...plotPoints.map((p) => p[1])) : 0;
                      const maxX = plotPoints.length ? Math.max(...plotPoints.map((p) => p[0])) : 0;
                      const maxY = plotPoints.length ? Math.max(...plotPoints.map((p) => p[1])) : 0;
                      const labelX = minX + (maxX - minX) / 2;
                      const labelY = minY + (maxY - minY) / 2;
                      const isSelected = selectedPlotId === String(plot.id);
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
                              fill={plot.plot_bg || "#0596690D"}
                              stroke={plot.plot_border || "#059669"}
                              strokeWidth={isSelected ? 3.5 : 2}
                              strokeDasharray="5 4"
                              className="cursor-pointer transition-all"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTool === "pin") {
                                  const pt = stagePointFromEvent(e);
                                  if (pt) {
                                    setSelectedPlotId(String(plot.id));
                                    void placePin(pt, plot);
                                  }
                                  return;
                                }
                                setSelectedPlotId(String(plot.id));
                                setDetailPin(null);
                                if (editingPlotId !== plot.id) {
                                  setEditingPlotId(null);
                                }
                              }}
                            />
                          ) : plotPoints.length === 2 ? (
                            <line
                              x1={plotPoints[0][0]}
                              y1={plotPoints[0][1]}
                              x2={plotPoints[1][0]}
                              y2={plotPoints[1][1]}
                              stroke={plot.plot_border || "#059669"}
                              strokeWidth={3}
                              className="cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (activeTool === "pin") {
                                  const pt = stagePointFromEvent(e);
                                  if (pt) {
                                    setSelectedPlotId(String(plot.id));
                                    void placePin(pt, plot);
                                  }
                                  return;
                                }
                                setSelectedPlotId(String(plot.id));
                                setDetailPin(null);
                                if (editingPlotId !== plot.id) {
                                  setEditingPlotId(null);
                                }
                              }}
                            />
                          ) : null}
                          {editingPlotId === plot.id && plotPoints.map((pt, idx) => (
                            <circle
                              key={`vertex-${plot.id}-${idx}`}
                              cx={pt[0]}
                              cy={pt[1]}
                              r={8}
                              fill="white"
                              stroke={plot.plot_border || "#059669"}
                              strokeWidth={2}
                              className="cursor-move"
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                if (activeTool === "hand") return;
                                setDraggingVertex({ plotId: plot.id, index: idx });
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (plot.coordinates.length <= 3) {
                                  toastError("Polygon must have at least 3 points");
                                  return;
                                }
                                setPlots(prev => prev.map(p => {
                                  if (p.id !== plot.id) return p;
                                  const nextCoords = [...p.coordinates];
                                  nextCoords.splice(idx, 1);
                                  return { ...p, coordinates: nextCoords };
                                }));
                                setDirty(true);
                              }}
                            />
                          ))}
                          {plotPoints.length >= 3 ? (
                            <g clipPath={`url(#plot-clip-${plot.id})`} className="pointer-events-none opacity-80">
                              <line x1={minX} y1={minY} x2={maxX} y2={maxY} stroke={plot.plot_border || "#059669"} strokeWidth={2.5} />
                              <line x1={maxX} y1={minY} x2={minX} y2={maxY} stroke={plot.plot_border || "#059669"} strokeWidth={2.5} />
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
                  {plots.map((plot) => (
                    <React.Fragment key={`pins-for-plot-${plot.id}`}>
                      {plot.pins.map((pin, index) => {
                        const [pinX, pinY] = percentToPixel([pin.x_coordinate, pin.y_coordinate], pageSize);
                        const statusObj = statuses.find(s => s.id === pin.status);
                        const color = pin.status_detail?.bg_colour || statusObj?.bg_colour || "#10b981";
                        const productName = pin.item_detail?.name || compositeLabelById[pin.item ?? 0] || "PIN";
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
                              transformOrigin: "bottom center",
                              transform: `translate(-50%, -100%) scale(${1 / zoom})`,
                              zIndex: draggingPinId === pin.id ? 200 : isHovered ? 100 : 20,
                              cursor: activeTool === "select" ? (draggingPinId === pin.id ? "grabbing" : "grab") : "pointer",
                            }}
                            onMouseEnter={() => setHoveredPinId(pin.id)}
                            onMouseLeave={() => setHoveredPinId(null)}
                            onMouseDown={(e) => {
                              if (activeTool !== "select") return;
                              e.stopPropagation();
                              e.preventDefault();
                              setDraggingPinId(pin.id);
                              setDragOffset({ x: 0, y: 0 });
                              originalPinStateRef.current = {
                                x: pin.x_coordinate,
                                y: pin.y_coordinate,
                                plotId: plot.id
                              };
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (wasDraggingRef.current) return;

                              setDetailPlotId(null);
                              setDetailPin(pin);
                              setPinEditData(pin);

                              // Pre-populate dropdowns for editing
                              setSelectedGroupId(pin.group ? String(pin.group) : "");
                              setSelectedCompositeId(pin.item ? String(pin.item) : "");
                              setSelectedStatusId(pin.status ? String(pin.status) : "");

                              setIsPinEditing(false);
                            }}
                          >
                            {isHovered && <PinTooltip pin={pin} productName={productName} />}
                            <div className={cn("duration-200 origin-bottom", draggingPinId === pin.id ? "scale-125" : isHovered ? "scale-110" : "", "cursor-grab")}>
                              <PinMarker label={pinLabels.get(pin.id) || (index + 1)} abbreviation={abbreviation} color={color} />
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
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
        title={detailPin ? (pinDeleteConfirmOpen ? "Delete Pin?" : `Location #${pinLabels.get(detailPin.id) || (allPins.findIndex(p => p.id === detailPin.id) + 1)}`) : ""}
        subtitle={detailPin ? (pinDeleteConfirmOpen ? "This action cannot be undone" : (detailPin.item_detail?.name || compositeLabelById[detailPin.item ?? 0] || "Pin Details")) : ""}
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
                    value={isPinEditing
                      ? (pinEditData.item ?? detailPin.item ?? "")
                      : (detailPin.item_detail?.name || compositeLabelById[String(pinEditData.item ?? detailPin.item ?? 0)] || "-")
                    }
                    isEditing={isPinEditing}
                    type="select"
                    options={filteredItems.map(i => ({ value: i.id, label: i.name }))}
                    onChange={(val: string) => {
                      setPinEditData(prev => ({ ...prev, item: parseInt(val) || undefined }));
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
                    value={isPinEditing
                      ? (pinEditData.status ?? detailPin.status ?? "")
                      : (detailPin.status_detail?.status_name || statusLabelById[String(pinEditData.status ?? detailPin.status ?? 0)] || detailPin.status || "")
                    }
                    isEditing={isPinEditing}
                    type="select"
                    options={statuses.map(s => ({ value: s.id, label: s.status_name }))}
                    statusColor={detailPin.status_detail?.bg_colour || statuses.find(s => s.id === (pinEditData.status || detailPin.status))?.bg_colour}
                    statusTextColor={detailPin.status_detail?.text_colour || statuses.find(s => s.id === (pinEditData.status || detailPin.status))?.text_colour}
                    onChange={(val: string) => {
                      const s = statuses.find(st => String(st.id) === val);
                      if (s) setPinEditData(prev => ({ ...prev, status: s.id }));
                    }}
                  />
                  <DetailRow
                    icon={MapPinned}
                    label="Location"
                    value={detailPin.location || pinLabels.get(detailPin.id) || "-"}
                    isEditing={false}
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
                  {/* Variation toggle row */}
                  <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50">
                    <div className="flex items-center gap-3">
                      <div className="text-slate-400">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                      </div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Variation</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={!!(isPinEditing ? pinEditData.variation : detailPin.variation)}
                      disabled={!isPinEditing}
                      onClick={() => {
                        if (isPinEditing) {
                          setPinEditData(prev => ({ ...prev, variation: !prev.variation }));
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${(isPinEditing ? pinEditData.variation : detailPin.variation)
                        ? "bg-blue-600"
                        : "bg-slate-200 dark:bg-slate-700"
                        } ${!isPinEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${(isPinEditing ? pinEditData.variation : detailPin.variation)
                          ? "translate-x-6"
                          : "translate-x-1"
                          }`}
                      />
                    </button>
                  </div>
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

      <ConfirmDialog
        open={abandonPlotConfirmOpen}
        onClose={() => setAbandonPlotConfirmOpen(false)}
        title="Unfinished Plot"
        body="You have an unfinished plot. Do you want to discard it and leave, or stay and complete it?"
        confirmLabel="Discard & Leave"
        cancelLabel="Stay & Complete"
        confirmVariant="danger"
        onConfirm={confirmAbandonPlot}
      />

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

      {selectedPlot && (activeTool === "pen" || activeTool === "plot-select") && (
        <div className={cn(
          "fixed bottom-24 left-0 right-0 z-50 flex justify-center px-6 transition-all",
          sidebarOpen ? "md:left-64" : "md:left-[52px]"
        )}>
          <PlotToolbar
            isEditing={editingPlotId === selectedPlot.id}
            onEditPolygon={() => {
              setEditingPlotId(prev => prev === selectedPlot.id ? null : selectedPlot.id);
            }}
            onRename={() => {
              setDetailPlotId(selectedPlot.id);
              setPlotDetailDraftName(selectedPlot.name);
              setPlotColorDraft({ border: selectedPlot.plot_border || "", bg: selectedPlot.plot_bg || "" });
            }}
            onDelete={() => {
              setDetailPlotId(selectedPlot.id);
              setDeleteConfirmOpen(true);
            }}
          />
        </div>
      )}

      <DrawingBottomToolbar
        t={t}
        plots={plots}
        selectedPlotId={selectedPlotId}
        setSelectedPlotId={setSelectedPlotId}
        selectedGroupId={selectedGroupId}
        setSelectedGroupId={setSelectedGroupId}
        selectedCompositeId={selectedCompositeId}
        setSelectedCompositeId={setSelectedCompositeId}
        groupOptions={groupOptions}
        compositeOptions={compositeOptions}
        activeTool={activeTool}
        setActiveTool={requestToolChange}
        selectedPlot={selectedPlot}
        savingPin={savingPin}
        sidebarOpen={sidebarOpen}
        showVariations={showVariations}
        onToggleVariations={() => setShowVariations(prev => !prev)}
      />
    </div>
  );
}

