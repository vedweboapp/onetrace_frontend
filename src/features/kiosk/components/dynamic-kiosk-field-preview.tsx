"use client";

import React, { useRef, useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  GripVertical,
  Edit2,
  Trash2,
  Copy,
  CircleDot,
  CheckSquare,
  TextCursorInput,
  MoreVertical,
  Check,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { KioskOption } from "../types/kiosk.types";
import { applyColorFill } from "../utils/kiosk-color-fill";

interface DynamicKioskOptionPreviewProps {
  option: KioskOption;
  index: number;
  isLookupApiOption?: boolean;
  isIncludedInKiosk?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
}

const OPTION_DND_TYPE = "KIOSK_QUESTION_OPTION";

export const DynamicKioskFieldPreview: React.FC<DynamicKioskOptionPreviewProps> = ({
  option,
  index,
  isLookupApiOption = false,
  isIncludedInKiosk = false,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorFilledThumb, setColorFilledThumb] = useState<string>("");

  const isColorType =
    option.field_type === "color" || option.field_type === "color_swatch";
  const fillImageSrc = option.fill_image ? String(option.fill_image) : "";
  const swatchColor = String(
    option.color ||
      (typeof option.value === "string" && option.value.startsWith("#")
        ? option.value
        : "#2563EB"),
  );

  useEffect(() => {
    if (!isColorType || !fillImageSrc) {
      setColorFilledThumb("");
      return;
    }
    let cancelled = false;
    applyColorFill(fillImageSrc, swatchColor).then((result) => {
      if (!cancelled) setColorFilledThumb(result);
    });
    return () => {
      cancelled = true;
    };
  }, [isColorType, fillImageSrc, swatchColor]);

  // Close ellipsis menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const [, drop] = useDrop(
    () => ({
      accept: OPTION_DND_TYPE,
      hover: (item: { index: number }, monitor) => {
        if (!rowRef.current) return;
        const fromIndex = item.index;
        const toIndex = index;
        if (fromIndex === toIndex) return;

        const rect = rowRef.current.getBoundingClientRect();
        const midpoint = (rect.bottom - rect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverY = clientOffset.y - rect.top;

        if (fromIndex < toIndex && hoverY < midpoint) return;
        if (fromIndex > toIndex && hoverY > midpoint) return;

        onMove(fromIndex, toIndex);
        item.index = toIndex;
      },
    }),
    [index, onMove]
  );

  const [{ isDragging }, drag, preview] = useDrag(
    () => ({
      type: OPTION_DND_TYPE,
      item: { index, uid: option._uid },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [index, option._uid]
  );

  preview(drop(rowRef));

  return (
    <div
      ref={rowRef}
      onDoubleClick={onEdit}
      style={{ opacity: isDragging ? 0.3 : 1 }}
      className={cn(
        "group relative rounded-sm border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700",
        menuOpen && "z-30 border-blue-300 dark:border-blue-700 shadow-sm"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Drag Handle & Radio Icon & Info */}
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <div
            ref={drag as any}
            className="mt-0.5 cursor-grab text-slate-300 transition-colors hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300"
            title="Drag to reorder"
          >
            <GripVertical size={16} />
          </div>

          {option.field_type === "color" || option.field_type === "color_swatch" ? (
            <div
              className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 border-white shadow-xs ring-1 ring-slate-300 dark:border-slate-800 dark:ring-slate-600"
              style={{
                backgroundColor:
                  option.color ||
                  (typeof option.value === "string" && option.value.startsWith("#")
                    ? option.value
                    : "#2563EB"),
              }}
              title={`Color: ${option.color || option.value || "#2563EB"}`}
            />
          ) : option.field_type === "input" ? (
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
              <TextCursorInput size={14} />
            </div>
          ) : (
            <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
              {option.field_type === "checkbox" ? <CheckSquare size={14} /> : <CircleDot size={14} />}
            </div>
          )}

          {/* Color-filled or object image thumbnail */}
          {(colorFilledThumb || option.image || option.fill_image) && (
            <div className="mt-0.5 size-9 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs">
              <img
                src={String(colorFilledThumb || option.image || option.fill_image)}
                alt={option.label || "Option preview"}
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}

          {option.field_type === "image_radio" &&
            (option.placement_mode === "place" ||
              option.placement?.mode === "place") && (
              <span className="mt-1 shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
                Place
              </span>
            )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {option.label ||
                  (option.field_type === "color_swatch"
                    ? "Color Swatch Choice"
                    : option.field_type === "color"
                    ? "Color Choice"
                    : option.field_type === "checkbox"
                    ? "Checkbox Option"
                    : option.field_type === "image_radio"
                    ? "Image Radio Option"
                    : option.field_type === "input"
                    ? "Input Field"
                    : "Radio Option")}
              </span>

              {isLookupApiOption && isIncludedInKiosk && (
                <span
                  className="inline-flex size-4 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  title="Included in this kiosk"
                  aria-label="Included in this kiosk"
                >
                  <Check size={11} strokeWidth={3} />
                </span>
              )}

              {option.price && (
                <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  ${option.price}
                </span>
              )}
            </div>

            {option.sub_label && (
              <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400">
                {option.sub_label}
              </p>
            )}

            {option.field_type === "input" && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1 rounded border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-500 truncate select-none">
                  {option.placeholder || "Enter value here..."}
                </div>
                <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-mono text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {option.input_type || "text"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Ellipsis Menu (Configure, Duplicate, Delete) */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            className={cn(
              "flex size-7 items-center justify-center rounded-md border transition",
              menuOpen
                ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400"
                : "border-slate-200 bg-white text-slate-500 shadow-2xs hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
            )}
            title="Option options"
          >
            <MoreVertical size={14} />
          </button>

          {menuOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 z-40 min-w-[145px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-100"
            >
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-blue-400"
              >
                <Edit2 size={13} className="text-slate-400" />
                Configure
              </button>

              {!isLookupApiOption && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDuplicate();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Copy size={13} className="text-slate-400" />
                    Duplicate
                  </button>

                  <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={13} />
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
