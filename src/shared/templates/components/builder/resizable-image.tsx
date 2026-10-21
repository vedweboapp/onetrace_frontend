"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  WrapText,
  RotateCw,
  FlipHorizontal,
  Trash2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";

type AlignmentType = "left" | "center" | "right" | "float-left" | "float-right";

// ── Portal Toolbar ──────────────────────────────────────────────────────────────
// Renders outside the table cell (at body level) so overflow:hidden doesn't clip it.
function ImageToolbarPortal({
  anchorRef,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({ position: "fixed", opacity: 0 });
  const toolbarRef = useRef<HTMLDivElement>(null);

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const toolbar = toolbarRef.current;
    if (!anchor) return;

    const rect = anchor.getBoundingClientRect();
    const toolbarH = toolbar?.offsetHeight ?? 40;
    const toolbarW = toolbar?.offsetWidth ?? 220;

    // Prefer above the image; fall back to below if not enough space
    const spaceAbove = rect.top;
    const top = spaceAbove >= toolbarH + 8
      ? rect.top - toolbarH - 6
      : rect.bottom + 6;

    // Centre horizontally over the image, clamp to viewport
    let left = rect.left + rect.width / 2 - toolbarW / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - toolbarW - 8));

    setStyle({ position: "fixed", top, left, zIndex: 99999, opacity: 1 });
  }, [anchorRef]);

  useEffect(() => {
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [reposition]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div ref={toolbarRef} style={style} onMouseDown={(e) => e.preventDefault()}>
      {children}
    </div>,
    document.body,
  );
}

export function ResizableImageView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) {
  const {
    src,
    alt,
    title,
    width: initialWidth,
    alignment = "center",
    rotate = 0,
    flipH = false,
  } = node.attrs;

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  // anchor = the inner image wrapper div, used for toolbar positioning
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState<string | number>(initialWidth || "auto");
  const [isResizing, setIsResizing] = useState(false);
  const [currentDimensions, setCurrentDimensions] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    setWidth(initialWidth || "auto");
  }, [initialWidth]);

  // Handle Resize Drag
  const startResize = useCallback(
    (direction: "se" | "sw" | "ne" | "nw" | "e" | "w" | "n" | "s", e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const img = imgRef.current;
      if (!img) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startWidth = img.getBoundingClientRect().width;
      const startHeight = img.getBoundingClientRect().height;
      const aspectRatio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : (startWidth / (startHeight || 1));
      const parentWidth = containerRef.current?.parentElement?.clientWidth || 800;

      setIsResizing(true);
      setCurrentDimensions({ w: Math.round(startWidth), h: Math.round(startHeight) });

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;
        let newWidth = startWidth;

        if (direction === "s") {
          const newH = Math.max(40, startHeight + deltaY);
          newWidth = Math.round(newH * aspectRatio);
        } else if (direction === "n") {
          const newH = Math.max(40, startHeight - deltaY);
          newWidth = Math.round(newH * aspectRatio);
        } else if (direction === "se" || direction === "ne" || direction === "e") {
          newWidth = startWidth + deltaX;
        } else if (direction === "sw" || direction === "nw" || direction === "w") {
          newWidth = startWidth - deltaX;
        }

        newWidth = Math.max(60, Math.min(parentWidth, newWidth));
        const newHeight = Math.round(newWidth / aspectRatio);

        setWidth(`${Math.round(newWidth)}px`);
        setCurrentDimensions({ w: Math.round(newWidth), h: newHeight });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        setIsResizing(false);
        setCurrentDimensions(null);

        if (imgRef.current) {
          const finalW = `${Math.round(imgRef.current.getBoundingClientRect().width)}px`;
          updateAttributes({ width: finalW });
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [updateAttributes],
  );

  const setAlignment = (newAlign: AlignmentType) => {
    updateAttributes({ alignment: newAlign });
  };

  const setPresetWidth = (preset: "25%" | "50%" | "75%" | "100%" | "auto") => {
    setWidth(preset);
    updateAttributes({ width: preset });
  };

  const handleRotate = () => {
    const nextRotate = ((rotate || 0) + 90) % 360;
    updateAttributes({ rotate: nextRotate });
  };

  const handleFlip = () => {
    updateAttributes({ flipH: !flipH });
  };

  const getAlignmentWrapperClasses = () => {
    switch (alignment) {
      case "left":
        return "flex justify-start my-3 clear-both";
      case "right":
        return "flex justify-end my-3 clear-both";
      case "float-left":
        return "float-left mr-4 mb-3 my-1";
      case "float-right":
        return "float-right ml-4 mb-3 my-1";
      case "center":
      default:
        return "flex justify-center my-3 clear-both";
    }
  };

  const isSelected = selected || isResizing;

  return (
    <NodeViewWrapper
      ref={containerRef}
      className={cn("relative transition-all select-none group", getAlignmentWrapperClasses())}
      data-drag-handle
    >
      <div
        ref={imageWrapperRef}
        className={cn(
          "relative inline-block leading-none transition-shadow",
          isSelected && "ring-2 ring-blue-500 ring-offset-2 rounded-sm shadow-md",
        )}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          maxWidth: "100%",
        }}
      >
        {/* Floating Transform Toolbar — rendered in a portal to escape table overflow */}
        {isSelected && (
          <ImageToolbarPortal anchorRef={imageWrapperRef}>
            <div
              className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white/95 px-1.5 py-1 shadow-xl backdrop-blur-xs dark:border-slate-700 dark:bg-slate-900/95"
              contentEditable={false}
            >
              {/* Alignments */}
              <button
                type="button"
                onClick={() => setAlignment("left")}
                title="Align Left"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  alignment === "left" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <AlignLeft size={14} />
              </button>
              <button
                type="button"
                onClick={() => setAlignment("center")}
                title="Align Center"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  alignment === "center" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <AlignCenter size={14} />
              </button>
              <button
                type="button"
                onClick={() => setAlignment("right")}
                title="Align Right"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  alignment === "right" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <AlignRight size={14} />
              </button>

              {/* Float (Text Wrap) */}
              <button
                type="button"
                onClick={() => setAlignment(alignment === "float-left" ? "left" : "float-left")}
                title="Float Left (Text wraps around)"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  alignment === "float-left" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <WrapText size={14} className="scale-x-[-1]" />
              </button>
              <button
                type="button"
                onClick={() => setAlignment(alignment === "float-right" ? "right" : "float-right")}
                title="Float Right (Text wraps around)"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  alignment === "float-right" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <WrapText size={14} />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Rotate & Flip */}
              <button
                type="button"
                onClick={handleRotate}
                title={`Rotate 90° (Current: ${rotate}°)`}
                className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <RotateCw size={14} />
              </button>
              <button
                type="button"
                onClick={handleFlip}
                title="Flip Horizontal"
                className={cn(
                  "p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800",
                  flipH && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
                )}
              >
                <FlipHorizontal size={14} />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Quick Size Presets */}
              <button
                type="button"
                onClick={() => setPresetWidth("25%")}
                title="25% width"
                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded dark:text-slate-300 dark:hover:bg-slate-800"
              >
                25%
              </button>
              <button
                type="button"
                onClick={() => setPresetWidth("50%")}
                title="50% width"
                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded dark:text-slate-300 dark:hover:bg-slate-800"
              >
                50%
              </button>
              <button
                type="button"
                onClick={() => setPresetWidth("100%")}
                title="100% width"
                className="px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 rounded dark:text-slate-300 dark:hover:bg-slate-800"
              >
                100%
              </button>
              <button
                type="button"
                onClick={() => setPresetWidth("auto")}
                title="Reset size"
                className="p-1 rounded text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Maximize2 size={13} />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-1" />

              {/* Delete */}
              <button
                type="button"
                onClick={deleteNode}
                title="Delete Image"
                className="p-1 rounded text-red-500 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </ImageToolbarPortal>
        )}

        {/* Live Resizing Dimensions Indicator */}
        {isResizing && currentDimensions && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 rounded-md bg-slate-900/85 px-2 py-0.5 text-[11px] font-medium text-white shadow-md">
            {currentDimensions.w} × {currentDimensions.h} px
          </div>
        )}

        {/* The Image Itself */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          title={title || ""}
          className="block w-full h-auto rounded-xs object-contain transition-transform"
          style={{
            transform: `rotate(${rotate || 0}deg) scaleX(${flipH ? -1 : 1})`,
            transformOrigin: "center center",
          }}
          draggable={false}
        />

        {/* Resize Handles (Corners & Sides) */}
        {isSelected && (
          <>
            {/* Top-Left */}
            <div
              onPointerDown={(e) => startResize("nw", e)}
              className="absolute -top-1.5 -left-1.5 z-20 size-3 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform"
            />
            {/* Top-Right */}
            <div
              onPointerDown={(e) => startResize("ne", e)}
              className="absolute -top-1.5 -right-1.5 z-20 size-3 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nesw-resize hover:scale-125 transition-transform"
            />
            {/* Bottom-Left */}
            <div
              onPointerDown={(e) => startResize("sw", e)}
              className="absolute -bottom-1.5 -left-1.5 z-20 size-3 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nesw-resize hover:scale-125 transition-transform"
            />
            {/* Bottom-Right */}
            <div
              onPointerDown={(e) => startResize("se", e)}
              className="absolute -bottom-1.5 -right-1.5 z-20 size-3 rounded-xs border-2 border-blue-600 bg-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform"
            />
            {/* Middle-Right */}
            <div
              onPointerDown={(e) => startResize("e", e)}
              title="Drag to resize width (right)"
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-20 h-4 w-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform"
            />
            {/* Middle-Left */}
            <div
              onPointerDown={(e) => startResize("w", e)}
              title="Drag to resize width (left)"
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-20 h-4 w-2 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform"
            />
            {/* Middle-Top */}
            <div
              onPointerDown={(e) => startResize("n", e)}
              title="Drag to resize height (top)"
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 z-20 h-2 w-4 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ns-resize hover:scale-125 transition-transform"
            />
            {/* Middle-Bottom */}
            <div
              onPointerDown={(e) => startResize("s", e)}
              title="Drag to resize height (bottom)"
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 z-20 h-2 w-4 rounded-xs border border-blue-600 bg-white shadow-xs cursor-ns-resize hover:scale-125 transition-transform"
            />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}
