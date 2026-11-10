"use client";

import React, { useState, useEffect } from "react";
import { FieldError } from "react-hook-form";
import { Layers, Image as ImageIcon } from "lucide-react";
import { FieldErrorText, FieldGroup, surfaceSelectClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { applyColorFill } from "@/features/kiosk/utils/kiosk-color-fill";

export type PositionOption = "left" | "right" | "up" | "down" | "center";

export interface PositionSelectionProps {
  label?: React.ReactNode;
  name?: string;
  value?: string;
  onChange?: (val: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
  disabled?: boolean;
  errors?: FieldError;
  fieldRequired?: boolean;
  required?: boolean;
  className?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  firstField?: string;
  secondField?: string;
  overlapMode?: string;
  defaultPosition?: string;
  allFields?: any[];
  watch?: (name: string) => any;
  first_field?: string;
  second_field?: string;
  overlap_mode?: string;
  default_position?: string;
}

export const DEFAULT_POSITIONS: { value: PositionOption; label: string; overlayStyle: string }[] = [
  { value: "center", label: "Center", overlayStyle: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" },
  { value: "left", label: "Left", overlayStyle: "top-1/2 left-3 -translate-y-1/2" },
  { value: "right", label: "Right", overlayStyle: "top-1/2 right-3 -translate-y-1/2" },
  { value: "up", label: "Up", overlayStyle: "top-3 left-1/2 -translate-x-1/2" },
  { value: "down", label: "Down", overlayStyle: "bottom-3 left-1/2 -translate-x-1/2" },
];

function isColorString(s: unknown): boolean {
  if (typeof s !== "string") return false;
  const trimmed = s.trim().toLowerCase();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb(") ||
    trimmed.startsWith("rgba(") ||
    trimmed.startsWith("hsl(") ||
    trimmed.startsWith("hsla(")
  );
}

export function isValidImageUrl(src: unknown): boolean {
  if (typeof src !== "string" || !src.trim()) return false;
  const s = src.trim();
  if (isColorString(s)) return false;
  return (
    s.startsWith("http://") ||
    s.startsWith("https://") ||
    s.startsWith("data:image/") ||
    s.startsWith("blob:") ||
    s.startsWith("/") ||
    /\.(png|jpe?g|webp|gif|svg|bmp)(\?.*)?$/i.test(s)
  );
}

export function extractImageFromField(fieldDef: any, fieldValue: any): string | null {
  if (fieldDef?.associated_value_type === "color") {
    return null;
  }

  if (!fieldValue && fieldValue !== 0) {
    // If no value provided, check if options has a default image or fieldDef has an image
    const defImg = fieldDef?.image || fieldDef?.file || fieldDef?.image_url;
    return isValidImageUrl(defImg) ? defImg : null;
  }

  // If fieldValue is an object, try to extract value/image directly
  if (typeof fieldValue === "object" && fieldValue !== null) {
    if (typeof File !== "undefined" && fieldValue instanceof File) {
      try {
        return URL.createObjectURL(fieldValue);
      } catch {
        return null;
      }
    }
    if (fieldValue.fileObject && typeof File !== "undefined" && fieldValue.fileObject instanceof File) {
      try {
        return URL.createObjectURL(fieldValue.fileObject);
      } catch {}
    }
    const directCandidate =
      fieldValue.image ||
      fieldValue.associated_value ||
      fieldValue.image_value ||
      fieldValue.file ||
      fieldValue.file_url ||
      null;
    if (isValidImageUrl(directCandidate)) {
      return directCandidate;
    }
    if (fieldValue.value !== undefined) {
      fieldValue = fieldValue.value;
    } else if (fieldValue.label !== undefined) {
      fieldValue = fieldValue.label;
    }
  }

  if (Array.isArray(fieldValue)) {
    if (fieldValue.length === 0) return null;
    return extractImageFromField(fieldDef, fieldValue[0]);
  }

  if (typeof fieldValue === "string") {
    if (isValidImageUrl(fieldValue)) {
      return fieldValue;
    }
    if (isColorString(fieldValue)) {
      return null;
    }
  }

  const options =
    Array.isArray(fieldDef?.options) && fieldDef.options.length > 0
      ? fieldDef.options
      : Array.isArray(fieldDef?.associated_options)
        ? fieldDef.associated_options
        : [];
  const targetValStr = String(fieldValue).trim();

  const matchedOpt = options.find((opt: any) => {
    if (typeof opt === "object" && opt !== null) {
      return (
        String(opt.value ?? "").trim().toLowerCase() === targetValStr.toLowerCase() ||
        String(opt.label ?? "").trim().toLowerCase() === targetValStr.toLowerCase() ||
        String(opt.id ?? "").trim().toLowerCase() === targetValStr.toLowerCase() ||
        String(opt.name ?? "").trim().toLowerCase() === targetValStr.toLowerCase()
      );
    }
    return String(opt).trim().toLowerCase() === targetValStr.toLowerCase();
  });

  if (matchedOpt && typeof matchedOpt === "object") {
    if (matchedOpt.associated_value_type === "color" || isColorString(matchedOpt.value)) {
      return null;
    }
    if (matchedOpt.fileObject && typeof File !== "undefined" && matchedOpt.fileObject instanceof File) {
      try {
        return URL.createObjectURL(matchedOpt.fileObject);
      } catch {
        // Fallback
      }
    }
    const candidate =
      matchedOpt.image ||
      matchedOpt.associated_value ||
      matchedOpt.image_value ||
      matchedOpt.file ||
      matchedOpt.file_url ||
      null;

    if (isValidImageUrl(candidate)) {
      return candidate;
    }
  }

  const fallbackImg = fieldDef?.image || fieldDef?.file || fieldDef?.image_url;
  if (isValidImageUrl(fallbackImg)) {
    return fallbackImg;
  }

  return null;
}

/**
 * Standard Position Selection form field: renders strictly as a dropdown itself.
 */
export const PositionSelection: React.FC<PositionSelectionProps> = ({
  label,
  name,
  value,
  onChange,
  onBlur,
  readOnly = false,
  disabled = false,
  errors,
  fieldRequired = false,
  required = false,
  className = "",
  placeholder = "Select Position...",
  options,
  defaultPosition,
  default_position,
}) => {
  const defPos = (defaultPosition || default_position || "center") as PositionOption;
  const currentPos = (value || defPos) as PositionOption;
  const isInteractive = !readOnly && !disabled;

  const selectOptions =
    options && options.length > 0
      ? options
      : DEFAULT_POSITIONS.map((p) => ({ value: p.value, label: p.label }));

  const dropdownControl = (
    <select
      id={name}
      name={name}
      value={currentPos}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={onBlur}
      disabled={!isInteractive}
      aria-invalid={errors ? true : undefined}
      className={cn(
        surfaceSelectClassName,
        "field-control w-full",
        readOnly && "cursor-not-allowed bg-slate-50 dark:bg-slate-800/50",
        errors && "border-red-500 dark:border-red-500",
      )}
    >
      <option value="">{placeholder}</option>
      {selectOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label) {
    return (
      <div className={cn("relative w-full min-w-0", className)}>
        {dropdownControl}
        <FieldErrorText>{errors?.message}</FieldErrorText>
      </div>
    );
  }

  return (
    <FieldGroup
      label={label}
      htmlFor={name}
      required={Boolean(fieldRequired || required)}
      className={cn("w-full", className)}
    >
      {dropdownControl}
      <FieldErrorText>{errors?.message}</FieldErrorText>
    </FieldGroup>
  );
};

export interface ImageOverlapPreviewCardProps {
  positionField?: any;
  allFields: any[];
  formData?: Record<string, any>;
  className?: string;
  candidateFields?: any[];
  onPositionChange?: (pos: PositionOption) => void;
}

/**
 * Live Image Overlap Preview Card: rendered outside the FormRenderer,
 * positioned on the RIGHT side in the Form Builder preview tab.
 */
export const ImageOverlapPreviewCard: React.FC<ImageOverlapPreviewCardProps> = ({
  positionField,
  allFields = [],
  formData = {},
  className = "",
  candidateFields = [],
}) => {
  // Candidate fields fallback
  const fallbackBase = candidateFields[0]?.api_name || allFields[0]?.api_name || "";
  const fallbackOverlay =
    candidateFields[1]?.api_name ||
    candidateFields[0]?.api_name ||
    allFields[1]?.api_name ||
    "";

  const f1Key =
    positionField?.first_field ||
    positionField?.firstField ||
    fallbackBase;
  const f2Key =
    positionField?.second_field ||
    positionField?.secondField ||
    fallbackOverlay;

  const mode =
    positionField?.overlap_mode ||
    positionField?.overlapMode ||
    "second_over_first";

  const field1Def = allFields.find(
    (f) =>
      f.api_name === f1Key ||
      f.name === f1Key ||
      f._uid === f1Key ||
      String(f.id) === f1Key,
  );
  const field2Def = allFields.find(
    (f) =>
      f.api_name === f2Key ||
      f.name === f2Key ||
      f._uid === f2Key ||
      String(f.id) === f2Key,
  );

  const val1 =
    formData[field1Def?.api_name || f1Key] ??
    field1Def?.defaultValue ??
    "";
  const val2 =
    formData[field2Def?.api_name || f2Key] ??
    field2Def?.defaultValue ??
    "";

  const img1 = extractImageFromField(field1Def, val1);
  const img2 = extractImageFromField(field2Def, val2);

  // First question is base; Second question overlaps on top
  const isSecondOverFirst = mode === "second_over_first";
  let baseImg = isSecondOverFirst ? img1 : img2;
  let overlayImg = isSecondOverFirst ? img2 : img1;
  let baseField = isSecondOverFirst ? field1Def : field2Def;
  let overlayFieldDef = isSecondOverFirst ? field2Def : field1Def;

  // KEY FIX: If baseImg has no image, but overlayImg DOES have an image,
  // promote it to baseImg so the available image is always displayed!
  if (!baseImg && overlayImg) {
    baseImg = overlayImg;
    overlayImg = null;
    baseField = isSecondOverFirst ? field2Def : field1Def;
    overlayFieldDef = isSecondOverFirst ? field1Def : field2Def;
  }

  const baseFieldLabel = baseField?.field_label || (isSecondOverFirst ? f1Key : f2Key) || "First Question";
  const overlayFieldLabel = overlayFieldDef?.field_label || (isSecondOverFirst ? f2Key : f1Key) || "Second Question";

  // ── Color fill logic ──────────────────────────────────────────────────────
  // Find a field that targets the BASE image field for color fill.
  // The fill source field stores fill_field / fill_field_id pointing to the
  // base image field's f_id (or api_name / _uid as fallback).
  const baseFieldIds = [
    baseField?.f_id,
    baseField?.field_id,
    baseField?.id,
    baseField?._uid,
    baseField?.api_name,
    f1Key,
    f2Key,
  ].filter(Boolean).map(String);

  const colorSourceField = allFields.find((f: any) => {
    if (f.is_deleted) return false;
    const target = String(f.fill_field ?? f.fill_field_id ?? f.target_image_field ?? "");
    return target && baseFieldIds.includes(target);
  });

  // Current selected value in the fill-source picklist
  const colorSourceVal = colorSourceField
    ? String(formData[colorSourceField.api_name ?? colorSourceField.name ?? ""] ?? "")
    : "";

  // Find the color for the selected option
  const fillColor = (() => {
    if (!colorSourceField || !colorSourceVal) return null;
    const opts: any[] =
      Array.isArray(colorSourceField.associated_options) && colorSourceField.associated_options.length > 0
        ? colorSourceField.associated_options
        : (colorSourceField.options ?? colorSourceField.field_options ?? []);
    const opt = opts.find(
      (o: any) =>
        String(o.value ?? o.option_value ?? o.name ?? o.label ?? "").trim().toLowerCase() === colorSourceVal.trim().toLowerCase() ||
        String(o.label ?? o.option_label ?? "").trim().toLowerCase() === colorSourceVal.trim().toLowerCase() ||
        String(o.color ?? o.associated_color ?? o.associated_value ?? "").trim().toLowerCase() === colorSourceVal.trim().toLowerCase(),
    );

    // In clean associated_options: opt.value is the color hex!
    if (opt) {
      if (typeof opt.value === "string" && isColorString(opt.value)) {
        return opt.value;
      }
      if (typeof opt.color === "string" && isColorString(opt.color)) {
        return opt.color;
      }
      if (typeof opt.associated_value === "string" && isColorString(opt.associated_value)) {
        return opt.associated_value;
      }
    }
    if (isColorString(colorSourceVal)) {
      return colorSourceVal;
    }
    return null;
  })();

  // Apply color fill async → store tinted base image in state
  const [tintedBaseImg, setTintedBaseImg] = useState<string | null>(null);
  useEffect(() => {
    if (baseImg && fillColor) {
      let cancelled = false;
      applyColorFill(baseImg, fillColor).then((result) => {
        if (!cancelled) setTintedBaseImg(result);
      });
      return () => { cancelled = true; };
    } else {
      setTintedBaseImg(null);
    }
  }, [baseImg, fillColor]);

  const displayBaseImg = tintedBaseImg ?? baseImg;
  // ─────────────────────────────────────────────────────────────────────────

  const formPosVal = positionField?.api_name
    ? formData[positionField.api_name]
    : undefined;
  const posVal = (formPosVal ||
    formData.__preview_overlap_position ||
    positionField?.default_position ||
    positionField?.defaultValue ||
    "center") as PositionOption;

  const activePosMeta =
    DEFAULT_POSITIONS.find((p) => p.value === posVal) || DEFAULT_POSITIONS[0];

  const showOverlayPlaceholder = Boolean(
    !overlayImg &&
    displayBaseImg &&
    positionField?.field_type === "position_selection" &&
    overlayFieldDef &&
    overlayFieldDef !== colorSourceField &&
    overlayFieldDef.associated_value_type === "image"
  );

  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-md",
        className,
      )}
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2 font-semibold text-sm text-gray-800 dark:text-gray-100">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Layers className="size-4" />
          </div>
          <span>Real-time Preview</span>
        </div>
        <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
          {activePosMeta.label}
        </span>
      </div>

      <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between">
        <span>
          {overlayImg ? (
            <>
              <strong className="text-gray-700 dark:text-gray-200">{overlayFieldLabel}</strong> on top of{" "}
              <strong className="text-gray-700 dark:text-gray-200">{baseFieldLabel}</strong>{" "}
              <span className="text-gray-400 font-normal">({activePosMeta.label})</span>
            </>
          ) : (
            <>
              <strong className="text-gray-700 dark:text-gray-200">{baseFieldLabel}</strong>
              {fillColor && (
                <span className="ml-2 inline-flex items-center gap-1 text-[10px] text-gray-400">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full border border-gray-300 shadow-xs"
                    style={{ backgroundColor: fillColor }}
                  />
                  Color Fill: {fillColor}
                </span>
              )}
            </>
          )}
        </span>
      </div>

      {/* Canvas */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl border-2 border-dashed border-gray-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden p-3 select-none">
        {displayBaseImg ? (
          <div className="relative inline-flex items-center justify-center max-h-full max-w-full">
            {/* The base image: takes its exact natural dimensions */}
            <div className="relative inline-block max-h-full max-w-full rounded overflow-hidden shadow-xs">
              <img
                src={displayBaseImg}
                alt={baseFieldLabel}
                className="max-h-56 sm:max-h-64 max-w-full w-auto h-auto object-contain rounded block"
              />
              {fillColor && !tintedBaseImg && (
                <div
                  className="absolute inset-0 pointer-events-none rounded transition-all duration-200"
                  style={{
                    backgroundColor: fillColor,
                    opacity: 0.35,
                    mixBlendMode: "multiply",
                  }}
                />
              )}
            </div>

            {overlayImg ? (
              <div
                className={cn(
                  "absolute z-10 pointer-events-none transition-all duration-300 ease-out",
                  activePosMeta.overlayStyle,
                )}
              >
                <div className="relative p-1 rounded-lg border-2 border-indigo-500 bg-white/95 dark:bg-slate-900/95 shadow-md">
                  <img
                    src={overlayImg}
                    alt={overlayFieldLabel}
                    className="max-h-20 max-w-20 object-contain rounded"
                  />
                </div>
              </div>
            ) : (
              showOverlayPlaceholder && (
                <div
                  className={cn(
                    "absolute z-10 pointer-events-none transition-all duration-300 ease-out",
                    activePosMeta.overlayStyle,
                  )}
                >
                  <div className="px-2.5 py-1 rounded-md border border-dashed border-indigo-400 bg-indigo-50/90 dark:bg-indigo-950/90 text-[10px] text-indigo-600 font-semibold shadow-xs">
                    {overlayFieldLabel}
                    {val2 ? ` (${String(val2)})` : ""}
                  </div>
                </div>
              )
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center p-4 text-gray-400 dark:text-gray-500">
            <div className="p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 mb-1.5">
              <ImageIcon className="size-5 text-gray-400" />
            </div>
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
              No base image
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5 max-w-[200px]">
              Select an option in <strong>{baseFieldLabel}</strong>
              {val1 ? ` (currently "${String(val1)}")` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PositionSelection;
