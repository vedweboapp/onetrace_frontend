"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { KioskConfig, KioskOption, PlacementCoordinates } from "../types/kiosk.types";
import {
  computeLiveBuildScene,
  type KioskAnswerValue,
  type LiveBuildOverlay,
} from "../utils/kiosk-live-build";
import { applyColorFill } from "../utils/kiosk-color-fill";
import {
  DEFAULT_PLACEMENT_COORDINATES,
  normalizePlacementCoordinates,
  placementCoordinatesStyle,
} from "../utils/kiosk-placement-styles";
import { cn } from "@/core/utils/http.util";

interface LiveBuildOverlayItemProps {
  layer: LiveBuildOverlay;
  sizeClass?: string;
  shadow?: boolean;
  onClick?: () => void;
}

const LiveBuildOverlayItem: React.FC<LiveBuildOverlayItemProps> = ({
  layer,
  sizeClass = "size-10",
  shadow = false,
  onClick,
}) => {
  const [tintedSrc, setTintedSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!layer.color) {
      setTintedSrc(null);
      return;
    }
    let cancelled = false;
    applyColorFill(layer.image, layer.color).then((result) => {
      if (!cancelled) {
        setTintedSrc(result);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [layer.image, layer.color]);

  const displaySrc = tintedSrc || layer.image;

  return (
    <div
      className={cn(
        "absolute z-10 overflow-hidden rounded-md border-2 border-white shadow-lg transition-all duration-200",
        sizeClass,
        shadow && "shadow-md",
      )}
      style={placementCoordinatesStyle(layer.coordinates)}
      onClick={onClick}
    >
      <img
        src={displaySrc}
        alt={layer.label || "Layer"}
        className="size-full object-cover"
      />
    </div>
  );
};

interface KioskLiveBuildPanelProps {
  config: KioskConfig;
  answers: Record<string, KioskAnswerValue>;
  livePreviewOptions?: Record<string, KioskOption | null | undefined>;
  className?: string;
  compact?: boolean;
  onPlacementChange?: (optionUid: string, coordinates: PlacementCoordinates) => void;
}

interface PlacementEditorModalProps {
  layer: LiveBuildOverlay;
  canvasImage: string;
  onChange: (coordinates: PlacementCoordinates) => void;
  onClose: () => void;
}

const PlacementEditorModal: React.FC<PlacementEditorModalProps> = ({
  layer,
  canvasImage,
  onChange,
  onClose,
}) => {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const [coordinates, setCoordinates] = React.useState(() =>
    normalizePlacementCoordinates(layer.coordinates || DEFAULT_PLACEMENT_COORDINATES),
  );
  const [interaction, setInteraction] = React.useState<{
    type: "move" | "resize";
    x: number;
    y: number;
    start: PlacementCoordinates;
  } | null>(null);

  const updateFromPointer = (event: React.PointerEvent) => {
    if (!interaction || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    const dx = x - interaction.x;
    const dy = y - interaction.y;
    const start = interaction.start;
    const width = start.bottom_right.x - start.top_left.x;
    const height = start.bottom_right.y - start.top_left.y;
    const next = interaction.type === "move"
      ? {
          top_left: { x: start.top_left.x + dx, y: start.top_left.y + dy },
          bottom_right: { x: start.bottom_right.x + dx, y: start.bottom_right.y + dy },
        }
      : {
          top_left: start.top_left,
          bottom_right: {
            x: Math.max(start.top_left.x + 5, start.bottom_right.x + dx),
            y: Math.max(start.top_left.y + 5, start.bottom_right.y + dy),
          },
        };
    const normalized = normalizePlacementCoordinates(next);
    if (interaction.type === "move") {
      const clampedX = Math.max(0, Math.min(100 - width, normalized.top_left.x));
      const clampedY = Math.max(0, Math.min(100 - height, normalized.top_left.y));
      normalized.top_left = { x: clampedX, y: clampedY };
      normalized.bottom_right = { x: clampedX + width, y: clampedY + height };
    }
    setCoordinates(normalized);
    onChange(normalized);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onPointerMove={updateFromPointer} onPointerUp={() => setInteraction(null)}>
      <div className="w-full max-w-2xl rounded-lg border border-slate-700 bg-slate-900 p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Place overlapping image</h3>
            <p className="text-[11px] text-slate-400">Drag the image to move it. Drag the corner to resize it.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded border border-slate-600 px-3 py-1 text-xs text-white">Done</button>
        </div>
        <div ref={canvasRef} className="relative mx-auto aspect-video max-h-[70vh] w-full overflow-hidden rounded border border-slate-600 bg-slate-800">
          {canvasImage && <img src={canvasImage} alt="Base document" className="size-full object-contain" />}
          <div
            className="absolute cursor-move overflow-visible border-2 border-blue-400 bg-blue-500/20"
            style={placementCoordinatesStyle(coordinates)}
            onPointerDown={(event) => {
              event.stopPropagation();
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              setInteraction({ type: "move", x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100, start: coordinates });
            }}
          >
            <img src={layer.image} alt={layer.label || "Overlapping image"} className="size-full object-contain" />
            <button
              type="button"
              aria-label="Resize overlapping image"
              className="absolute -bottom-2 -right-2 size-4 cursor-se-resize rounded-full border-2 border-white bg-blue-500"
              onPointerDown={(event) => {
                event.stopPropagation();
                const rect = canvasRef.current?.getBoundingClientRect();
                if (!rect) return;
                setInteraction({ type: "resize", x: ((event.clientX - rect.left) / rect.width) * 100, y: ((event.clientY - rect.top) / rect.height) * 100, start: coordinates });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const KioskLiveBuildPanel: React.FC<KioskLiveBuildPanelProps> = ({
  config,
  answers,
  livePreviewOptions,
  className,
  compact = false,
  onPlacementChange,
}) => {
  const scene = useMemo(
    () => computeLiveBuildScene(config, answers, livePreviewOptions),
    [config, answers, livePreviewOptions],
  );

  const [tintedCanvasSrc, setTintedCanvasSrc] = useState<string | null>(null);
  const [tintLoading, setTintLoading] = useState(false);
  const [editingLayer, setEditingLayer] = useState<LiveBuildOverlay | null>(null);

  const tintSource = useMemo(() => {
    if (!scene.colorApply) return null;
    const { sourceImage, targetUid } = scene.colorApply;
    if (scene.canvasImage) {
      if (!targetUid || targetUid === scene.canvasUid) {
        return scene.canvasImage;
      }
    }
    return sourceImage;
  }, [scene]);

  useEffect(() => {
    if (!scene.colorApply || !tintSource) {
      setTintedCanvasSrc(null);
      setTintLoading(false);
      return;
    }

    let cancelled = false;
    setTintLoading(true);
    setTintedCanvasSrc(null);
    const timer = setTimeout(() => {
      applyColorFill(tintSource, scene.colorApply!.color).then((result) => {
        if (!cancelled) {
          setTintedCanvasSrc(result);
          setTintLoading(false);
        }
      });
    }, 40);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tintSource, scene.colorApply?.color]);

  const mainImageSrc = tintedCanvasSrc || scene.canvasImage;

  const showSolidBlock =
    !mainImageSrc && !scene.canvasImage && !!scene.solidColor;

  const primarySummary = scene.summaries[0];
  const detailParts = scene.summaries
    .map((s) => {
      if (s.resolvedColor) {
        return `${s.option.label || "Color"} · ${s.resolvedColor.toUpperCase()}`;
      }
      return s.option.subLabel || s.option.label;
    })
    .filter(Boolean);

  const headline =
    scene.summaries.length > 0
      ? scene.summaries
          .map((s) => s.option.label)
          .filter(Boolean)
          .join(" · ")
      : config.name || "Your build";

  if (!scene.hasVisual && scene.summaries.length === 0 && scene.checkboxFeatures.length === 0) {
    return (
      <div
        className={cn(
          "rounded-lg border border-dashed border-slate-300 bg-slate-100/80 p-6 text-center dark:border-slate-700 dark:bg-slate-900/40",
          className,
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Live build
        </p>
        <p className="mt-2 text-xs text-slate-600 dark:text-slate-400">
          Select image, placement, and color options across questions to see your
          product build here.
        </p>
      </div>
    );
  }

  return (
    <>
    {editingLayer && mainImageSrc && editingLayer.uid && (
      <PlacementEditorModal
        layer={editingLayer}
        canvasImage={mainImageSrc}
        onChange={(coordinates) => onPlacementChange?.(editingLayer.uid!, coordinates)}
        onClose={() => setEditingLayer(null)}
      />
    )}
    <aside
      className={cn(
        "shrink-0 rounded-lg border border-slate-200 bg-[#ececec] shadow-sm dark:border-slate-700 dark:bg-slate-900",
        "overflow-y-auto max-h-[85vh] custom-scrollbar",
        compact ? "w-full" : "w-full lg:w-[300px] xl:w-[320px]",
        className,
      )}
    >
      {/* Visual stage — overflow-hidden keeps the canvas clipping intact */}
      <div className="overflow-hidden border-b border-slate-300/80 bg-[#ececec] dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-800 dark:text-slate-200">
            {config.name ? config.name.slice(0, 24) : "Your build"}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            Live build
          </span>
        </div>

        <div className="relative flex min-h-[190px] items-center justify-center overflow-hidden">
          {/* Dimension guides (decorative, like reference kiosk) */}
          <div className="hidden">
            <div className="relative h-[160px] w-[120px]">
              <div className="absolute -right-6 top-0 flex h-full flex-col items-center justify-between py-1">
                <div className="h-full w-px bg-slate-400/70" />
                <span className="rotate-90 whitespace-nowrap text-[9px] font-medium text-slate-500">
                  —
                </span>
              </div>
              <div className="absolute -bottom-5 left-0 right-0 flex flex-col items-center">
                <div className="h-px w-full bg-slate-400/70" />
              </div>
            </div>
          </div>

          <div className="relative z-10 flex max-h-[190px] w-full items-center justify-center">
            {tintLoading && !mainImageSrc && !showSolidBlock ? (
              <div className="text-[10px] text-slate-500">Updating…</div>
            ) : mainImageSrc ? (
              <div className="relative w-fit max-h-[190px] max-w-full overflow-hidden">
                <img
                  src={mainImageSrc}
                  alt="Live build"
                  className="block max-h-[190px] max-w-full object-contain drop-shadow-md"
                />
                {scene.overlays.map((layer, idx) => (
                  <LiveBuildOverlayItem
                    key={`${layer.image}-${layer.uid || idx}`}
                    layer={layer}
                    sizeClass="size-10"
                    shadow
                    onClick={() => setEditingLayer(layer)}
                  />
                ))}
              </div>
            ) : showSolidBlock ? (
              <div
                className="relative h-[170px] w-[120px] overflow-hidden rounded-sm shadow-md ring-1 ring-black/10"
                style={{ backgroundColor: scene.solidColor || "#2563EB" }}
              >
                {scene.overlays.map((layer, idx) => (
                  <LiveBuildOverlayItem
                    key={`${layer.image}-${layer.uid || idx}`}
                    layer={layer}
                    sizeClass="size-8"
                  />
                ))}
              </div>
            ) : scene.overlays.length > 0 ? (
              <div className="relative h-[170px] w-[120px] overflow-hidden rounded-sm bg-white/60 ring-1 ring-slate-300 dark:bg-slate-800/60">
                {scene.overlays.map((layer, idx) => (
                  <LiveBuildOverlayItem
                    key={`${layer.image}-${layer.uid || idx}`}
                    layer={layer}
                    sizeClass="size-12"
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Summary — independently scrollable so long feature lists are reachable */}
      <div className="space-y-3 bg-white px-3 py-3 dark:bg-slate-950 overflow-y-auto max-h-[320px] custom-scrollbar">
        {primarySummary && (
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {primarySummary.questionLabel}
            </p>
            <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900 dark:text-slate-100">
              {headline}
            </p>
            {detailParts.length > 0 && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                {detailParts.join(" · ")}
              </p>
            )}
          </div>
        )}

        {scene.totalPrice > 0 && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Indicative total
            </p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              ${scene.totalPrice.toFixed(0)}
            </p>
            <p className="text-[10px] text-slate-400">From selected option prices</p>
          </div>
        )}

        {scene.checkboxFeatures.length > 0 && (
          <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Included options
            </p>
            <ul className="space-y-1.5">
              {scene.checkboxFeatures.map((label) => (
                <li
                  key={label}
                  className="flex items-start gap-2 text-[11px] text-slate-700 dark:text-slate-300"
                >
                  <Check
                    className="mt-0.5 size-3.5 shrink-0 text-emerald-600"
                    strokeWidth={2.5}
                  />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
    </>
  );
};
