"use client";

import React, { useCallback, useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { NodeViewWrapper } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import {
  Image as ImageIcon,
  Trash2,
  GripVertical,
  Settings2,
  Eye,
  X,
  Maximize2,
} from "lucide-react";
import type { ImageLayoutType } from "./image-layout-extension";

type SlotProps = {
  src: string;
  alt: string;
  height: string;
  fit: "contain" | "cover";
  onUpload: (file: File) => void;
  onClear: () => void;
  onAltChange: (alt: string) => void;
  onPreview: (src: string) => void;
  disabled?: boolean;
};

function ImageSlot({
  src,
  alt,
  height,
  fit,
  onUpload,
  onClear,
  onAltChange,
  onPreview,
  disabled,
}: SlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) onUpload(file);
  };

  const isEmpty = !src;

  return (
    <div
      className={`relative flex-1 min-w-0 rounded-lg border-2 transition-colors overflow-hidden group flex items-center justify-center ${
        draggingOver
          ? "border-blue-400 bg-blue-50 dark:bg-blue-950/30"
          : isEmpty
          ? "border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800/50"
          : "border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/60"
      }`}
      style={{ height }}
      onDragOver={(e) => {
        e.preventDefault();
        setDraggingOver(true);
      }}
      onDragLeave={() => setDraggingOver(false)}
      onDrop={handleDrop}
    >
      {isEmpty ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500 transition-colors cursor-pointer w-full h-full p-2"
        >
          <ImageIcon className="size-7 opacity-60" />
          <span className="text-[11px] font-medium text-center leading-tight">
            Click or drop image
          </span>
        </button>
      ) : (
        <>
          <img
            src={src}
            alt={alt || ""}
            className={`transition-all select-none ${
              fit === "cover"
                ? "w-full h-full object-cover"
                : "w-full h-full object-contain p-1"
            }`}
            draggable={false}
            onDoubleClick={() => onPreview(src)}
          />

          {/* Overlay controls */}
          <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2 backdrop-blur-[1px]">
            <div className="flex items-center gap-1.5 flex-wrap justify-center">
              <button
                type="button"
                onClick={() => onPreview(src)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white text-[11px] font-semibold text-slate-800 hover:bg-slate-100 transition shadow-sm cursor-pointer"
                title="View full quality image"
              >
                <Eye className="size-3 text-blue-600" />
                <span>View Full</span>
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="px-2.5 py-1 rounded-md bg-white/90 text-[11px] font-semibold text-slate-800 hover:bg-white transition shadow-sm cursor-pointer"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={onClear}
                className="px-2.5 py-1 rounded-md bg-red-500 text-[11px] font-semibold text-white hover:bg-red-600 transition shadow-sm cursor-pointer"
              >
                Remove
              </button>
            </div>
          </div>

          {/* Alt text badge */}
          <input
            type="text"
            value={alt}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Alt description…"
            className="absolute bottom-0 left-0 right-0 text-[10px] bg-black/60 text-white placeholder-white/60 px-2 py-1 outline-none border-0 opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function ImageLayoutNodeView({
  node,
  updateAttributes,
  selected,
  deleteNode,
}: NodeViewProps) {
  const layout: ImageLayoutType = node.attrs.layout || "single";
  const srcs: string[] = node.attrs.srcs || [];
  const alts: string[] = node.attrs.alts || [];
  const gap: string = node.attrs.gap || "12px";
  const height: string = node.attrs.height || "200px";
  const fit: "contain" | "cover" = node.attrs.fit || "contain";

  const count = layout === "single" ? 1 : layout === "two" ? 2 : 3;

  const [showSettings, setShowSettings] = useState(false);
  const [localHeight, setLocalHeight] = useState(height);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // Close preview on Escape key
  useEffect(() => {
    if (!previewSrc) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewSrc(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewSrc]);

  const handleUpload = useCallback(
    (index: number, file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        const nextSrcs = [...srcs];
        nextSrcs[index] = base64;
        while (nextSrcs.length < count) nextSrcs.push("");
        updateAttributes({ srcs: nextSrcs });
      };
      reader.readAsDataURL(file);
    },
    [srcs, count, updateAttributes],
  );

  const handleClear = useCallback(
    (index: number) => {
      const nextSrcs = [...srcs];
      nextSrcs[index] = "";
      updateAttributes({ srcs: nextSrcs });
    },
    [srcs, updateAttributes],
  );

  const handleAltChange = useCallback(
    (index: number, value: string) => {
      const nextAlts = [...alts];
      nextAlts[index] = value;
      while (nextAlts.length < count) nextAlts.push("");
      updateAttributes({ alts: nextAlts });
    },
    [alts, count, updateAttributes],
  );

  const layoutLabel =
    layout === "single"
      ? "Single Image"
      : layout === "two"
      ? "Two Images"
      : "Three Images";

  const gapNum = parseInt(gap) || 12;

  return (
    <NodeViewWrapper
      className={`image-layout-node-view my-3 group/layout relative rounded-xl border-2 transition-colors ${
        selected
          ? "border-blue-500 shadow-lg shadow-blue-500/20"
          : "border-transparent hover:border-slate-300 dark:hover:border-slate-700"
      }`}
      data-drag-handle
    >
      {/* ── Toolbar ── */}
      <div
        className={`absolute -top-8 left-0 flex items-center gap-1.5 z-20 transition-opacity ${
          selected ? "opacity-100" : "opacity-0 group-hover/layout:opacity-100"
        }`}
      >
        <span className="flex items-center gap-1 bg-blue-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow">
          <ImageIcon className="size-3" />
          {layoutLabel}
        </span>
        <button
          type="button"
          onClick={() => setShowSettings((s) => !s)}
          className={`p-1 rounded transition cursor-pointer ${
            showSettings
              ? "bg-blue-600 text-white shadow-xs"
              : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600"
          }`}
          title="Layout settings"
        >
          <Settings2 className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={deleteNode}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-600 transition cursor-pointer"
          title="Delete layout"
        >
          <Trash2 className="size-3.5" />
        </button>
        <div
          contentEditable={false}
          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-grab active:cursor-grabbing"
          data-drag-handle
          title="Drag block"
        >
          <GripVertical className="size-3.5" />
        </div>
      </div>

      {/* ── Settings popup panel ── */}
      {showSettings && (
        <div
          contentEditable={false}
          className="absolute -top-10 left-36 z-30 flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl px-3 py-2 text-xs"
        >
          {/* Fit Toggle (Contain vs Cover) */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            <span>Fit:</span>
            <div className="inline-flex rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => updateAttributes({ fit: "contain" })}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition cursor-pointer ${
                  fit === "contain"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Preserves full image with original aspect ratio (never cropped)"
              >
                Full (Contain)
              </button>
              <button
                type="button"
                onClick={() => updateAttributes({ fit: "cover" })}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition cursor-pointer ${
                  fit === "cover"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                }`}
                title="Fills entire slot (crops edges if ratios differ)"
              >
                Fill (Crop)
              </button>
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Height */}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            <span>Height:</span>
            <input
              type="text"
              value={localHeight}
              onChange={(e) => setLocalHeight(e.target.value)}
              onBlur={() => updateAttributes({ height: localHeight })}
              onKeyDown={(e) => {
                if (e.key === "Enter") updateAttributes({ height: localHeight });
              }}
              placeholder="e.g. 200px"
              className="w-16 px-1.5 py-0.5 text-[11px] border border-slate-300 dark:border-slate-600 rounded bg-transparent outline-none focus:border-blue-500 text-slate-800 dark:text-slate-100"
            />
          </label>

          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />

          {/* Gap */}
          <label className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-400 font-medium whitespace-nowrap">
            <span>Gap:</span>
            <input
              type="range"
              min={0}
              max={32}
              value={gapNum}
              onChange={(e) => updateAttributes({ gap: `${e.target.value}px` })}
              className="w-16 accent-blue-600"
            />
            <span className="text-[10px] text-slate-400 w-6">{gapNum}px</span>
          </label>
        </div>
      )}

      {/* ── Image slots ── */}
      <div className="flex w-full" style={{ gap }}>
        {Array.from({ length: count }, (_, i) => (
          <ImageSlot
            key={i}
            src={srcs[i] || ""}
            alt={alts[i] || ""}
            height={height}
            fit={fit}
            onUpload={(file) => handleUpload(i, file)}
            onClear={() => handleClear(i)}
            onAltChange={(v) => handleAltChange(i, v)}
            onPreview={(s) => setPreviewSrc(s)}
          />
        ))}
      </div>

      {/* ── Full Quality Preview Lightbox Modal ── */}
      {previewSrc && typeof document !== "undefined" &&
        createPortal(
          <div
            contentEditable={false}
            className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in select-none"
            onClick={() => setPreviewSrc(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="w-full flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-900/90 text-slate-200">
                <div className="flex items-center gap-2">
                  <Maximize2 className="size-4 text-blue-400" />
                  <span className="text-xs font-semibold">Image Full View (Original Quality)</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewSrc(null)}
                  className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                  title="Close (Esc)"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Modal body */}
              <div className="p-4 flex items-center justify-center overflow-auto max-h-[80vh] bg-slate-950/60">
                <img
                  src={previewSrc}
                  alt="Full resolution view"
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </NodeViewWrapper>
  );
}
