"use client";

import * as React from "react";
import type { DrawingPlot } from "@/features/projects/types/drawing.types";
import { collectDrawingPins } from "@/features/projects/utils/drawing-list-pins.util";
import { cn } from "@/core/utils/http.util";

/** Aspect ratio of the card thumbnail container (16:10). */
const THUMBNAIL_AR = 16 / 10;

type Props = {
  plots?: DrawingPlot[] | null;
  activePinId?: number;
  className?: string;
  /**
   * Natural aspect ratio of the actual drawing file (width / height).
   * When provided the overlay clips pins that fall outside the visible
   * portion of the thumbnail (e.g. the bottom of a portrait PDF).
   */
  naturalAspect?: number | null;
}

function TinyPin({ color }: { color: string }) {
  return (
    <svg
      width="7"
      height="9"
      viewBox="0 0 7 9"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
      aria-hidden
    >
      <circle cx="3.5" cy="3.5" r="2.75" fill="white" stroke={color} strokeWidth="1.25" />
      <path d="M3.5 8.25L2.6 6.35H4.4L3.5 8.25Z" fill={color} />
    </svg>
  );
}

/**
 * Renders very small pin markers at API coordinates on a drawing thumbnail.
 *
 * Pins whose coordinates fall outside the visible clipped area of the
 * thumbnail are hidden so they don't appear floating over the card UI.
 */
export function DrawingPinThumbnailOverlay({ plots, activePinId, className, naturalAspect }: Props) {
  const pins = React.useMemo(() => {
    const all = collectDrawingPins(plots);
    return activePinId != null ? all.filter((p) => p.id === activePinId) : all;
  }, [plots, activePinId]);

  /**
   * Compute what fraction of the image height is actually visible inside
   * the thumbnail container and what fraction of the image width is visible.
   *
   * The thumbnail container has a fixed 16:10 aspect ratio. The image is
   * rendered at its natural aspect ratio scaled to fill the container width
   * (object-top / PDF width-fit). Any excess height is clipped.
   *
   * visibleHeightFraction = containerAR / imageAR  (capped at 1)
   * visibleWidthFraction  = 1 always (image fills full width)
   */
  const { visibleYFraction } = React.useMemo(() => {
    if (!naturalAspect || naturalAspect <= 0) {
      return { visibleYFraction: 1 };
    }
    // The PDF/image is rendered at container width, so rendered height = containerWidth / imageAR.
    // Container height = containerWidth / thumbnailAR.
    // visibleYFraction = containerHeight / renderedHeight = imageAR / thumbnailAR.
    // For portrait drawings (imageAR < thumbnailAR): fraction < 1, bottom is clipped.
    // For landscape drawings (imageAR >= thumbnailAR): full height fits, fraction = 1.
    const visibleYFraction = Math.min(1, naturalAspect / THUMBNAIL_AR);
    return { visibleYFraction };
  }, [naturalAspect]);

  // Margin in % to allow pins whose tip just crosses the boundary to still show.
  const EDGE_MARGIN = 2;

  const visiblePins = React.useMemo(() => {
    if (visibleYFraction >= 1) return pins; // full image is visible — show all
    const maxY = visibleYFraction * 100; // e.g. 62.5% for A4 in 16:10 thumbnail
    return pins.filter((p) => p.y_coordinate <= maxY + EDGE_MARGIN);
  }, [pins, visibleYFraction]);

  if (!visiblePins.length) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {visiblePins.map((pin) => {
        const color = pin.status_detail?.bg_colour || "#10b981";
        // Rescale y coordinate from image-space % to container-space %.
        // pin.y_coordinate is a % of the full image height.
        // The container shows visibleYFraction of that height.
        // So the pin's position within the container = (pinY / maxVisibleY) * 100.
        const containerY = visibleYFraction < 1
          ? (pin.y_coordinate / (visibleYFraction * 100)) * 100
          : pin.y_coordinate;
        return (
          <span
            key={pin.id}
            className="absolute"
            style={{
              left: `${pin.x_coordinate}%`,
              top: `${containerY}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <TinyPin color={color} />
          </span>
        );
      })}
    </div>
  );
}
