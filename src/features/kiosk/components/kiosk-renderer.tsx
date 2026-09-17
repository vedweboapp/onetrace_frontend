"use client";

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { CheckCircle, Check, Layers, Send, Palette, X } from "lucide-react";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import type { KioskConfig, KioskQuestion, KioskOption } from "../types/kiosk.types";
import { DEFAULT_KIOSK_CONFIG } from "../types/kiosk.types";

const SWATCH_PALETTE = [
  { name: "Royal Blue", hex: "#2563EB" },
  { name: "Sky Blue", hex: "#0EA5E9" },
  { name: "Teal", hex: "#0D9488" },
  { name: "Emerald Green", hex: "#10B981" },
  { name: "Lime", hex: "#84CC16" },
  { name: "Amber", hex: "#F59E0B" },
  { name: "Orange", hex: "#F97316" },
  { name: "Crimson Red", hex: "#EF4444" },
  { name: "Rose", hex: "#F43F5E" },
  { name: "Purple", hex: "#8B5CF6" },
  { name: "Indigo", hex: "#6366F1" },
  { name: "Slate", hex: "#64748B" },
  { name: "Dark Slate", hex: "#1E293B" },
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#FFFFFF" },
];

interface ColorSwatchModalProps {
  question: KioskQuestion;
  option: KioskOption;
  initialColor?: string;
  onSelect: (color: string) => void;
  onClose: () => void;
}

const ColorSwatchModal: React.FC<ColorSwatchModalProps> = ({
  question,
  option,
  initialColor = "#0EA5E9",
  onSelect,
  onClose,
}) => {
  const [currentColor, setCurrentColor] = useState(initialColor);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <Palette size={16} />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Select Your Color
              </h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {option.label || question.label || "Choose a color from the swatch or pick a custom shade"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </div>

        {/* Selected Color Live Preview */}
        <div className="my-5 flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
          <div
            className="size-12 shrink-0 rounded-xl border-2 border-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700"
            style={{ backgroundColor: currentColor }}
          />
          <div className="min-w-0 flex-1">
            <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Selected Shade
            </span>
            <div className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              {currentColor.toUpperCase()}
            </div>
          </div>
        </div>

        {/* Preset Color Swatches */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Color Swatches
          </label>
          <div className="grid grid-cols-5 gap-2.5">
            {SWATCH_PALETTE.map((swatch) => {
              const isSelected = currentColor.toLowerCase() === swatch.hex.toLowerCase();
              return (
                <button
                  key={swatch.hex}
                  type="button"
                  onClick={() => setCurrentColor(swatch.hex)}
                  className={cn(
                    "group relative flex size-11 items-center justify-center rounded-xl border transition-all duration-150 shadow-2xs hover:scale-105",
                    isSelected
                      ? "ring-2 ring-blue-600 ring-offset-2 border-transparent dark:ring-offset-slate-900"
                      : "border-black/10 dark:border-white/10"
                  )}
                  style={{ backgroundColor: swatch.hex }}
                  title={swatch.name}
                >
                  {isSelected && (
                    <Check
                      size={15}
                      strokeWidth={3}
                      className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Input */}
        <div className="mt-5 space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Or Pick Custom Color
          </label>
          <div className="flex items-center gap-2.5">
            <label
              className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 shadow-2xs transition hover:scale-105 dark:border-slate-700"
              style={{ backgroundColor: currentColor }}
              title="Click to open color picker"
            >
              <input
                type="color"
                value={currentColor}
                onChange={(e) => setCurrentColor(e.target.value)}
                className="sr-only"
              />
            </label>
            <input
              type="text"
              value={currentColor}
              onChange={(e) => setCurrentColor(e.target.value)}
              placeholder="#0EA5E9"
              className="h-9 w-full rounded-lg border border-slate-200 px-3 font-mono text-xs font-medium text-slate-900 transition focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <AppButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            onClick={() => {
              onSelect(currentColor);
            }}
          >
            Apply Color
          </AppButton>
        </div>
      </div>
    </div>
  );
};

export interface KioskRendererRef {
  submit: () => void;
  reset: () => void;
  getConfig: () => KioskConfig;
  getValues: () => Record<string, any>;
}

export interface KioskRendererProps {
  config?: KioskConfig;
  onSubmit?: (values: Record<string, any>) => void;
  renderMode?: "desktop" | "phone";
  isSubmitting?: boolean;
}

const getGridClass = (cols: number = 2) => {
  switch (cols) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-1 md:grid-cols-2";
    case 3:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    case 4:
      return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
    default:
      return "grid-cols-1 md:grid-cols-2";
  }
};

export const KioskRenderer = forwardRef<KioskRendererRef, KioskRendererProps>(
  function KioskRenderer(
    {
      config = DEFAULT_KIOSK_CONFIG,
      onSubmit,
      renderMode = "desktop",
      isSubmitting = false,
    },
    ref,
  ) {
    const [submitted, setSubmitted] = useState(false);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [activeSwatchPicker, setActiveSwatchPicker] = useState<{
      question: KioskQuestion;
      option: KioskOption;
      currentColor: string;
    } | null>(null);

    const handleSelectOption = (question: KioskQuestion, option: KioskOption) => {
      const qKey = question.api_name || question._uid;
      // Always use _uid as the selection key — it's guaranteed unique per option.
      // This prevents two options sharing the same label/value from both appearing selected.
      const optUid = option._uid;
      // Payload value: prefer explicit value, then color, then label
      const payloadVal = option.value || option.color || option.label || option._uid;

      if (option.field_type === "checkbox") {
        // Multi-select: toggle uid in array
        setAnswers((prev) => {
          const current: any[] = Array.isArray(prev[qKey]) ? prev[qKey] : [];
          const exists = current.some((v) => (typeof v === "object" ? v.uid === optUid : v === optUid));
          return {
            ...prev,
            [qKey]: exists
              ? current.filter((v) => (typeof v === "object" ? v.uid !== optUid : v !== optUid))
              : [...current, { uid: optUid, value: payloadVal }],
          };
        });
      } else {
        // Single-select
        setAnswers((prev) => ({
          ...prev,
          [qKey]: { uid: optUid, value: payloadVal },
        }));
      }
    };

    const handleFormSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isSubmitting) return;
      if (onSubmit) {
        onSubmit(answers);
      } else {
        setSubmitted(true);
      }
    };

    useImperativeHandle(ref, () => ({
      submit: () => handleFormSubmit(),
      reset: () => {
        setSubmitted(false);
        setAnswers({});
        setActiveSwatchPicker(null);
      },
      getConfig: () => config,
      getValues: () => answers,
    }));

    const isPhone = renderMode === "phone";
    const activeQuestions = (config.questions ?? []).filter(
      (q) => q.is_deleted !== true,
    );

    if (submitted) {
      return (
        <div
          className={cn(
            "flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/20",
            isPhone ? "max-w-xs mx-auto py-12" : "w-full py-16",
          )}
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
            <CheckCircle className="size-8" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
            Submission Received
          </h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 max-w-sm">
            Thank you for completing this step. Your response has been recorded.
          </p>
          <AppButton
            variant="secondary"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setAnswers({});
              setActiveSwatchPicker(null);
            }}
            className="mt-6 text-xs"
          >
            Start Over
          </AppButton>
        </div>
      );
    }

    if (activeQuestions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <Layers className="size-10 text-slate-300 dark:text-slate-600 mb-3" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No Questions Configured
          </h4>
          <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
            Drag question sections and radio options in the form builder to preview the interactive kiosk flow.
          </p>
        </div>
      );
    }

    return (
      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Color Swatch Picker Modal */}
        {activeSwatchPicker && (
          <ColorSwatchModal
            question={activeSwatchPicker.question}
            option={activeSwatchPicker.option}
            initialColor={activeSwatchPicker.currentColor}
            onSelect={(chosenColor) => {
              const qKey =
                activeSwatchPicker.question.api_name ||
                activeSwatchPicker.question._uid;
              setAnswers((prev) => ({
                ...prev,
                [qKey]: {
                  uid: activeSwatchPicker.option._uid,
                  value: chosenColor,
                },
              }));
              setActiveSwatchPicker(null);
            }}
            onClose={() => setActiveSwatchPicker(null)}
          />
        )}

        {/* Kiosk Title & Subtitle */}
        {config.name && (
          <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {config.name}
            </h2>
            {config.description && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {config.description}
              </p>
            )}
          </div>
        )}

        {/* Questions List */}
        <div className="space-y-6">
          {activeQuestions.map((question, qIdx) => {
            const qKey = question.api_name || question._uid;
            const selectedVal = answers[qKey];
            const options = question.options || [];

            return (
              <div
                key={question._uid || qIdx}
                className="rounded-sm border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
              >
                {/* Question Title & Subtitle */}
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {question.label || `Question ${qIdx + 1}`}
                  </h3>
                  {question.subLabel && (
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                      {question.subLabel}
                    </p>
                  )}
                </div>

                {/* Options Grid */}
                {options.length > 0 ? (
                  <div className={cn("grid gap-3", getGridClass(question.columns || question.column_count || 2))}>
                    {options.map((option, optIdx) => {
                      const isCheckbox = option.field_type === "checkbox";
                      const isColorSwatch = option.field_type === "color_swatch";
                      const isColor = option.field_type === "color";
                      const isImageRadio = option.field_type === "image_radio";
                      const optUid = option._uid;

                      // answeredColor: only resolve if selectedVal belongs to THIS option (uid match)
                      const answeredColor =
                        isColorSwatch &&
                        typeof selectedVal === "object" &&
                        selectedVal !== null &&
                        selectedVal.uid === optUid &&
                        typeof selectedVal.value === "string" &&
                        selectedVal.value.startsWith("#")
                          ? selectedVal.value
                          : undefined;

                      const currentColor =
                        answeredColor ||
                        option.color ||
                        (typeof option.value === "string" && option.value.startsWith("#")
                          ? option.value
                          : "#0EA5E9");

                      // Use uid for selection identity — prevents cross-option collision
                      const isSelected = isCheckbox
                        ? Array.isArray(selectedVal) &&
                          selectedVal.some((v) =>
                            typeof v === "object" ? v.uid === optUid : v === optUid,
                          )
                        : isColorSwatch
                        ? (typeof selectedVal === "object" && selectedVal !== null
                            ? selectedVal.uid === optUid
                            : selectedVal === optUid) || !!answeredColor
                        : typeof selectedVal === "object" && selectedVal !== null
                        ? selectedVal.uid === optUid
                        : selectedVal === optUid;
                      const inputId = `opt_${question._uid}_${option._uid || optIdx}`;

                      const handleCardClick = () => {
                        if (isColorSwatch) {
                          setActiveSwatchPicker({
                            question,
                            option,
                            currentColor: String(currentColor),
                          });
                        } else {
                          handleSelectOption(question, option);
                        }
                      };

                      return (
                        <div
                          key={option._uid || optIdx}
                          onClick={handleCardClick}
                          className={cn(
                            "relative flex cursor-pointer rounded-sm border overflow-hidden transition-all duration-150 select-none",
                            isImageRadio || !option.image
                              ? "flex-row items-center justify-between gap-3 p-3.5"
                              : "flex-col gap-0",
                            isSelected
                              ? "border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20 shadow-xs dark:border-blue-500 dark:bg-blue-950/30"
                              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/40"
                          )}
                        >
                          {/* Hidden input for accessibility */}
                          <input
                            id={inputId}
                            type={isCheckbox ? "checkbox" : "radio"}
                            checked={isSelected}
                            onChange={handleCardClick}
                            className="sr-only"
                          />

                          {/* Full banner image for non-image_radio options with image */}
                          {!isImageRadio && option.image && (
                            <div className="w-full overflow-hidden">
                              <img
                                src={String(option.image)}
                                alt={option.label || "Option image"}
                                className="h-32 w-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                              />
                            </div>
                          )}

                          <div className={cn("flex items-center justify-between gap-3", !isImageRadio && option.image ? "p-4" : "w-full")}>
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              {/* Indicator: Color Swatch vs Square Checkbox vs Circular Radio */}
                              {isColorSwatch || isColor ? (
                                <div
                                  className={cn(
                                    "mt-0.5 flex size-5.5 shrink-0 items-center justify-center rounded-full border-2 transition-all shadow-xs",
                                    isSelected
                                      ? "border-white ring-2 ring-blue-600 dark:ring-blue-500"
                                      : "border-white ring-1 ring-slate-300 dark:ring-slate-700"
                                  )}
                                  style={{
                                    backgroundColor: String(
                                      isColorSwatch
                                        ? currentColor
                                        : option.color || option.value || "#2563EB"
                                    ),
                                  }}
                                >
                                  {isSelected && (
                                    <Check
                                      size={11}
                                      strokeWidth={3}
                                      className="text-white drop-shadow-[0_1px_1.5px_rgba(0,0,0,0.8)]"
                                    />
                                  )}
                                </div>
                              ) : isCheckbox ? (
                                <div
                                  className={cn(
                                    "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-[4px] border-2 transition-all",
                                    isSelected
                                      ? "border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500"
                                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                  )}
                                >
                                  {isSelected && <Check size={11} strokeWidth={3} />}
                                </div>
                              ) : (
                                <div
                                  className={cn(
                                    "mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                                    isSelected
                                      ? "border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500"
                                      : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800"
                                  )}
                                >
                                  {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                                </div>
                              )}

                              {/* Height-matching image thumbnail for image_radio */}
                              {isImageRadio && option.image && (
                                <div className="size-12 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-2xs">
                                  <img
                                    src={String(option.image)}
                                    alt={option.label || "Option preview"}
                                    className="h-full w-full object-cover"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                  />
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                                    {option.label ||
                                      (isColorSwatch
                                        ? "Color Swatch Option"
                                        : isColor
                                        ? "Color Option"
                                        : isCheckbox
                                        ? "Checkbox Option"
                                        : isImageRadio
                                        ? "Image Radio Option"
                                        : "Radio Option")}
                                  </span>
                                  {answeredColor && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300">
                                      <span
                                        className="size-2 rounded-full border border-black/10"
                                        style={{ backgroundColor: answeredColor }}
                                      />
                                      {answeredColor}
                                    </span>
                                  )}
                                </div>
                                {option.subLabel && (
                                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                                    {option.subLabel}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Price + swatch button */}
                            <div className="flex items-center gap-2 shrink-0">
                              {option.price && (
                                <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                                  ${option.price}
                                </span>
                              )}

                              {isColorSwatch && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveSwatchPicker({
                                      question,
                                      option,
                                      currentColor: String(currentColor),
                                    });
                                  }}
                                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                >
                                  <Palette size={12} className="text-blue-600 dark:text-blue-400" />
                                  <span>{answeredColor ? "Change Color" : "Select Color"}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500">
                    No options available for this question.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Submit Action */}
        <div className="flex items-center justify-end pt-4 border-t border-slate-100 dark:border-slate-800">
          <AppButton
            type="submit"
            size="md"
            loading={isSubmitting}
            className="w-full sm:w-auto px-6 font-semibold"
          >
            <Send className="mr-1.5 size-4" />
            {config.submitting?.button_text || "Submit"}
          </AppButton>
        </div>
      </form>
    );
  }
);