"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check } from "lucide-react";
import type { KioskConfig, KioskOption } from "../types/kiosk.types";
import {
  computeLiveBuildScene,
  type KioskAnswerValue,
  type LiveBuildOverlay,
} from "../utils/kiosk-live-build";
import { applyColorFill } from "../utils/kiosk-color-fill";
import {
  kioskPlacementOverlayClass,
  kioskPlacementScaleRatioClass,
} from "../utils/kiosk-placement-styles";
import { cn } from "@/core/utils/http.util";

interface LiveBuildOverlayItemProps {
  layer: LiveBuildOverlay;
  sizeClass?: string;
  shadow?: boolean;
}

const LiveBuildOverlayItem: React.FC<LiveBuildOverlayItemProps> = ({
  layer,
  sizeClass = "size-10",
  shadow = false,
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
        kioskPlacementOverlayClass(
          layer.position,
          kioskPlacementScaleRatioClass(layer.scaleRatio, sizeClass),
        ),
        shadow && "shadow-md",
      )}
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
}

export const KioskLiveBuildPanel: React.FC<KioskLiveBuildPanelProps> = ({
  config,
  answers,
  livePreviewOptions,
  className,
  compact = false,
}) => {
  const scene = useMemo(
    () => computeLiveBuildScene(config, answers, livePreviewOptions),
    [config, answers, livePreviewOptions],
  );

  const [tintedCanvasSrc, setTintedCanvasSrc] = useState<string | null>(null);
  const [tintLoading, setTintLoading] = useState(false);

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
  );
};
