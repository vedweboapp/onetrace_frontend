"use client";

import * as React from "react";
import { Document, Page } from "react-pdf";
import { useTranslations } from "next-intl";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { resolvePinMarkerAbbreviation } from "@/features/projects/utils/drawing-pin-display.util";
import type { DrawingPin, DrawingPlot, DrawingPinAttachment, DrawingPlotUpsert } from "@/features/projects/types/drawing.types";
import { AppModal, AppButton } from "@/shared/ui";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { Loader2, MapPinned, LayoutGrid, FileText, Paperclip, X, Download } from "lucide-react";
import { fetchDrawingDetail, updateDrawingPlots } from "@/features/projects/api/drawing.api";
import { fetchCompositeItemsPage } from "@/features/composite-items/api/composite-item.api";
import { fetchPinStatusesPage } from "@/features/pin-status/api/pin-status.api";
import { fetchProjectFormsPage } from "@/features/projects/api/project.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { PinStatus } from "@/features/pin-status/types/pin-status.types";
import type { FormListItem } from "@/features/forms/types/form.types";
import "@/shared/utils/pdfjs-worker";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

const PLOT_PALETTE = [
  { border: "#059669", bg: "#0596690D" },  // Green
  { border: "#2563EB", bg: "#2563EB0D" },  // Blue
  { border: "#7C3AED", bg: "#7C3AED0D" },  // Purple
  { border: "#D946EF", bg: "#D946EF0D" },  // Fuchsia
  { border: "#EAB308", bg: "#EAB3080D" },  // Yellow
  { border: "#F97316", bg: "#F973160D" },  // Orange
  { border: "#DC2626", bg: "#DC26260D" },  // Red
];

// ΓöÇΓöÇΓöÇ Pin Detail Icons ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 max-w-[200px] text-slate-900 dark:text-slate-100"
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
              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-right text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 w-16"
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
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 text-right">{value}</span>
        )}
      </div>
    </div>
  );
};

function percentToPixel(pt: number[], pageSize: { width: number; height: number }): number[] {
  return [
    Math.round(((pt[0] ?? 0) / 100) * pageSize.width),
    Math.round(((pt[1] ?? 0) / 100) * pageSize.height),
  ];
}

function getCentroid(points: number[][]): number[] {
  if (!points.length) return [0, 0];

  let signedArea = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % points.length]!;
    const x0 = p1[0] ?? 0;
    const y0 = p1[1] ?? 0;
    const x1 = p2[0] ?? 0;
    const y1 = p2[1] ?? 0;

    const a = x0 * y1 - x1 * y0;
    signedArea += a;
    cx += (x0 + x1) * a;
    cy += (y0 + y1) * a;
  }

  signedArea *= 0.5;

  if (Math.abs(signedArea) < 1e-7) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const p of points) {
      const x = p[0] ?? 0;
      const y = p[1] ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    return [(minX + maxX) / 2, (minY + maxY) / 2];
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;

  return [cx, cy];
}

type PinMarkerProps = {
  label: string | number;
  abbreviation?: string;
  color?: string;
};

const PinMarker = ({ label, abbreviation, color = "#10b981" }: PinMarkerProps) => (
  <svg
    width="40"
    height="46"
    viewBox="0 0 40 46"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.2))" }}
  >
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

interface DrawingPinPreviewModalProps {
  open: boolean;
  onClose: () => void;
  pin: DrawingPin | null;
  plots: DrawingPlot[];
  drawingFile: string;
  drawingName: string;
  formSummary?: {
    label: string;
    projectFormId: number;
    submitted?: boolean;
  } | null;
  projectId?: number;
  drawingId?: number;
  editUrl?: string;
  onSaveSuccess?: (updatedPin: DrawingPin) => void;
  /** Render as page content (no AppModal). Used by pin detail full page. */
  embedded?: boolean;
  /** Hide the form row in details when the page already shows FormRenderer. */
  hideFormRow?: boolean;
  /** Show details panel only (no blueprint map). */
  hideDrawing?: boolean;
  /** Extra content rendered at the end of the details panel (e.g. QA). */
  detailsFooter?: React.ReactNode;
}

export function DrawingPinPreviewModal({
  open,
  onClose,
  pin,
  plots,
  drawingFile,
  drawingName,
  formSummary,
  projectId,
  drawingId,
  editUrl,
  onSaveSuccess,
  embedded = false,
  hideFormRow = false,
  hideDrawing = false,
  detailsFooter,
}: DrawingPinPreviewModalProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const t = useTranslations("Dashboard.projects.drawings.editor");
  const [pageSize, setPageSize] = React.useState<{ width: number; height: number } | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Pan state variables
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState({ x: 0, y: 0 });
  const [scrollStart, setScrollStart] = React.useState({ left: 0, top: 0 });

  const normalizedFileUrl = React.useMemo(() => resolveDrawingFileUrl(drawingFile), [drawingFile]);
  const isPdf = /\.pdf(\?|$)/i.test(drawingFile) || /\.pdf(\?|$)/i.test(normalizedFileUrl);

  React.useEffect(() => {
    if (open) {
      setPageSize(null);
      setLoading(!hideDrawing);
      setIsPanning(false);
    }
  }, [open, drawingFile, hideDrawing]);

  // Centering scroll viewport on pin after page size is resolved
  React.useEffect(() => {
    if (open && pageSize && pin && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const x = (pin.x_coordinate / 100) * pageSize.width;
      const y = (pin.y_coordinate / 100) * pageSize.height;

      const timer = setTimeout(() => {
        container.scrollLeft = x - container.clientWidth / 2;
        container.scrollTop = y - container.clientHeight / 2;
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [open, pageSize, pin]);

  // Global mouseup event listener to ensure panning stops cleanly when releasing outside container
  React.useEffect(() => {
    if (!isPanning) return;

    const handleGlobalMouseUp = () => {
      setIsPanning(false);
      const container = scrollContainerRef.current;
      if (container) {
        container.style.cursor = "grab";
        container.style.userSelect = "";
      }
    };

    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [isPanning]);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only trigger panning on left click
    const container = scrollContainerRef.current;
    if (!container) return;

    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
    setScrollStart({ left: container.scrollLeft, top: container.scrollTop });
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    const container = scrollContainerRef.current;
    if (!container) return;

    const dx = e.clientX - panStart.x;
    const dy = e.clientY - panStart.y;
    container.scrollLeft = scrollStart.left - dx;
    container.scrollTop = scrollStart.top - dy;
  };

  const [itemsList, setItemsList] = React.useState<CompositeItem[]>([]);
  const [statusesList, setStatusesList] = React.useState<PinStatus[]>([]);
  const [formsList, setFormsList] = React.useState<FormListItem[]>([]);
  const [isEditing, setIsEditing] = React.useState(false);
  const [pinEditData, setPinEditData] = React.useState<DrawingPin | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [detailsOpen, setDetailsOpen] = React.useState(false);

  React.useEffect(() => {
    if (open && projectId) {
      Promise.allSettled([
        fetchCompositeItemsPage(1, 500),
        fetchPinStatusesPage(1, 500),
        fetchProjectFormsPage(projectId, 1, 500),
      ]).then(([itemsRes, statusesRes, formsRes]) => {
        if (itemsRes.status === "fulfilled") setItemsList(itemsRes.value.items);
        if (statusesRes.status === "fulfilled") setStatusesList(statusesRes.value.items);
        if (formsRes.status === "fulfilled") setFormsList(formsRes.value.items);
      });
    }
  }, [open, projectId]);

  React.useEffect(() => {
    if (open) {
      setIsEditing(false);
      setPinEditData(null);
      setDetailsOpen(embedded || hideDrawing);
    }
  }, [open, embedded, hideDrawing, pin?.id]);

  async function filesToPinAttachments(files: File[]): Promise<DrawingPinAttachment[]> {
    if (!files.length) return [];
    const now = Date.now();
    const out: DrawingPinAttachment[] = [];
    let i = 0;
    for (const file of files) {
      out.push({
        id: -(now + i),
        file_name: file.name,
        content_type: file.type || null,
        file: file,
        url: URL.createObjectURL(file),
      });
      i++;
    }
    return out;
  }

  async function handleSave() {
    if (!pinEditData || !projectId || !drawingId || !pin) return;

    setSaving(true);
    try {
      // Find which plot contains our pin
      const ownerPlot = plots.find(plot =>
        plot.pins?.some(p => p.id === pin.id)
      ) ?? plots.find(p => p.pins.some(pi => pi.id === pin.id));

      const formData = new FormData();

      // Build pin payload ΓÇö only the fields the user can edit
      const newAttachments = (pinEditData.attachments ?? pin.attachments ?? []) as DrawingPinAttachment[];
      const attachmentFileKey = "plots[0][pins][0][attachments]";
      let attachFileIdx = 0;
      newAttachments.forEach((att: any) => {
        if (att.file) {
          formData.append(`${attachmentFileKey}[${attachFileIdx}]`, att.file);
          attachFileIdx++;
        }
      });

      const pinPayload = {
        id: pin.id,
        x_coordinate: pin.x_coordinate,
        y_coordinate: pin.y_coordinate,
        status: pinEditData.status ?? pin.status ?? undefined,
        group: pin.group ?? null,
        item: pinEditData.item ?? pin.item ?? null,
        project_form: pinEditData.formId ?? (typeof pinEditData.project_form === "number" ? pinEditData.project_form : null) ?? null,
        quantity: (pinEditData.quantity === "" as any || pinEditData.quantity == null || isNaN(Number(pinEditData.quantity))) ? (pin.quantity ?? 1) : Number(pinEditData.quantity),
        variation: pinEditData.variation ?? pin.variation ?? false,
        location: pin.location,
        description: pinEditData.description ?? pin.description ?? undefined,
        // Only send existing (server-side) attachments ΓÇö new files are sent via FormData
        attachments: newAttachments.filter((att: any) => !att.file).map((att: any) => ({ id: att.id })),
      };

      // Build the minimal plot stub for the owner plot
      const ownerPlotPayload = ownerPlot
        ? {
            id: ownerPlot.id,
            name: ownerPlot.name,
            coordinates: ownerPlot.coordinates,
            plot_border: ownerPlot.plot_border,
            plot_bg: ownerPlot.plot_bg,
            pins: [pinPayload],
          }
        : { pins: [pinPayload] };

      // Other plots: send required fields (coordinates cannot be null) + their pins
      // as minimal stubs (id + position only) so the backend keeps them intact.
      const otherPlotStubs = (plots ?? [])
        .filter(plot => !plot.pins?.some(p => p.id === pin.id))
        .map(plot => ({
          id: plot.id,
          name: plot.name,
          coordinates: plot.coordinates,
          plot_border: plot.plot_border,
          plot_bg: plot.plot_bg,
          pins: (plot.pins ?? []).map(p => ({
            id: p.id,
            x_coordinate: p.x_coordinate,
            y_coordinate: p.y_coordinate,
            status: p.status ?? undefined,
            group: p.group ?? null,
            item: p.item ?? null,
            project_form: p.formId ?? (typeof p.project_form === "number" ? p.project_form : null) ?? null,
            quantity: p.quantity ?? 1,
            variation: p.variation ?? false,
            location: p.location,
            description: p.description ?? undefined,
            attachments: (p.attachments ?? []).filter((att: any) => !att.file).map((att: any) => ({ id: att.id })),
          })),
        }));

      const payload = {
        name: drawingName,
        plots: [ownerPlotPayload, ...otherPlotStubs],
      };

      formData.append("payload", JSON.stringify(payload));

      const updatedDrawing = await updateDrawingPlots(projectId, drawingId, formData);

      let resolvedUpdatedPin: DrawingPin | null = null;
      if (updatedDrawing?.plots) {
        for (const upPlot of updatedDrawing.plots) {
          const matched = upPlot.pins?.find(p => p.id === pin.id);
          if (matched) {
            resolvedUpdatedPin = matched;
            break;
          }
        }
      }

      toastSuccess("Pin details saved successfully");
      setIsEditing(false);

      if (onSaveSuccess && resolvedUpdatedPin) {
        onSaveSuccess(resolvedUpdatedPin);
      }
    } catch (err) {
      console.error(err);
      toastError("Failed to save pin details");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !pin) return null;

  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const abbreviation = resolvePinMarkerAbbreviation(pin, {}, productName);
  const color = pin.status_detail?.bg_colour || "#10b981";
  const label = pin.location || String(pin.id);
  const parentPlot = plots.find(p => p.pins.some(pinItem => pinItem.id === pin.id)) || plots[0];
  const plotName = parentPlot?.name || "N/A";

  const pinX = pageSize ? (pin.x_coordinate / 100) * pageSize.width : 0;
  const pinY = pageSize ? (pin.y_coordinate / 100) * pageSize.height : 0;

  // Compute installation_type from the active item (editing or viewing)
  const activeItemId = isEditing && pinEditData ? (pinEditData.item ?? pin.item) : pin.item;
  const activeItemDetail = isEditing && pinEditData
    ? (itemsList.find(i => i.id === activeItemId) ?? pinEditData.item_detail ?? pin.item_detail)
    : pin.item_detail;
  const activeInstallationType: string = (() => {
    const instType = activeItemDetail?.installation_type;
    if (instType && typeof instType === "object") {
      return instType.id != null ? String(instType.id) : "";
    }
    return instType != null ? String(instType) : "";
  })();

  // Filter forms by the pin's item installation_type (mirrors editor screen logic)
  const availableForms = activeInstallationType
    ? formsList.filter(form => {
        const formType = (form as any)?.installation_type?.id ?? (form as any)?.installation_type_id;
        if (formType == null) return false;
        return String(formType) === activeInstallationType;
      })
    : formsList;
  const selectedProjectFormId =
    pin.formId ??
    (typeof pin.project_form === "number" ? pin.project_form : null) ??
    (pin.project_form && typeof pin.project_form === "object" ? pin.project_form.id : null);
  const selectedAvailableForm = availableForms.find((f) => f.id === selectedProjectFormId);
  const readonlyFormLabel =
    selectedAvailableForm?.name ??
    formSummary?.label ??
    (pin.project_form && typeof pin.project_form === "object" ? pin.project_form.name : null);

  const mapScrollClass = embedded
    ? "relative min-h-[50vh] h-full w-full overflow-hidden p-6 md:p-8 cursor-grab select-none flex-1"
    : "relative max-h-[70vh] min-h-[50vh] w-full overflow-hidden p-8 md:p-12 cursor-grab select-none flex-1";
  const detailsPaneClass = hideDrawing
    ? "md:col-span-10 bg-white dark:bg-slate-900 flex flex-col min-h-0 h-full overflow-hidden"
    : embedded
      ? "md:col-span-3 bg-white dark:bg-slate-900 flex flex-col min-h-0 h-full overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800"
      : "md:col-span-3 bg-white dark:bg-slate-900 flex flex-col max-h-[70vh] overflow-hidden border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800";

  const body = (
      <div
        className={`grid grid-cols-1 md:grid-cols-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20 ${
          embedded ? "min-h-[calc(100dvh-11rem)] h-full" : ""
        }`}
      >

        {/* Left Column (MAP) - 60% or 100% width */}
        {!hideDrawing ? (
        <div className={`relative ${detailsOpen ? "md:col-span-7 border-r" : "md:col-span-10"} border-b md:border-b-0 border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden`}>
          {loading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-[color:var(--dash-accent,#f97316)]" />
                <span className="text-sm font-medium text-slate-500">Loading drawing blueprint...</span>
              </div>
            </div>
          )}

          <div
            ref={scrollContainerRef}
            className={mapScrollClass}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
          >
            {normalizedFileUrl ? (
              <div
                className="relative select-none shadow-lg transition-transform duration-200 mx-auto"
                style={
                  pageSize
                    ? {
                      width: pageSize.width,
                      height: pageSize.height,
                    }
                    : undefined
                }
              >
                {isPdf ? (
                  <Document
                    file={normalizedFileUrl}
                    onLoadError={() => {
                      setLoading(false);
                      toastError("Failed to render blueprint PDF drawing");
                    }}
                    onLoadSuccess={() => setLoading(false)}
                  >
                    <Page
                      pageNumber={1}
                      scale={1.2}
                      renderAnnotationLayer={false}
                      renderTextLayer={false}
                      onLoadSuccess={(page) => {
                        const vp = page.getViewport({ scale: 1.2 });
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
                      setLoading(false);
                    }}
                    onError={() => {
                      setLoading(false);
                      toastError("Failed to load blueprint drawing image");
                    }}
                  />
                )}

                {/* Plots SVG Layer */}
                {pageSize && plots && (
                  <svg
                    className="absolute left-0 top-0 pointer-events-none"
                    width={pageSize.width}
                    height={pageSize.height}
                    viewBox={`0 0 ${pageSize.width} ${pageSize.height}`}
                  >
                    {plots.map((plot) => {
                      const plotPoints = (plot.coordinates || []).map((p) => percentToPixel(p, pageSize));
                      if (plotPoints.length === 0) return null;

                      const minX = Math.min(...plotPoints.map((p) => p[0] ?? 0));
                      const minY = Math.min(...plotPoints.map((p) => p[1] ?? 0));
                      const maxX = Math.max(...plotPoints.map((p) => p[0] ?? 0));
                      const maxY = Math.max(...plotPoints.map((p) => p[1] ?? 0));
                      const [labelX, labelY] = getCentroid(plotPoints);
                      const labelText = plot.name.length > 24 ? `${plot.name.slice(0, 24)}...` : plot.name;
                      const badgeWidth = Math.max(90, Math.min(220, labelText.length * 7 + 20));

                      const colorIndex = Math.abs(plot.id) % PLOT_PALETTE.length;
                      const defaultColor = PLOT_PALETTE[colorIndex]!;
                      const border = plot.plot_border || defaultColor.border;
                      const bg = plot.plot_bg || defaultColor.bg;

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
                              fill={bg}
                              stroke={border}
                              strokeWidth={2}
                              strokeDasharray="5 4"
                            />
                          ) : plotPoints.length === 2 ? (
                            <line
                              x1={plotPoints[0]?.[0]}
                              y1={plotPoints[0]?.[1]}
                              x2={plotPoints[1]?.[0]}
                              y2={plotPoints[1]?.[1]}
                              stroke={border}
                              strokeWidth={3}
                            />
                          ) : null}
                          {plotPoints.length >= 3 ? (
                            <g clipPath={`url(#plot-clip-${plot.id})`} className="pointer-events-none opacity-80">
                              <line x1={minX} y1={minY} x2={maxX} y2={maxY} stroke={border} strokeWidth={2.5} />
                              <line x1={maxX} y1={minY} x2={minX} y2={maxY} stroke={border} strokeWidth={2.5} />
                            </g>
                          ) : null}
                          <g className="pointer-events-none">
                            <rect
                              x={labelX - badgeWidth / 2}
                              y={Math.max(8, labelY - 12)}
                              width={badgeWidth}
                              height={24}
                              rx={12}
                              fill="rgba(15,23,42,0.9)"
                            />
                            <text
                              x={labelX}
                              y={Math.max(24, labelY + 4)}
                              fill="white"
                              fontSize={12}
                              fontWeight={700}
                              textAnchor="middle"
                            >
                              {labelText}
                            </text>
                          </g>
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Pin Plotting Layer */}
                {pageSize && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDetailsOpen(true);
                    }}
                    title="Click to view details"
                    className="absolute cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-150 border-none bg-transparent p-0 outline-none"
                    style={{
                      left: pinX,
                      top: pinY,
                      transformOrigin: "bottom center",
                      transform: "translate(-50%, -100%)",
                      zIndex: 20,
                    }}
                  >
                    <PinMarker label={label} abbreviation={abbreviation} color={color} />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex h-[50vh] items-center justify-center text-slate-400">
                No drawing file available.
              </div>
            )}
          </div>
        </div>
        ) : null}

        {/* Right Column (FIELDS) - 40% width */}
        {detailsOpen && (
          <div className={detailsPaneClass}>
            {/* Header/Title with EDIT and CLOSE buttons */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/80 gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  Location #{pin.location || String(pin.id)}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
                  {productName}
                </p>
              </div>
              
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {projectId && drawingId && (
                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <>
                        <button
                          onClick={() => {
                            setIsEditing(false);
                            setPinEditData(pin);
                          }}
                          className="px-2 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded-lg transition-all shadow-md shadow-blue-100 dark:shadow-none flex items-center gap-1"
                        >
                          {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => {
                          const normalizedFormId =
                            pin.formId ??
                            (typeof pin.project_form === "number" ? pin.project_form : null);
                          setPinEditData({ ...pin, formId: normalizedFormId });
                          setIsEditing(true);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>
                )}

                {!embedded ? (
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setDetailsOpen(false);
                    }}
                    title="Close details"
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </div>

          {/* Details list */}
          <div className="flex-1 overflow-y-auto p-3  space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Details</h3>
              <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                {/* 1. Product Name */}
                <DetailRow
                  icon={PackageIcon}
                  label="Product Name"
                  value={isEditing && pinEditData
                    ? (pinEditData.item ?? pin.item ?? "")
                    : (pin.item_detail?.name || pin.group_detail?.name || "-")
                  }
                  isEditing={isEditing}
                  type="select"
                  options={itemsList.map(i => ({ value: i.id, label: i.name }))}
                  onChange={(val: string) => {
                    setPinEditData(prev => prev ? ({ ...prev, item: parseInt(val) || undefined }) : null);
                  }}
                />

                {/* Product Attachments - 2 Column Grid */}
                {(() => {
                  const attachments = (activeItemDetail as (typeof activeItemDetail & { attachments?: Array<{ file_url?: string | null; url?: string | null; attachment?: string | null; file?: string | null; file_name?: string | null; name?: string | null; id?: number | null }> }) | null | undefined)?.attachments;
                  return attachments && attachments.length > 0 ? (
                    <div className="py-3 border-b border-slate-50 dark:border-slate-800/50">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="text-slate-400">
                          <Paperclip className="h-[18px] w-[18px]" />
                        </div>
                        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Product Attachments</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((att, idx) => {
                          const url = att.file_url ?? att.url ?? (typeof att.attachment === "string" ? att.attachment : null) ?? (typeof att.file === "string" ? att.file : null);
                          const name = att.file_name ?? att.name ?? (att.id != null ? `Attachment #${att.id}` : `Attachment ${idx + 1}`);
                          const fileType = name.split('.').pop()?.toUpperCase() || 'FILE';
                          return (
                            <div key={idx} className="flex items-center justify-between gap-2 px-3 py-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg">
                              <div className="flex flex-col min-w-0">
                                <p className="text-xs truncate font-semibold text-red-900 dark:text-red-200" title={name}>{name}</p>
                                <p className="text-[10px] text-red-700 dark:text-red-300">{fileType}</p>
                              </div>
                              <button
                                type="button"
                                disabled={!url}
                                className="text-[10px] font-semibold text-red-600 hover:text-red-700 hover:underline disabled:text-slate-400 disabled:cursor-not-allowed dark:text-red-400 dark:hover:text-red-300 transition-colors bg-transparent border-none p-0 flex items-center gap-0.5 cursor-pointer flex-shrink-0"
                                onClick={async () => {
                                  if (!url) return;
                                  if (url.startsWith("blob:") || url.startsWith("data:")) {
                                    const link = document.createElement("a");
                                    link.href = url;
                                    link.download = name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    return;
                                  }
                                  try {
                                    const response = await fetch(url);
                                    const blob = await response.blob();
                                    const blobUrl = URL.createObjectURL(blob);
                                    const link = document.createElement("a");
                                    link.href = blobUrl;
                                    link.download = name;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                    URL.revokeObjectURL(blobUrl);
                                  } catch (error) {
                                    console.error("Failed to download file:", error);
                                    window.open(url, "_blank");
                                  }
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* 2. Quantity */}
                <DetailRow
                  icon={QuantityIcon}
                  label="Quantity"
                  value={isEditing && pinEditData
                    ? (pinEditData.quantity !== undefined ? pinEditData.quantity : (pin.quantity ?? 1))
                    : (pin.quantity ?? 1)
                  }
                  isEditing={isEditing}
                  onChange={(val: string) => {
                    setPinEditData(prev => prev ? ({ ...prev, quantity: val === "" ? ("" as any) : parseInt(val, 10) }) : null);
                  }}
                />

                {/* 3. Status */}
                <DetailRow
                  icon={StatusIcon}
                  label="Status"
                  value={isEditing && pinEditData
                    ? (pinEditData.status ?? pin.status ?? "")
                    : (pin.status_detail?.status_name || pin.status || "")
                  }
                  isEditing={isEditing}
                  type="select"
                  options={statusesList.map(s => ({ value: s.id, label: s.status_name }))}
                  statusColor={pin.status_detail?.bg_colour || statusesList.find(s => s.id === (pinEditData?.status || pin.status))?.bg_colour}
                  statusTextColor={pin.status_detail?.text_colour || statusesList.find(s => s.id === (pinEditData?.status || pin.status))?.text_colour}
                  onChange={(val: string) => {
                    const s = statusesList.find(st => String(st.id) === val);
                    if (s) setPinEditData(prev => prev ? ({ ...prev, status: s.id }) : null);
                  }}
                />

                {/* 4. Location */}
                <DetailRow
                  icon={MapPinned}
                  label="Location"
                  value={pin.location || "-"}
                  isEditing={false}
                />

                {/* 5. Plot */}
                <DetailRow
                  icon={BlockIcon}
                  label="Plot"
                  value={plotName}
                  isEditing={false}
                />
                {/* 6. Level */}
                <DetailRow
                  icon={LevelIcon}
                  label="Level"
                  value={drawingName || "N/A"}
                  isEditing={false}
                />
              </div>
            </div>

            {/* Description, Attachments, Form, Variation */}
            <div className="space-y-4">
              {/* Description */}
              <div className="flex items-start justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-slate-400">
                    <FileText className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Description</span>
                </div>
                <div className="flex-1 flex justify-end">
                  {isEditing && pinEditData ? (
                    <textarea
                      rows={3}
                      className="w-full max-w-[200px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                      value={String(pinEditData.description ?? pin.description ?? "")}
                      onChange={(e) => setPinEditData((prev) => prev ? ({ ...prev, description: e.target.value }) : null)}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 whitespace-pre-wrap text-right">
                      {pin.description || "-"}
                    </p>
                  )}
                </div>
              </div>

              {/* Attachments */}
              <div className="py-3 border-b border-slate-50 dark:border-slate-800/50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-slate-400">
                      <Paperclip className="h-[18px] w-[18px]" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Attachments</span>
                  </div>
                  {isEditing ? (
                    <div className="w-1/2 flex justify-end">
                      <input
                        type="file"
                        multiple
                        className="block w-full text-xs text-slate-700 dark:text-slate-200"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (!files.length) return;
                          void (async () => {
                            const draftAttachments = await filesToPinAttachments(files);
                            setPinEditData((prev) => prev ? ({
                              ...prev,
                              attachments: [
                                ...(prev.attachments ?? pin.attachments ?? []),
                                ...draftAttachments,
                              ],
                            }) : null);
                          })();
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 space-y-2">
                  {(() => {
                    const attachments = (isEditing && pinEditData ? pinEditData.attachments : pin.attachments) ?? [];
                    if (!attachments.length) return <p className="text-sm text-slate-500 text-right">-</p>;
                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {attachments.map((att, idx) => {
                          const url =
                            att.url ??
                            att.file_url ??
                            (typeof att.attachment === "string" ? att.attachment : null) ??
                            (typeof att.file === "string" ? att.file : null) ??
                            att.data_url ??
                            att.file_data ??
                            (att.file && typeof att.file !== "string" ? URL.createObjectURL(att.file as any) : null);
                          const name =
                            att.file_name ??
                            att.name ??
                            (att.id != null ? `Attachment #${att.id}` : `Attachment ${idx + 1}`);
                          const fileType = name.split('.').pop()?.toUpperCase() || 'FILE';

                          return (
                            <div key={idx} className={`flex flex-col gap-2 px-3 py-2 border rounded-lg ${isEditing ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50' : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700'}`}>
                              <div className="flex flex-col min-w-0">
                                <p className={`text-xs truncate font-semibold ${isEditing ? 'text-blue-900 dark:text-blue-200' : 'text-slate-700 dark:text-slate-200'}`} title={name}>{name}</p>
                                <p className={`text-[10px] ${isEditing ? 'text-blue-700 dark:text-blue-300' : 'text-slate-600 dark:text-slate-400'}`}>{fileType}</p>
                              </div>
                              <div className="flex items-center gap-2 w-full">
                                {isEditing ? (
                                  <button
                                    type="button"
                                    className="text-[10px] font-semibold text-red-600 hover:text-red-700 hover:underline bg-transparent border-none p-0 cursor-pointer"
                                    onClick={() => {
                                      setPinEditData((prev) => {
                                        if (!prev) return null;
                                        const curr = (prev.attachments ?? pin.attachments ?? []) as DrawingPinAttachment[];
                                        const next = curr.filter((_, i) => i !== idx);
                                        return { ...prev, attachments: next };
                                      });
                                    }}
                                  >
                                    Remove
                                  </button>
                                ) : null}
                                {url ? (
                                  <button
                                    type="button"
                                    className={`text-[10px] font-semibold ${isEditing ? 'text-blue-600 hover:text-blue-700' : 'text-slate-600 hover:text-slate-700'} hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-0.5 flex-shrink-0 ${!isEditing ? 'ml-auto' : ''}`}
                                    onClick={async () => {
                                      if (url.startsWith("blob:") || url.startsWith("data:")) {
                                        const link = document.createElement("a");
                                        link.href = url;
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        return;
                                      }
                                      try {
                                        const response = await fetch(url);
                                        const blob = await response.blob();
                                        const blobUrl = URL.createObjectURL(blob);
                                        const link = document.createElement("a");
                                        link.href = blobUrl;
                                        link.download = name;
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        URL.revokeObjectURL(blobUrl);
                                      } catch (error) {
                                        console.error("Failed to download file:", error);
                                        window.open(url, "_blank");
                                      }
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Form */}
              {!hideFormRow ? (
              <div className="flex items-start justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 gap-3">
                <div className="flex items-center gap-3">
                  <div className="text-slate-400">
                    <FileText className="h-[18px] w-[18px]" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Form</span>
                </div>
                <div className="flex-1 flex justify-end">
                  {availableForms.length > 0 ? (
                    isEditing && pinEditData ? (
                      <select
                        value={String(
                          pinEditData.formId ??
                          (typeof pinEditData.project_form === "number" ? pinEditData.project_form : null) ??
                          ""
                        )}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPinEditData(prev => prev ? ({ ...prev, formId: value ? Number(value) : null, project_form: value ? Number(value) : null }) : null);
                        }}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-sm outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 max-w-[200px]"
                      >
                        <option value="">Select Form</option>
                        {availableForms.map((opt) => (
                          <option key={opt.id} value={opt.id}>
                            {opt.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex max-w-[200px] flex-wrap justify-end gap-1.5 text-right">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {readonlyFormLabel || "-"}
                        </span>
                        {formSummary?.projectFormId ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            #{formSummary.projectFormId}
                          </span>
                        ) : null}
                        {formSummary?.submitted ? (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Submitted
                          </span>
                        ) : null}
                      </div>
                    )
                  ) : readonlyFormLabel ? (
                    <div className="flex max-w-[200px] flex-wrap justify-end gap-1.5 text-right">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {readonlyFormLabel}
                      </span>
                      {formSummary?.projectFormId ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          #{formSummary.projectFormId}
                        </span>
                      ) : null}
                      {formSummary?.submitted ? (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          Submitted
                        </span>
                      ) : null}
                    </div>
                  ) : activeInstallationType ? (
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-medium text-right max-w-[180px]">
                      {t("noFormWithInstallationType")}
                    </span>
                  ) : null}
                </div>
              </div>
              ) : null}

              {/* Variation */}
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
                  aria-checked={!!(isEditing && pinEditData ? pinEditData.variation : pin.variation)}
                  disabled={!isEditing}
                  onClick={() => {
                    if (isEditing) {
                      setPinEditData(prev => prev ? ({ ...prev, variation: !prev.variation }) : null);
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${(isEditing && pinEditData ? pinEditData.variation : pin.variation)
                    ? "bg-blue-600"
                    : "bg-slate-200 dark:bg-slate-700"
                    } ${!isEditing ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${(isEditing && pinEditData ? pinEditData.variation : pin.variation)
                      ? "translate-x-6"
                      : "translate-x-1"
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Coordinate Details */}
            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Location</h3>
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-slate-400 uppercase">X Coordinate</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{pin.x_coordinate.toFixed(2)}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-medium text-slate-400 uppercase">Y Coordinate</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{pin.y_coordinate.toFixed(2)}%</p>
                </div>
              </div>
            </div>

            {detailsFooter ? (
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                {detailsFooter}
              </div>
            ) : null}
          </div>
        </div>
      )}

      </div>
  );

  if (embedded) return body;

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>Pin #{pin.id} Preview</span>
          <span className="text-xs font-normal text-slate-500">({drawingName})</span>
        </div>
      }
      size="5xl"
    >
      {body}
    </AppModal>
  );
}
