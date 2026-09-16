"use client";

import React, { forwardRef, useImperativeHandle, useState } from "react";
import { CheckCircle, CheckCircle2, Layers, Send, Sparkles, CreditCard } from "lucide-react";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import type { KioskConfig, KioskField } from "../types/kiosk.types";
import { DEFAULT_KIOSK_CONFIG } from "../types/kiosk.types";

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
    const [selectedFields, setSelectedFields] = useState<Record<string, any>>({});

    const toggleFieldSelection = (field: KioskField) => {
      const key = field.api_name || field._uid;
      const isMulti = field.input_type === "checkbox";

      setSelectedFields((prev) => {
        if (isMulti) {
          const currentArr = Array.isArray(prev[key]) ? prev[key] : [];
          const exists = currentArr.includes(field.value || field.label);
          const nextArr = exists
            ? currentArr.filter((v: any) => v !== (field.value || field.label))
            : [...currentArr, field.value || field.label];
          return { ...prev, [key]: nextArr };
        }

        // Single selection
        const isSelected = prev[key] === (field.value || field.label);
        return {
          ...prev,
          [key]: isSelected ? undefined : field.value || field.label,
        };
      });
    };

    const handleFormSubmit = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (isSubmitting) return;
      if (onSubmit) {
        onSubmit(selectedFields);
      } else {
        setSubmitted(true);
      }
    };

    useImperativeHandle(ref, () => ({
      submit: () => handleFormSubmit(),
      reset: () => {
        setSubmitted(false);
        setSelectedFields({});
      },
      getConfig: () => config,
      getValues: () => selectedFields,
    }));

    const isPhone = renderMode === "phone";
    const activeSections = (config.sections ?? []).filter(
      (sec) => sec.is_deleted !== true,
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
            Thank you for completing this step. Your information has been recorded successfully.
          </p>
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setSubmitted(false);
              setSelectedFields({});
            }}
            className="mt-6 text-xs"
          >
            Start New Submission
          </AppButton>
        </div>
      );
    }

    return (
      <form
        onSubmit={handleFormSubmit}
        className={cn(
          "w-full transition-all duration-200",
          isPhone
            ? "mx-auto max-w-[380px] rounded-3xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-800 dark:bg-slate-950"
            : "space-y-6",
        )}
      >
        {/* ── Kiosk Main Header ── */}
        {config.name && (
          <div
            className={cn(
              "rounded-xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/40",
              isPhone ? "p-4 text-center" : "",
            )}
          >
            <h2
              className={cn(
                "font-bold text-slate-900 dark:text-slate-100",
                isPhone ? "text-base" : "text-xl",
              )}
            >
              {config.name}
            </h2>
            {config.description && (
              <p
                className={cn(
                  "mt-1 text-slate-500 dark:text-slate-400 leading-relaxed",
                  isPhone ? "text-xs" : "text-sm",
                )}
              >
                {config.description}
              </p>
            )}
          </div>
        )}

        {/* ── Kiosk Sections ── */}
        <div className={cn("space-y-4", isPhone ? "mt-4 space-y-3" : "")}>
          {activeSections.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-10 text-center dark:border-slate-800">
              <Layers className="size-8 text-slate-300 dark:text-slate-600" />
              <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                No active sections configured in this kiosk.
              </p>
            </div>
          ) : (
            activeSections.map((sec, idx) => (
              <div
                key={sec._uid || `sec-${idx}`}
                className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900/50"
              >
                {/* Section Header: Heading & Subheading */}
                <div className="border-b border-slate-100 bg-slate-50/60 px-5 py-4 dark:border-slate-800/80 dark:bg-slate-900/80">
                  <div className="flex items-center gap-2">
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {sec.heading || sec.name || `Section ${idx + 1}`}
                    </h3>
                  </div>
                  {sec.subheading && (
                    <p className="mt-1 pl-7 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {sec.subheading}
                    </p>
                  )}
                </div>

                {/* Section Fields Area */}
                <div className="p-5">
                  {sec.fields && sec.fields.length > 0 ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {sec.fields.map((f) => {
                        const key = f.api_name || f._uid;
                        const isMulti = f.input_type === "checkbox";
                        const isSelected = isMulti
                          ? Array.isArray(selectedFields[key]) &&
                            selectedFields[key].includes(f.value || f.label)
                          : selectedFields[key] === (f.value || f.label);
                        const colorAccent = f.color || "#2563EB";

                        return (
                          <div
                            key={f._uid}
                            onClick={() => toggleFieldSelection(f)}
                            className={cn(
                              "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border-2 transition-all duration-200 shadow-xs hover:shadow-md",
                              isSelected
                                ? "scale-[1.01] shadow-md ring-2 ring-offset-1"
                                : "border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600 bg-white dark:bg-slate-800",
                            )}
                            style={{
                              borderColor: isSelected ? colorAccent : undefined,
                            }}
                          >
                            {/* Card Image Thumbnail if provided */}
                            {f.image ? (
                              <div className="relative h-28 w-full overflow-hidden bg-slate-100 dark:bg-slate-700">
                                <img
                                  src={f.image}
                                  alt={f.field_label || f.label}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = "none";
                                  }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                              </div>
                            ) : (
                              <div
                                className="flex h-14 w-full items-center px-4"
                                style={{ backgroundColor: `${colorAccent}14` }}
                              >
                                <div
                                  className="flex size-8 items-center justify-center rounded-lg shadow-xs"
                                  style={{ backgroundColor: colorAccent, color: "#fff" }}
                                >
                                  <CreditCard className="size-4" />
                                </div>
                              </div>
                            )}

                            {/* Card Details */}
                            <div className="flex flex-1 flex-col justify-between p-3.5">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                                    {f.field_label || f.label}
                                  </h4>
                                  {f.description && (
                                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                                      {f.description}
                                    </p>
                                  )}
                                </div>

                                <div
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                                    isSelected
                                      ? "border-transparent text-white"
                                      : "border-slate-300 text-transparent dark:border-slate-600",
                                  )}
                                  style={{
                                    backgroundColor: isSelected ? colorAccent : "transparent",
                                  }}
                                >
                                  <CheckCircle2 className="size-3.5" />
                                </div>
                              </div>

                              {f.value && (
                                <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 dark:border-slate-700/50">
                                  <span className="font-mono text-[10px] text-slate-400 uppercase">
                                    {f.api_name}
                                  </span>
                                  <span
                                    className="rounded px-1.5 py-0.2 text-[10px] font-medium"
                                    style={{ backgroundColor: `${colorAccent}15`, color: colorAccent }}
                                  >
                                    {f.value}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Required Tag */}
                            {f.required && (
                              <div className="absolute top-2 left-2 rounded bg-red-500/90 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                                Required
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 py-6 text-center dark:border-slate-800/60 dark:bg-slate-950/30">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
                        <Sparkles className="size-3.5" />
                        <span>No fields inside this section</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Submitting Area (Heading, Subheading & Action) ── */}
        <div
          className={cn(
            "rounded-xl border border-slate-200/90 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900/50",
            isPhone ? "mt-4 p-4 text-center" : "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4",
          )}
        >
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {config.submitting?.heading || "Complete Submission"}
            </h4>
            {config.submitting?.subheading && (
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
                {config.submitting.subheading}
              </p>
            )}
          </div>

          <div className={cn("shrink-0", isPhone ? "mt-3" : "")}>
            <AppButton
              type="submit"
              variant="primary"
              size={isPhone ? "sm" : "md"}
              loading={isSubmitting}
              disabled={isSubmitting}
              className={cn("font-semibold", isPhone ? "w-full justify-center" : "")}
            >
              <Send className="mr-1.5 size-3.5" />
              {config.submitting?.button_text || "Submit"}
            </AppButton>
          </div>
        </div>
      </form>
    );
  },
);

KioskRenderer.displayName = "KioskRenderer";
export default KioskRenderer;