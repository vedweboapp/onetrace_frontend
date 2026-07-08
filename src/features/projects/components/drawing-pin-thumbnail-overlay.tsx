"use client";

import * as React from "react";
import type { DrawingPlot } from "@/features/projects/types/drawing.types";
import { collectDrawingPins } from "@/features/projects/utils/drawing-list-pins.util";
import { cn } from "@/core/utils/http.util";

type Props = {
  plots?: DrawingPlot[] | null;
  activePinId?: number;   // ← add
  className?: string;
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

/** Renders very small pin markers at API coordinates on a drawing thumbnail. */
export function DrawingPinThumbnailOverlay({ plots, activePinId, className }: Props) {
  const pins = React.useMemo(() => {
    const all = collectDrawingPins(plots);
    return activePinId != null ? all.filter((p) => p.id === activePinId) : all;
  }, [plots, activePinId]);

  if (!pins.length) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {pins.map((pin) => {
        const color = pin.status_detail?.bg_colour || "#10b981";
        return (
          <span
            key={pin.id}
            className="absolute"
            style={{
              left: `${pin.x_coordinate}%`,
              top: `${pin.y_coordinate}%`,
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
