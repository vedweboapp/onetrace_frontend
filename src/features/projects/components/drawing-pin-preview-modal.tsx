"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { resolveDrawingFileUrl } from "@/features/projects/utils/drawing-file-url";
import { resolvePinMarkerAbbreviation } from "@/features/projects/utils/drawing-pin-display.util";
import type { DrawingPin, DrawingPlot } from "@/features/projects/types/drawing.types";
import { AppModal } from "@/shared/ui";
import { toastError } from "@/shared/feedback/app-toast";
import { Loader2 } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Set PDF JS global worker Src
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const PLOT_PALETTE = [
  { border: "#059669", bg: "#0596690D" },  // Green
  { border: "#2563EB", bg: "#2563EB0D" },  // Blue
  { border: "#7C3AED", bg: "#7C3AED0D" },  // Purple
  { border: "#D946EF", bg: "#D946EF0D" },  // Fuchsia
  { border: "#EAB308", bg: "#EAB3080D" },  // Yellow
  { border: "#F97316", bg: "#F973160D" },  // Orange
  { border: "#DC2626", bg: "#DC26260D" },  // Red
];

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
}

export function DrawingPinPreviewModal({
  open,
  onClose,
  pin,
  plots,
  drawingFile,
  drawingName,
}: DrawingPinPreviewModalProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
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
      setLoading(true);
      setIsPanning(false);
    }
  }, [open, drawingFile]);

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

  if (!open || !pin) return null;

  const productName = pin.item_detail?.name || pin.group_detail?.name || "Pin";
  const abbreviation = resolvePinMarkerAbbreviation(pin, {}, productName);
  const color = pin.status_detail?.bg_colour || "#10b981";
  const label = pin.location || String(pin.id);

  const pinX = pageSize ? (pin.x_coordinate / 100) * pageSize.width : 0;
  const pinY = pageSize ? (pin.y_coordinate / 100) * pageSize.height : 0;

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
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/20">
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
          className="relative max-h-[70vh] min-h-[50vh] w-full overflow-hidden p-8 md:p-12 cursor-grab select-none"
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
                <div
                  className="absolute"
                  style={{
                    left: pinX,
                    top: pinY,
                    transformOrigin: "bottom center",
                    transform: "translate(-50%, -100%)",
                    zIndex: 20,
                  }}
                >
                  <PinMarker label={label} abbreviation={abbreviation} color={color} />
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-[50vh] items-center justify-center text-slate-400">
              No drawing file available.
            </div>
          )}
        </div>
      </div>
    </AppModal>
  );
}
