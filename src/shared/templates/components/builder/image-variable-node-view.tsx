"use client";

import React, { useState, useRef, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Image as ImageIcon,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  FlipHorizontal,
  ZoomIn,
  ZoomOut,
  GripVertical,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";

export function ImageVariableNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const imageKey = (node.attrs.imageKey as string) || "image_key";
  const alignment = (node.attrs.alignment as string) || "left";
  const width = (node.attrs.width as string) || "360px";
  const height = (node.attrs.height as string) || "auto";
  const scale = Number(node.attrs.scale ?? 1);
  const rotate = Number(node.attrs.rotate ?? 0);
  const flipH = Boolean(node.attrs.flipH);

  const [isResizing, setIsResizing] = useState(false);
  const [currentDimensions, setCurrentDimensions] = useState<{ w: number; h: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAlign = (align: "left" | "center" | "right") => {
    updateAttributes({ alignment: align });
  };

  const handleRotate = () => {
    const nextRotate = ((rotate || 0) + 90) % 360;
    updateAttributes({ rotate: nextRotate });
  };

  const handleFlip = () => {
    updateAttributes({ flipH: !flipH });
  };

  const handleZoom = (delta: number) => {
    const nextScale = Math.max(0.25, Math.min(3, Math.round((scale + delta) * 100) / 100));
    updateAttributes({ scale: nextScale });
  };

  const handlePresetWidth = (preset: "25%" | "50%" | "75%" | "100%" | "360px") => {
    updateAttributes({ width: preset });
  };

  // Pointer drag resize (supports horizontal, vertical, and diagonal corner resizing)
  const startResize = useCallback(
    (direction: "e" | "w" | "s" | "n" | "se" | "sw", e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const card = cardRef.current;
      if (!card) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = card.getBoundingClientRect().width;
      const startHeight = card.getBoundingClientRect().height;
      const parentWidth = containerRef.current?.parentElement?.clientWidth || 800;

      setIsResizing(true);
      setCurrentDimensions({ w: Math.round(startWidth), h: Math.round(startHeight) });

      let lastW = Math.round(startWidth);
      let lastH = Math.round(startHeight);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let newW = startWidth;
        let newH = startHeight;

        // Horizontal sizing
        if (direction === "e" || direction === "se") {
          newW = startWidth + deltaX;
        } else if (direction === "w" || direction === "sw") {
          newW = startWidth - deltaX;
        }

        // Vertical sizing
        if (direction === "s" || direction === "se" || direction === "sw") {
          newH = startHeight + deltaY;
        } else if (direction === "n") {
          newH = startHeight - deltaY;
        }

        newW = Math.max(160, Math.min(parentWidth, newW));
        newH = Math.max(80, newH);

        lastW = Math.round(newW);
        lastH = Math.round(newH);

        setCurrentDimensions({ w: lastW, h: lastH });

        if (direction === "e" || direction === "w") {
          card.style.width = `${lastW}px`;
        } else if (direction === "s" || direction === "n") {
          card.style.height = `${lastH}px`;
        } else {
          card.style.width = `${lastW}px`;
          card.style.height = `${lastH}px`;
        }
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        setIsResizing(false);
        setCurrentDimensions(null);

        if (direction === "e" || direction === "w") {
          updateAttributes({ width: `${lastW}px` });
        } else if (direction === "s" || direction === "n") {
          updateAttributes({ height: `${lastH}px` });
        } else {
          updateAttributes({ width: `${lastW}px`, height: `${lastH}px` });
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [updateAttributes],
  );

  const containerMargin =
    alignment === "center"
      ? "mx-auto"
      : alignment === "right"
      ? "ml-auto mr-0"
      : "mr-auto ml-0";

  const isSelected = selected || isResizing;

  // Build the dynamic comment string to display
  const commentString = `<!--Image key="${imageKey}" width="${width}" height="${height}" scale="${scale}" alignment="${alignment}" rotate="${rotate}" flipH="${flipH}" -->`;

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn(
        "my-4 relative group select-none transition-all",
        containerMargin,
      )}
      style={{
        width: typeof width === "number" ? `${width}px` : width,
        maxWidth: "100%",
      }}
    >
      <div
        ref={cardRef}
        className={cn(
          "relative rounded-xl border-2 border-dashed transition-all overflow-visible bg-slate-50/80 dark:bg-slate-900/80",
          isSelected
            ? "border-blue-500 shadow-md ring-2 ring-blue-500/20"
            : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600",
        )}
        style={{
          height: height !== "auto" ? height : undefined,
          minHeight: "140px",
        }}
      >
        {/* Floating Quick Actions Bar on Hover / Selection */}
        <div
          className={cn(
            "absolute -top-10 left-0 right-auto flex items-center gap-1 bg-white/95 dark:bg-slate-800/95 shadow-md border border-slate-200 dark:border-slate-700 rounded-lg p-1 z-30 transition-opacity",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {/* Drag Handle */}
          <div
            data-drag-handle
            title="Drag to reposition"
            className="cursor-grab active:cursor-grabbing p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <GripVertical size={13} />
          </div>

          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Alignment */}
          <button
            type="button"
            title="Align Left"
            onClick={() => handleAlign("left")}
            className={cn(
              "p-1 rounded text-xs transition-colors",
              alignment === "left"
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            <AlignLeft size={13} />
          </button>
          <button
            type="button"
            title="Align Center"
            onClick={() => handleAlign("center")}
            className={cn(
              "p-1 rounded text-xs transition-colors",
              alignment === "center"
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            <AlignCenter size={13} />
          </button>
          <button
            type="button"
            title="Align Right"
            onClick={() => handleAlign("right")}
            className={cn(
              "p-1 rounded text-xs transition-colors",
              alignment === "right"
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            <AlignRight size={13} />
          </button>

          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Rotate & Flip */}
          <button
            type="button"
            title={`Rotate 90° (current: ${rotate}°)`}
            onClick={handleRotate}
            className="p-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <RotateCw size={13} />
          </button>
          <button
            type="button"
            title={`Flip horizontally (${flipH ? "flipped" : "normal"})`}
            onClick={handleFlip}
            className={cn(
              "p-1 rounded text-xs transition-colors",
              flipH
                ? "bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            <FlipHorizontal size={13} />
          </button>

          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Scale controls */}
          <button
            type="button"
            title="Scale down"
            onClick={() => handleZoom(-0.1)}
            className="p-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ZoomOut size={13} />
          </button>
          <span className="text-[10px] font-mono text-slate-500 px-0.5 min-w-[28px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            title="Scale up"
            onClick={() => handleZoom(0.1)}
            className="p-1 rounded text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <ZoomIn size={13} />
          </button>

          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Width Presets */}
          <button
            type="button"
            onClick={() => handlePresetWidth("50%")}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
              width === "50%"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            50%
          </button>
          <button
            type="button"
            onClick={() => handlePresetWidth("100%")}
            className={cn(
              "px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors",
              width === "100%"
                ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 font-bold"
                : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700",
            )}
          >
            100%
          </button>

          <div className="w-px h-3 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Delete */}
          <button
            type="button"
            title="Remove dynamic image block"
            onClick={deleteNode}
            className="p-1 rounded text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Live Resizing Dimensions Indicator */}
        {isResizing && currentDimensions && (
          <div className="absolute -top-7 right-2 z-30 rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-white shadow-md">
            {currentDimensions.w} × {currentDimensions.h} px
          </div>
        )}

        {/* Dynamic Image Body */}
        <div className="flex flex-col items-center justify-center p-6 text-center min-h-[140px] h-full overflow-hidden">
          <div
            className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-inner transition-transform duration-200 shrink-0"
            style={{
              transform: `rotate(${rotate}deg) scaleX(${flipH ? -1 : 1}) scale(${scale})`,
              transformOrigin: "center center",
            }}
          >
            <ImageIcon size={24} />
          </div>
        </div>

        {/* Resize Handles (Corners & Sides for Vertical and Horizontal Resizing) */}
        {isSelected && (
          <>
            {/* Top Handle (Vertical) */}
            <div
              onPointerDown={(e) => startResize("n", e)}
              title="Drag to resize height (top)"
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ns-resize hover:scale-125 transition-transform z-20 flex items-center justify-center"
            >
              <div className="h-0.5 w-3 bg-blue-500" />
            </div>

            {/* Bottom Handle (Vertical) */}
            <div
              onPointerDown={(e) => startResize("s", e)}
              title="Drag to resize height (bottom)"
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ns-resize hover:scale-125 transition-transform z-20 flex items-center justify-center"
            >
              <div className="h-0.5 w-3 bg-blue-500" />
            </div>

            {/* Right Handle (Horizontal) */}
            <div
              onPointerDown={(e) => startResize("e", e)}
              title="Drag to resize width (right)"
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 h-8 w-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform z-20 flex items-center justify-center"
            >
              <div className="w-0.5 h-3 bg-blue-500" />
            </div>

            {/* Left Handle (Horizontal) */}
            <div
              onPointerDown={(e) => startResize("w", e)}
              title="Drag to resize width (left)"
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 h-8 w-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform z-20 flex items-center justify-center"
            >
              <div className="w-0.5 h-3 bg-blue-500" />
            </div>

            {/* Bottom-Right Handle (Corner) */}
            <div
              onPointerDown={(e) => startResize("se", e)}
              title="Drag to resize width and height"
              className="absolute -bottom-1.5 -right-1.5 size-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform z-20"
            />

            {/* Bottom-Left Handle (Corner) */}
            <div
              onPointerDown={(e) => startResize("sw", e)}
              title="Drag to resize width and height"
              className="absolute -bottom-1.5 -left-1.5 size-3.5 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nesw-resize hover:scale-125 transition-transform z-20"
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
