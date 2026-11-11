"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  PenLine,
  Trash2,
  GripVertical,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RotateCw,
  FlipHorizontal,
  Maximize2,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  fetchModuleVariables,
  formatFieldLabel,
  formatModuleDisplayName,
  type VariableItem,
} from "../../api/template-variables.api";

export function SignatureNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const imageKey: string = node.attrs.imageKey || "";
  const initialWidth: string = node.attrs.width || "320px";
  const alignment: "left" | "center" | "right" = node.attrs.alignment || "left";
  const rotate: number = Number(node.attrs.rotate) || 0;
  const flipH: boolean = Boolean(node.attrs.flipH);

  const containerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const [width, setWidth] = useState<string | number>(initialWidth || "320px");
  const [isResizing, setIsResizing] = useState(false);
  const [currentDimensions, setCurrentDimensions] = useState<{ w: number; h: number } | null>(null);

  // Automatically show configuration when first dragged/dropped (imageKey is empty) or toggled
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!imageKey);
  const [moduleVars, setModuleVars] = useState<{
    primary: VariableItem[];
    related: Record<string, VariableItem[]>;
    primaryName: string;
  }>({
    primary: [],
    related: {},
    primaryName: "quotations",
  });
  const [loadingVars, setLoadingVars] = useState(false);

  useEffect(() => {
    setWidth(initialWidth || "320px");
  }, [initialWidth]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingVars(true);
      try {
        const data = await fetchModuleVariables("quotations");
        if (mounted) {
          setModuleVars({
            primary: data.primaryKeys,
            related: data.relatedModules,
            primaryName: data.moduleName || "quotations",
          });
        }
      } catch (e) {
        console.warn("Could not load variables for signature config:", e);
      } finally {
        if (mounted) setLoadingVars(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle pointer drag resize on the signature card
  const startResize = useCallback(
    (direction: "se" | "sw" | "ne" | "nw" | "e" | "w", e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const card = cardRef.current;
      if (!card) return;

      const startX = e.clientX;
      const startWidth = card.getBoundingClientRect().width;
      const startHeight = card.getBoundingClientRect().height;
      const parentWidth = containerRef.current?.parentElement?.clientWidth || 800;

      setIsResizing(true);
      setCurrentDimensions({ w: Math.round(startWidth), h: Math.round(startHeight) });

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        let newWidth = startWidth;

        if (direction === "se" || direction === "ne" || direction === "e") {
          newWidth = startWidth + deltaX;
        } else if (direction === "sw" || direction === "nw" || direction === "w") {
          newWidth = startWidth - deltaX;
        }

        newWidth = Math.max(160, Math.min(parentWidth, newWidth));
        setWidth(`${Math.round(newWidth)}px`);
        setCurrentDimensions({ w: Math.round(newWidth), h: Math.round(startHeight) });
      };

      const onPointerUp = () => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        setIsResizing(false);
        setCurrentDimensions(null);

        if (cardRef.current) {
          const finalW = `${Math.round(cardRef.current.getBoundingClientRect().width)}px`;
          updateAttributes({ width: finalW });
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    },
    [updateAttributes],
  );

  const setAlignment = (newAlign: "left" | "center" | "right") => {
    updateAttributes({ alignment: newAlign });
  };

  const setPresetWidth = (preset: "25%" | "50%" | "75%" | "100%" | "320px") => {
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

  const isSelected = selected || isResizing;

  return (
    <NodeViewWrapper
      ref={containerRef}
      className="my-4 select-none outline-none"
      style={{
        display: "flex",
        justifyContent:
          alignment === "center"
            ? "center"
            : alignment === "right"
            ? "flex-end"
            : "flex-start",
      }}
    >
      {/* ── Root: the dashed signature card (no outer shell) ── */}
      <div
        ref={cardRef}
        contentEditable={false}
        className={cn(
          "relative group overflow-visible rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col items-center justify-center min-h-[110px] p-5 transition-all select-none",
          isSelected && "border-blue-500 dark:border-blue-500",
        )}
        style={{
          width: typeof width === "number" ? `${width}px` : width,
          maxWidth: "100%",
        }}
      >
        {/* ── Floating toolbar — visible on hover or when selected ── */}
        <div
          className={cn(
            "absolute -top-9 left-0 z-40 flex items-center gap-1 transition-opacity duration-150",
            isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100",
          )}
        >
          {/* Drag Handle */}
          <div
            data-drag-handle
            title="Drag to reposition"
            className="cursor-grab active:cursor-grabbing p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 shadow-xs transition"
          >
            <GripVertical className="size-3.5" />
          </div>

          {/* Alignment Controls */}
          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={() => setAlignment("left")}
              title="Align Left"
              className={cn(
                "p-1 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                alignment === "left" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
              )}
            >
              <AlignLeft size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("center")}
              title="Align Center"
              className={cn(
                "p-1 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                alignment === "center" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
              )}
            >
              <AlignCenter size={12} />
            </button>
            <button
              type="button"
              onClick={() => setAlignment("right")}
              title="Align Right"
              className={cn(
                "p-1 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                alignment === "right" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
              )}
            >
              <AlignRight size={12} />
            </button>
          </div>

          {/* Rotate & Flip */}
          <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs">
            <button
              type="button"
              onClick={handleRotate}
              title={`Rotate 90° (Current: ${rotate}°)`}
              className={cn(
                "p-1 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-0.5",
                rotate > 0 && "text-blue-600 dark:text-blue-400",
              )}
            >
              <RotateCw size={12} />
              {rotate > 0 && <span className="text-[9px]">{rotate}°</span>}
            </button>
            <button
              type="button"
              onClick={handleFlip}
              title="Flip Horizontal"
              className={cn(
                "p-1 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                flipH && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
              )}
            >
              <FlipHorizontal size={12} />
            </button>
          </div>

          {/* Size Presets */}
          <div className="hidden sm:flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-0.5 shadow-xs text-[10px]">
            <button
              type="button"
              onClick={() => setPresetWidth("50%")}
              className={cn(
                "px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                width === "50%" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold",
              )}
            >
              50%
            </button>
            <button
              type="button"
              onClick={() => setPresetWidth("100%")}
              className={cn(
                "px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                width === "100%" && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold",
              )}
            >
              100%
            </button>
            <button
              type="button"
              onClick={() => setPresetWidth("320px")}
              className={cn(
                "px-1.5 py-0.5 rounded text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700 transition cursor-pointer",
                (width === "320px" || !width) && "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400 font-semibold",
              )}
            >
              <Maximize2 size={10} className="inline mr-0.5" />
              320px
            </button>
          </div>

          {/* Configure */}
          <button
            type="button"
            onClick={() => setIsConfiguring((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold shadow-xs transition cursor-pointer active:scale-95",
              isConfiguring
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700",
            )}
          >
            <SlidersHorizontal className="size-3 text-blue-500" />
            {isConfiguring ? "Done" : "Configure"}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={deleteNode}
            title="Remove Signature Block"
            className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer shadow-xs"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>

        {/* ── Configuration Panel (drops down below toolbar, above card) ── */}
        {isConfiguring && (
          <div className="absolute -top-9 left-0 mt-10 z-30 w-72 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-white dark:bg-slate-900 shadow-lg p-3 space-y-2 animate-in fade-in-50 slide-in-from-top-1 duration-150">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <SlidersHorizontal className="size-3 text-blue-500" />
                Signature Image Key
              </span>
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                className="text-[11px] font-semibold text-blue-600 dark:text-blue-300 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer"
              >
                <Check className="size-3" /> Done
              </button>
            </div>
            <div className="relative">
              <select
                value={imageKey}
                onChange={(e) => updateAttributes({ imageKey: e.target.value })}
                className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none shadow-xs"
              >
                <option value="">— Select signature variable —</option>
                {moduleVars.primary.length > 0 && (
                  <optgroup label={`${formatModuleDisplayName(moduleVars.primaryName)} (Primary)`}>
                    {moduleVars.primary.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label} ({v.key})
                      </option>
                    ))}
                  </optgroup>
                )}
                {Object.entries(moduleVars.related).map(([relName, items]) => (
                  <optgroup key={relName} label={formatFieldLabel(relName)}>
                    {items.map((v) => (
                      <option key={v.key} value={v.key}>
                        {v.label} ({v.key})
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
            {loadingVars && (
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                <Loader2 size={9} className="animate-spin" /> Loading variables…
              </p>
            )}
          </div>
        )}

        {/* ── Live resize indicator ── */}
        {isResizing && currentDimensions && (
          <div className="absolute -top-7 left-1/2 -translate-x-1/2 z-50 rounded-md bg-slate-900/90 px-2 py-0.5 text-[11px] font-medium text-white shadow-md pointer-events-none">
            {currentDimensions.w} px
          </div>
        )}

        {/* ── Signature content (transformable) ── */}
        <div
          className="w-full flex flex-col items-center justify-center transition-transform"
          style={{
            transform: `rotate(${rotate || 0}deg) scaleX(${flipH ? -1 : 1})`,
            transformOrigin: "center center",
          }}
        >
          {imageKey ? (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <div className="w-44 h-12 flex items-center justify-center text-slate-700 dark:text-slate-200">
                <svg
                  viewBox="0 0 200 60"
                  className="w-full h-full stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round opacity-80"
                >
                  <path d="M 20 40 Q 40 10, 60 35 T 100 25 T 140 40 Q 160 15, 180 30" />
                  <path d="M 50 45 Q 90 50, 160 42" className="stroke-slate-400 stroke-[1.5]" />
                </svg>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                Real signature from{" "}
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                  {`<${imageKey}>`}
                </span>{" "}
                will render here
              </p>
            </div>
          ) : (
            <div className="text-center space-y-1 py-1">
              <p className="text-[12px] text-slate-400 dark:text-slate-500 italic">
                No signature key set
              </p>
              <p className="text-[10px] text-slate-400">
                Hover and click <span className="font-semibold text-blue-600 dark:text-blue-400">Configure</span> to attach a variable.
              </p>
            </div>
          )}
        </div>

        {/* ── Resize Handles (when selected) ── */}
        {isSelected && (
          <>
            <div onPointerDown={(e) => startResize("nw", e)} className="absolute -top-1.5 -left-1.5 z-20 size-3 rounded-xs border-2 border-blue-500 bg-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform" />
            <div onPointerDown={(e) => startResize("ne", e)} className="absolute -top-1.5 -right-1.5 z-20 size-3 rounded-xs border-2 border-blue-500 bg-white shadow-xs cursor-nesw-resize hover:scale-125 transition-transform" />
            <div onPointerDown={(e) => startResize("sw", e)} className="absolute -bottom-1.5 -left-1.5 z-20 size-3 rounded-xs border-2 border-blue-500 bg-white shadow-xs cursor-nesw-resize hover:scale-125 transition-transform" />
            <div onPointerDown={(e) => startResize("se", e)} className="absolute -bottom-1.5 -right-1.5 z-20 size-3 rounded-xs border-2 border-blue-500 bg-white shadow-xs cursor-nwse-resize hover:scale-125 transition-transform" />
            <div onPointerDown={(e) => startResize("e", e)} className="absolute top-1/2 -right-1.5 -translate-y-1/2 z-20 h-5 w-2 rounded-xs border border-blue-500 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform" />
            <div onPointerDown={(e) => startResize("w", e)} className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-20 h-5 w-2 rounded-xs border border-blue-500 bg-white shadow-xs cursor-ew-resize hover:scale-125 transition-transform" />
          </>
        )}
      </div>
    </NodeViewWrapper>
  );
}

