"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import {
  Palette,
  Square,
  Maximize2,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ChevronDown,
  Ban,
  Check,
  Move,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";

const PRESET_BG_COLORS = [
  { label: "Transparent", value: "transparent" },
  { label: "Light Slate", value: "#f8fafc" },
  { label: "Muted Gray", value: "#f1f5f9" },
  { label: "Soft Blue", value: "#eff6ff" },
  { label: "Soft Green", value: "#f0fdf4" },
  { label: "Soft Amber", value: "#fffbeb" },
  { label: "Soft Rose", value: "#fff1f2" },
  { label: "Soft Purple", value: "#faf5ff" },
  { label: "Soft Teal", value: "#f0fdfa" },
  { label: "Dark Slate", value: "#1e293b" },
  { label: "Pure White", value: "#ffffff" },
  { label: "Solid Blue", value: "#2563eb" },
  { label: "Solid Emerald", value: "#059669" },
  { label: "Solid Amber", value: "#d97706" },
];

const PRESET_BORDER_COLORS = [
  { label: "Slate", value: "#cbd5e1" },
  { label: "Dark Slate", value: "#475569" },
  { label: "Blue", value: "#3b82f6" },
  { label: "Green", value: "#10b981" },
  { label: "Amber", value: "#f59e0b" },
  { label: "Red", value: "#ef4444" },
  { label: "Purple", value: "#8b5cf6" },
  { label: "Black", value: "#000000" },
];

const WIDTH_PRESETS = [
  { label: "25%", value: "25%" },
  { label: "33%", value: "33%" },
  { label: "50%", value: "50%" },
  { label: "66%", value: "66%" },
  { label: "75%", value: "75%" },
  { label: "100%", value: "100%" },
];

type ResizeDirection =
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

type Corner = "top-left" | "top-right" | "bottom-left" | "bottom-right";

export function ContainerBoxNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const bgColor = node.attrs.backgroundColor || "#f8fafc";
  const borderColor = node.attrs.borderColor || "#cbd5e1";
  const borderWidth = node.attrs.borderWidth || "1px";
  const borderStyle = node.attrs.borderStyle || "solid";
  const borderRadius = node.attrs.borderRadius || "8px";
  const rawPadding = node.attrs.padding;
  const padding = (!rawPadding || rawPadding === "16px") ? "6px 10px" : rawPadding;
  const width = node.attrs.width || "100%";
  const rawMinHeight = node.attrs.minHeight;
  const minHeight = (!rawMinHeight || rawMinHeight === "64px") ? "28px" : rawMinHeight;
  const marginLeft = node.attrs.marginLeft || "0px";
  const alignment = (node.attrs.alignment as "left" | "center" | "right") || "left";

  const [activeMenu, setActiveMenu] = useState<"none" | "fill" | "border" | "transform">("none");
  const [isResizing, setIsResizing] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isRadiusDragging, setIsRadiusDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [resizeFeedback, setResizeFeedback] = useState<{ width: string; widthPct?: string; height: string; left?: string } | null>(null);
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null);
  const [radiusFeedback, setRadiusFeedback] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editor) return;

    const checkActive = () => {
      try {
        if (typeof getPos !== "function") {
          setIsFocused(false);
          return;
        }
        const pos = getPos();
        if (typeof pos !== "number") {
          setIsFocused(false);
          return;
        }
        const { from, to } = editor.state.selection;
        const inside = from >= pos && to <= pos + node.nodeSize;
        setIsFocused(inside);
      } catch {
        setIsFocused(false);
      }
    };

    checkActive();
    editor.on("selectionUpdate", checkActive);
    editor.on("focus", checkActive);
    editor.on("blur", checkActive);

    return () => {
      editor.off("selectionUpdate", checkActive);
      editor.off("focus", checkActive);
      editor.off("blur", checkActive);
    };
  }, [editor, getPos, node.nodeSize]);

  const isElementActive =
    Boolean(selected) ||
    isFocused ||
    activeMenu !== "none" ||
    isResizing ||
    isMoving ||
    isRadiusDragging;

  // Accurately compute printable document or containing column/table cell content width
  const getAvailableWidth = useCallback(() => {
    if (!containerRef.current) return 665;

    const wrapper = containerRef.current.closest(".container-box-wrapper") as HTMLElement | null;

    // 1. Check if inside a table cell (table column / side-by-side columns)
    const tableCell = wrapper?.closest("td, th") as HTMLElement | null;
    if (tableCell) {
      const computed = window.getComputedStyle(tableCell);
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      const innerWidth = tableCell.clientWidth - paddingLeft - paddingRight;
      if (innerWidth > 40) {
        return innerWidth;
      }
    }

    // 2. Check if inside a multi-column container
    const column = wrapper?.closest("[data-column], .column, [data-column-view], .columns-column") as HTMLElement | null;
    if (column) {
      const computed = window.getComputedStyle(column);
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      const innerWidth = column.clientWidth - paddingLeft - paddingRight;
      if (innerWidth > 40) {
        return innerWidth;
      }
    }

    // 3. Check if wrapper's parent is an inner container (not ProseMirror)
    if (wrapper?.parentElement && !wrapper.parentElement.classList.contains("ProseMirror")) {
      const parent = wrapper.parentElement;
      const computed = window.getComputedStyle(parent);
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      const innerWidth = parent.clientWidth - paddingLeft - paddingRight;
      if (innerWidth > 40) {
        return innerWidth;
      }
    }

    // 4. Default: Open document page (.ProseMirror)
    const proseMirror = containerRef.current.closest(".ProseMirror") as HTMLElement | null;
    if (proseMirror) {
      const computed = window.getComputedStyle(proseMirror);
      const paddingLeft = parseFloat(computed.paddingLeft) || 0;
      const paddingRight = parseFloat(computed.paddingRight) || 0;
      return Math.max(100, proseMirror.clientWidth - paddingLeft - paddingRight);
    }

    const page = containerRef.current.closest(".template-doc-editor") as HTMLElement | null;
    if (page) {
      return Math.max(100, page.clientWidth - 128);
    }

    return 665;
  }, []);

  // Compute starting left offset in px based on current alignment/margin
  const getInitialLeftPx = useCallback((availableWidth: number, currentWidthPx: number) => {
    if (alignment === "center") {
      return Math.max(0, (availableWidth - currentWidthPx) / 2);
    }
    if (alignment === "right") {
      return Math.max(0, availableWidth - currentWidthPx);
    }
    return parseFloat(marginLeft) || 0;
  }, [alignment, marginLeft]);

  // Multi-directional Resize Drag Handler (Top, Bottom, Left, Right, Corners)
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: ResizeDirection) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);

      const availableWidth = getAvailableWidth();
      const rawElementWidth = containerRef.current?.offsetWidth || 300;
      const initialElementWidth = Math.min(rawElementWidth, availableWidth);
      const initialElementHeight = containerRef.current?.offsetHeight || 64;
      const initialLeftPx = Math.min(
        getInitialLeftPx(availableWidth, initialElementWidth),
        Math.max(0, availableWidth - initialElementWidth),
      );

      const startX = e.clientX;
      const startY = e.clientY;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let targetWidthPx = initialElementWidth;
        let targetLeftPx = initialLeftPx;
        let shouldUpdateWidth = false;
        let shouldUpdateLeft = false;

        const minW = Math.min(60, availableWidth * 0.2);

        // 1. Horizontal sizing & positioning
        if (direction === "right" || direction === "top-right" || direction === "bottom-right") {
          // Right edge: left remains pinned, width changes
          targetWidthPx = Math.max(minW, Math.min(availableWidth - initialLeftPx, initialElementWidth + deltaX));
          shouldUpdateWidth = true;
        } else if (direction === "left" || direction === "top-left" || direction === "bottom-left") {
          // Left edge: moves left position AND updates width so right edge stays pinned!
          const maxDeltaX = initialElementWidth - minW;
          const clampedDeltaX = Math.min(maxDeltaX, Math.max(-initialLeftPx, deltaX));
          targetLeftPx = Math.max(0, initialLeftPx + clampedDeltaX);
          targetWidthPx = Math.max(minW, initialElementWidth - clampedDeltaX);
          shouldUpdateWidth = true;
          shouldUpdateLeft = true;
        }

        // 2. Vertical sizing
        let targetHeightPx = initialElementHeight;
        let shouldUpdateHeight = false;

        if (direction === "bottom" || direction === "bottom-right" || direction === "bottom-left") {
          targetHeightPx = Math.max(48, Math.round(initialElementHeight + deltaY));
          shouldUpdateHeight = true;
        } else if (direction === "top" || direction === "top-right" || direction === "top-left") {
          targetHeightPx = Math.max(48, Math.round(initialElementHeight - deltaY));
          shouldUpdateHeight = true;
        }

        const newAttrs: {
          width?: string;
          minHeight?: string;
          marginLeft?: string;
          alignment?: "left" | "center" | "right";
        } = {};

        let widthPctDisplay: string | undefined;
        if (shouldUpdateWidth) {
          const pct = Math.min(100, Math.max(10, Math.round((targetWidthPx / availableWidth) * 100)));
          widthPctDisplay = `${pct}%`;
          newAttrs.width = `${pct}%`;
        }

        if (shouldUpdateLeft) {
          newAttrs.marginLeft = `${Math.round(targetLeftPx)}px`;
          newAttrs.alignment = "left";
        }

        if (shouldUpdateHeight) {
          newAttrs.minHeight = `${targetHeightPx}px`;
        }

        setResizeFeedback({
          width: `${Math.round(targetWidthPx)}px`,
          widthPct: widthPctDisplay,
          height: `${Math.round(targetHeightPx)}px`,
          left: shouldUpdateLeft ? `${Math.round(targetLeftPx)}px` : undefined,
        });

        updateAttributes(newAttrs);
      };

      const onMouseUp = () => {
        setIsResizing(false);
        setResizeFeedback(null);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getAvailableWidth, getInitialLeftPx, updateAttributes],
  );

  // Free Drag Move Handler (Reposition box anywhere across the page)
  const handleMoveStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsMoving(true);

      const availableWidth = getAvailableWidth();
      const rawElementWidth = containerRef.current?.offsetWidth || 300;
      const elementWidth = Math.min(rawElementWidth, availableWidth);
      const initialLeftPx = Math.min(
        getInitialLeftPx(availableWidth, elementWidth),
        Math.max(0, availableWidth - elementWidth),
      );
      const startX = e.clientX;

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const maxLeft = Math.max(0, availableWidth - elementWidth);
        const newLeftPx = Math.max(0, Math.min(maxLeft, Math.round(initialLeftPx + deltaX)));

        setMoveFeedback(`Left: ${newLeftPx}px`);
        updateAttributes({
          marginLeft: `${newLeftPx}px`,
          alignment: "left",
        });
      };

      const onMouseUp = () => {
        setIsMoving(false);
        setMoveFeedback(null);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getAvailableWidth, getInitialLeftPx, updateAttributes],
  );

  // Direct Corner Radius Drag Handler (Directly on corner)
  const handleRadiusStart = useCallback(
    (e: React.MouseEvent, corner: Corner) => {
      e.preventDefault();
      e.stopPropagation();
      setIsRadiusDragging(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const currentRadius = parseInt(borderRadius, 10) || 0;
      const elementWidth = containerRef.current?.offsetWidth || 200;
      const elementHeight = containerRef.current?.offsetHeight || 100;
      const maxRadius = Math.floor(Math.min(elementWidth, elementHeight) / 2);

      const onMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let radialDelta = 0;
        if (corner === "top-left") {
          radialDelta = (deltaX + deltaY) / 1.5;
        } else if (corner === "top-right") {
          radialDelta = (-deltaX + deltaY) / 1.5;
        } else if (corner === "bottom-left") {
          radialDelta = (deltaX - deltaY) / 1.5;
        } else if (corner === "bottom-right") {
          radialDelta = (-deltaX - deltaY) / 1.5;
        }

        const calculatedRadius = Math.max(0, Math.min(maxRadius, Math.round(currentRadius + radialDelta)));
        setRadiusFeedback(`${calculatedRadius}px`);
        updateAttributes({ borderRadius: `${calculatedRadius}px` });
      };

      const onMouseUp = () => {
        setIsRadiusDragging(false);
        setRadiusFeedback(null);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [borderRadius, updateAttributes],
  );

  const handleRadiusDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const currentRadius = parseInt(borderRadius, 10) || 0;
      const nextRadius = currentRadius > 0 ? "0px" : "12px";
      updateAttributes({ borderRadius: nextRadius });
    },
    [borderRadius, updateAttributes],
  );

  const isDarkBg =
    bgColor === "#1e293b" ||
    bgColor === "#000000" ||
    bgColor === "#2563eb" ||
    bgColor === "#059669" ||
    bgColor === "#d97706";

  let activeMargin = "4px 0";
  if (alignment === "center") {
    activeMargin = "4px auto";
  } else if (alignment === "right") {
    activeMargin = "4px 0 4px auto";
  } else if (marginLeft && marginLeft !== "0px") {
    activeMargin = `4px 0 4px ${marginLeft}`;
  }

  return (
    <NodeViewWrapper
      className={cn(
        "container-box-wrapper relative my-0.5 block select-none-drag",
        isElementActive && "z-30 relative",
      )}
      style={{
        width,
        margin: activeMargin,
        maxWidth: "100%",
      }}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative transition-[box-shadow,border-radius] duration-100",
          isElementActive && "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900",
        )}
        style={{
          backgroundColor: bgColor,
          border: borderStyle === "none" ? "none" : `${borderWidth} ${borderStyle} ${borderColor}`,
          borderRadius,
          padding,
          color: isDarkBg ? "#ffffff" : "inherit",
          minHeight,
          boxSizing: "border-box",
        }}
      >
        {/* Floating Quick Action Toolbar: ONLY rendered when clicked on the element */}
        {isElementActive && (
          <div
            contentEditable={false}
            className="absolute -top-9 left-0 z-50 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-md shadow-md px-1.5 py-1 text-xs select-none pointer-events-auto animate-in fade-in duration-100"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Drag to Move Box Handle */}
          <div
            onMouseDown={handleMoveStart}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded cursor-grab active:cursor-grabbing text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-semibold text-[11px] select-none border-r border-slate-200 dark:border-slate-700 pr-2"
            title="Drag horizontally to move box position across the page"
          >
            <GripHorizontal size={13} className="text-blue-600" />
            <span>Move</span>
          </div>

          {/* 1. Fill Color Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu((curr) => (curr === "fill" ? "none" : "fill"))}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                activeMenu === "fill"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
              title="Box Background Color"
            >
              <Palette size={12} />
              <div
                className="size-3 rounded-xs border border-black/20"
                style={{ backgroundColor: bgColor === "transparent" ? "#ffffff" : bgColor }}
              />
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {activeMenu === "fill" && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setActiveMenu("none")} />
                <div className="absolute top-full left-0 mt-1 z-[60] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2 w-48 text-slate-900 dark:text-slate-100">
                  <div className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-700">
                    Background Color
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 mb-2">
                    {PRESET_BG_COLORS.map((c) => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => {
                          updateAttributes({ backgroundColor: c.value });
                          setActiveMenu("none");
                        }}
                        title={c.label}
                        className={cn(
                          "size-5 rounded-[3px] border flex items-center justify-center transition-all cursor-pointer",
                          bgColor === c.value
                            ? "border-slate-900 dark:border-white ring-1.5 ring-blue-500"
                            : "border-black/20 dark:border-white/20 hover:border-black/50",
                        )}
                        style={{
                          backgroundColor: c.value === "transparent" ? "#ffffff" : c.value,
                        }}
                      >
                        {c.value === "transparent" && <Ban size={10} className="text-red-500" />}
                        {bgColor === c.value && c.value !== "transparent" && (
                          <Check
                            size={10}
                            className={c.value === "#ffffff" ? "text-slate-900 stroke-[2.5]" : "text-white stroke-[2.5]"}
                          />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Input */}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <label
                      htmlFor="custom-box-bg"
                      className="text-xs font-semibold text-slate-800 dark:text-slate-200 cursor-pointer hover:text-blue-600"
                    >
                      Custom fill
                    </label>
                    <div className="relative flex items-center">
                      <div
                        className="size-5 rounded-[3px] border border-black/25 pointer-events-none"
                        style={{ backgroundColor: bgColor === "transparent" ? "#ffffff" : bgColor }}
                      />
                      <input
                        id="custom-box-bg"
                        type="color"
                        value={bgColor === "transparent" ? "#ffffff" : bgColor}
                        onChange={(e) => updateAttributes({ backgroundColor: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 2. Border & Corner Controls */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu((curr) => (curr === "border" ? "none" : "border"))}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                activeMenu === "border"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
              title="Border & Corners"
            >
              <span>Border</span>
              <span className="text-[10px] text-slate-400 font-normal">({borderRadius})</span>
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {activeMenu === "border" && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setActiveMenu("none")} />
                <div className="absolute top-full left-0 mt-1 z-[60] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2 w-54 text-slate-900 dark:text-slate-100 space-y-2">
                  {/* Style */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                      Border Style
                    </span>
                    <div className="grid grid-cols-4 gap-1">
                      {(["none", "solid", "dashed", "dotted"] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => updateAttributes({ borderStyle: st })}
                          className={cn(
                            "px-1.5 py-1 rounded text-[10.5px] capitalize font-medium border text-center transition-colors cursor-pointer",
                            borderStyle === st
                              ? "bg-blue-600 text-white border-blue-600"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700",
                          )}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Width & Corners */}
                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <div>
                      <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                        Width
                      </span>
                      <div className="flex gap-1">
                        {["1px", "2px", "3px"].map((w) => (
                          <button
                            key={w}
                            type="button"
                            onClick={() => updateAttributes({ borderWidth: w })}
                            className={cn(
                              "flex-1 py-0.5 rounded text-[10.5px] border font-medium text-center",
                              borderWidth === w
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-100",
                            )}
                          >
                            {w}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                        Radius
                      </span>
                      <div className="flex gap-1">
                        {["0px", "4px", "8px", "16px"].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => updateAttributes({ borderRadius: r })}
                            className={cn(
                              "flex-1 py-0.5 rounded text-[10px] border font-medium text-center",
                              borderRadius === r
                                ? "bg-blue-600 text-white border-blue-600"
                                : "border-slate-200 dark:border-slate-700 hover:bg-slate-100",
                            )}
                          >
                            {r.replace("px", "")}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Border Color */}
                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                      Border Color
                    </span>
                    <div className="grid grid-cols-8 gap-1">
                      {PRESET_BORDER_COLORS.map((bc) => (
                        <button
                          key={bc.value}
                          type="button"
                          onClick={() => updateAttributes({ borderColor: bc.value })}
                          className={cn(
                            "size-4 rounded-xs border transition-all cursor-pointer",
                            borderColor === bc.value ? "ring-2 ring-blue-500 scale-110" : "border-black/20",
                          )}
                          style={{ backgroundColor: bc.value }}
                          title={bc.label}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 3. Width & Alignment (Transformation) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setActiveMenu((curr) => (curr === "transform" ? "none" : "transform"))}
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium transition-colors",
                activeMenu === "transform"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700",
              )}
              title="Transform Width & Alignment"
            >
              <Maximize2 size={12} />
              <span>{width}</span>
              <ChevronDown size={10} className="text-slate-400" />
            </button>

            {activeMenu === "transform" && (
              <>
                <div className="fixed inset-0 z-50" onClick={() => setActiveMenu("none")} />
                <div className="absolute top-full left-0 mt-1 z-[60] bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2 w-52 text-slate-900 dark:text-slate-100 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                      Width Preset
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {WIDTH_PRESETS.map((wp) => (
                        <button
                          key={wp.value}
                          type="button"
                          onClick={() => {
                            updateAttributes({ width: wp.value });
                            setActiveMenu("none");
                          }}
                          className={cn(
                            "px-1.5 py-1 rounded text-xs border font-medium text-center transition-colors cursor-pointer",
                            width === wp.value
                              ? "bg-blue-600 text-white border-blue-600 font-semibold"
                              : "border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700",
                          )}
                        >
                          {wp.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider block mb-1">
                      Box Alignment
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => updateAttributes({ alignment: "left", marginLeft: "0px" })}
                        className={cn(
                          "flex-1 py-1 rounded flex items-center justify-center border transition-colors",
                          alignment === "left" && (!marginLeft || marginLeft === "0px")
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-200 hover:bg-slate-100",
                        )}
                        title="Align Left (0px)"
                      >
                        <AlignLeft size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAttributes({ alignment: "center", marginLeft: "0px" })}
                        className={cn(
                          "flex-1 py-1 rounded flex items-center justify-center border transition-colors",
                          alignment === "center"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-200 hover:bg-slate-100",
                        )}
                        title="Align Center"
                      >
                        <AlignCenter size={13} />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateAttributes({ alignment: "right", marginLeft: "0px" })}
                        className={cn(
                          "flex-1 py-1 rounded flex items-center justify-center border transition-colors",
                          alignment === "right"
                            ? "bg-blue-600 text-white border-blue-600"
                            : "border-slate-200 hover:bg-slate-100",
                        )}
                        title="Align Right"
                      >
                        <AlignRight size={13} />
                      </button>
                    </div>
                    {marginLeft && marginLeft !== "0px" && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Custom position: {marginLeft} from left
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Delete Button */}
          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            title="Delete Container Box"
          >
            <Trash2 size={12} />
          </button>
        </div>
      )}

      {/* Top Edge Move Bar (Subtle drag grip right on top edge): ONLY when clicked/active */}
      {isElementActive && (
        <div
          contentEditable={false}
          onMouseDown={handleMoveStart}
          className="absolute -top-1 left-8 right-8 h-2 cursor-grab active:cursor-grabbing z-20 flex items-center justify-center select-none"
          title="Drag horizontally to move box location"
        >
          <div className="w-16 h-1 rounded-full bg-slate-400/50 hover:bg-blue-500 transition-colors" />
        </div>
      )}

      {/* Live Editable Content Inside the Box */}
      <NodeViewContent className="outline-none focus:outline-none min-h-[22px] block" />

      {/* ============================================================== */}
      {/* CORNER RADIUS HANDLES: ONLY rendered when clicked on element  */}
      {/* ============================================================== */}
      {isElementActive &&
        (["top-left", "top-right", "bottom-left", "bottom-right"] as const).map((corner) => {
          const posClasses =
            corner === "top-left"
              ? "top-1.5 left-1.5"
              : corner === "top-right"
              ? "top-1.5 right-1.5"
              : corner === "bottom-left"
              ? "bottom-1.5 left-1.5"
              : "bottom-1.5 right-1.5";

          return (
            <div
              key={`radius-${corner}`}
              contentEditable={false}
              onMouseDown={(e) => handleRadiusStart(e, corner)}
              onDoubleClick={handleRadiusDoubleClick}
              className={cn(
                "absolute z-30 size-3 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-600 shadow-sm flex items-center justify-center transition-all cursor-crosshair select-none hover:scale-135 opacity-100",
                posClasses,
              )}
              title={`Corner Radius (${borderRadius}): Drag inwards to increase, outwards to decrease. Double-click to reset.`}
            >
              <div className="size-1 rounded-full bg-blue-600 pointer-events-none" />
            </div>
          );
        })}

      {/* ============================================================== */}
      {/* MULTI-DIRECTIONAL RESIZE HANDLES: ONLY when clicked on element */}
      {/* ============================================================== */}
      {isElementActive && (
        <>
          {/* 1. Top Edge Handle */}
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "top")}
            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-10 h-2 cursor-ns-resize flex items-center justify-center z-20 select-none opacity-100"
            title="Drag up/down to transform height (Top)"
          >
            <div className="w-8 h-1 rounded-full bg-blue-500 shadow-xs hover:bg-blue-600 transition-colors" />
          </div>

          {/* 2. Bottom Edge Handle */}
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "bottom")}
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-2 cursor-ns-resize flex items-center justify-center z-20 select-none opacity-100"
            title="Drag up/down to transform height (Bottom)"
          >
            <div className="w-8 h-1 rounded-full bg-blue-500 shadow-xs hover:bg-blue-600 transition-colors" />
          </div>

          {/* 3. Left Edge Handle */}
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "left")}
            className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2 h-10 cursor-ew-resize flex items-center justify-center z-20 select-none opacity-100"
            title="Drag left/right to move left edge and resize width"
          >
            <div className="w-1 h-8 rounded-full bg-blue-500 shadow-xs hover:bg-blue-600 transition-colors" />
          </div>

          {/* 4. Right Edge Handle */}
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "right")}
            className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2 h-10 cursor-ew-resize flex items-center justify-center z-20 select-none opacity-100"
            title="Drag left/right to transform width (Right)"
          >
            <div className="w-1 h-8 rounded-full bg-blue-500 shadow-xs hover:bg-blue-600 transition-colors" />
          </div>

          {/* 5. Corner Handles (Outer Bounding Corners) */}
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "top-left")}
            className="absolute -top-1 -left-1 size-2.5 bg-white dark:bg-slate-800 border-2 border-blue-600 rounded-[2px] shadow-xs cursor-nwse-resize hover:scale-125 transition-all z-20 select-none opacity-100"
            title="Drag corner to transform position, width, and height (Top-Left)"
          />
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "top-right")}
            className="absolute -top-1 -right-1 size-2.5 bg-white dark:bg-slate-800 border-2 border-blue-600 rounded-[2px] shadow-xs cursor-nesw-resize hover:scale-125 transition-all z-20 select-none opacity-100"
            title="Drag corner to transform width and height (Top-Right)"
          />
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "bottom-left")}
            className="absolute -bottom-1 -left-1 size-2.5 bg-white dark:bg-slate-800 border-2 border-blue-600 rounded-[2px] shadow-xs cursor-nesw-resize hover:scale-125 transition-all z-20 select-none opacity-100"
            title="Drag corner to transform position, width, and height (Bottom-Left)"
          />
          <div
            contentEditable={false}
            onMouseDown={(e) => handleResizeStart(e, "bottom-right")}
            className="absolute -bottom-1 -right-1 size-2.5 bg-white dark:bg-slate-800 border-2 border-blue-600 rounded-[2px] shadow-xs cursor-nwse-resize hover:scale-125 transition-all z-20 select-none opacity-100"
            title="Drag corner to transform width and height (Bottom-Right)"
          />
        </>
      )}

        {/* ============================================================== */}
        {/* LIVE HUD OVERLAYS (Visual indicator during drag/resize)        */}
        {/* ============================================================== */}
        {radiusFeedback && (
          <div
            contentEditable={false}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-1.5 backdrop-blur-sm select-none"
          >
            <div
              className="size-2.5 rounded-xs border border-white/70"
              style={{ borderRadius: radiusFeedback }}
            />
            <span>Radius: {radiusFeedback}</span>
          </div>
        )}

        {moveFeedback && (
          <div
            contentEditable={false}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-1.5 backdrop-blur-sm select-none"
          >
            <Move size={12} className="text-blue-400" />
            <span>Position: {moveFeedback}</span>
          </div>
        )}

        {resizeFeedback && (
          <div
            contentEditable={false}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none bg-slate-900/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-2 backdrop-blur-sm select-none"
          >
            <span>
              W: {resizeFeedback.width} {resizeFeedback.widthPct ? `(${resizeFeedback.widthPct})` : ""}
            </span>
            <span>×</span>
            <span>H: {resizeFeedback.height}</span>
            {resizeFeedback.left && <span>(Left: {resizeFeedback.left})</span>}
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

