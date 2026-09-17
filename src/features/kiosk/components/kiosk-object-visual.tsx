"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Layers, Palette } from "lucide-react";
import type { KioskOption, KioskQuestion, PositionValue } from "../types/kiosk.types";
import { applyColorFill } from "../utils/kiosk-color-fill";
import { kioskPlacementOverlayClass } from "../utils/kiosk-placement-styles";
import { cn } from "@/core/utils/http.util";

type QuestionAnswer =
  | { uid: string; value?: string | number }
  | string
  | undefined;

interface KioskObjectVisualProps {
  question: KioskQuestion;
  selectedAnswer?: QuestionAnswer;
  /** When set, preview this option's visual even if not the active selection (builder modal live sync) */
  previewOption?: KioskOption | null;
  className?: string;
}

function resolveSelectedOption(
  question: KioskQuestion,
  selectedAnswer?: QuestionAnswer,
): KioskOption | null {
  if (!selectedAnswer) return null;
  const options = question.options || [];
  if (typeof selectedAnswer === "object" && selectedAnswer !== null && selectedAnswer.uid) {
    return options.find((o) => o._uid === selectedAnswer.uid) ?? null;
  }
  const key = typeof selectedAnswer === "string" ? selectedAnswer : String(selectedAnswer);
  return (
    options.find((o) => o._uid === key || o.value === key || o.label === key) ?? null
  );
}

function getOptionByUid(question: KioskQuestion, uid?: string | null): KioskOption | null {
  if (!uid) return null;
  return (question.options || []).find((o) => o._uid === uid) ?? null;
}

function resolveFillColor(option: KioskOption, selectedAnswer?: QuestionAnswer): string {
  if (
    typeof selectedAnswer === "object" &&
    selectedAnswer !== null &&
    selectedAnswer.uid === option._uid &&
    typeof selectedAnswer.value === "string" &&
    selectedAnswer.value.startsWith("#")
  ) {
    return selectedAnswer.value;
  }
  return String(option.color || option.fill_color || option.value || "#2563EB");
}

export const KioskObjectVisual: React.FC<KioskObjectVisualProps> = ({
  question,
  selectedAnswer,
  previewOption,
  className,
}) => {
  const options = question.options || [];
  const activeOption = previewOption ?? resolveSelectedOption(question, selectedAnswer);

  const hasImageOps = useMemo(
    () =>
      options.some(
        (o) =>
          o.image ||
          o.fill_image ||
          o.target_image_field ||
          o.placement?.target_field ||
          o.field_type === "image_radio" ||
          o.field_type === "color" ||
          o.field_type === "color_swatch",
      ),
    [options],
  );

  const [filledSrc, setFilledSrc] = useState<string>("");
  const [fillLoading, setFillLoading] = useState(false);

  const colorScene = useMemo(() => {
    if (!activeOption) return null;
    const isColor =
      activeOption.field_type === "color" || activeOption.field_type === "color_swatch";
    if (!isColor) return null;

    const targetUid =
      activeOption.target_image_field || activeOption.placement?.target_field;
    const targetOpt = getOptionByUid(question, targetUid);
    const fillSrc =
      (activeOption.fill_image as string) ||
      (targetOpt?.image as string) ||
      "";

    if (!fillSrc) return null;

    return {
      fillSrc,
      color: resolveFillColor(activeOption, selectedAnswer),
      label: activeOption.label || "Color fill",
      targetLabel: targetOpt?.label,
    };
  }, [activeOption, question, selectedAnswer]);

  const placementScene = useMemo(() => {
    if (!activeOption || activeOption.field_type !== "image_radio") return null;
    const mode =
      activeOption.placement_mode || activeOption.placement?.mode || "group";
    if (mode !== "place") return null;

    const targetUid =
      activeOption.target_image_field || activeOption.placement?.target_field;
    const targetOpt = getOptionByUid(question, targetUid);
    const baseImage = targetOpt?.image as string | undefined;
    if (!baseImage && !activeOption.image) return null;

    const position: PositionValue =
      activeOption.placement_position ||
      activeOption.placement?.position ||
      "center";

    return {
      baseImage: baseImage || "",
      overlayImage: (activeOption.image as string) || "",
      position,
      targetLabel: targetOpt?.label || "Canvas",
      objectLabel: activeOption.label || "Object",
    };
  }, [activeOption, question]);

  useEffect(() => {
    if (!colorScene) {
      setFilledSrc("");
      setFillLoading(false);
      return;
    }
    let cancelled = false;
    setFillLoading(true);
    applyColorFill(colorScene.fillSrc, colorScene.color).then((result) => {
      if (!cancelled) {
        setFilledSrc(result);
        setFillLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [colorScene?.fillSrc, colorScene?.color]);

  if (!hasImageOps) return null;

  const showColorPanel = !!colorScene;
  const showPlacementPanel = !!placementScene;

  if (!showColorPanel && !showPlacementPanel) {
    return (
      <div
        className={cn(
          "mb-4 rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4 text-center dark:border-slate-700 dark:bg-slate-800/30",
          className,
        )}
      >
        <Layers className="mx-auto mb-1.5 size-5 text-slate-300 dark:text-slate-600" />
        <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
          Select an image or color option to preview the object visual
        </p>
      </div>
    );
  }

  return (
    <div className={cn("mb-4 space-y-3", className)}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Layers className="size-3.5 text-blue-600 dark:text-blue-400" />
        Live object visual
      </div>

      {showColorPanel && colorScene && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Color-filled object
              {colorScene.targetLabel ? ` · ${colorScene.targetLabel}` : ""}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold text-slate-700 dark:text-slate-200">
              <span
                className="size-2.5 rounded-full border border-black/10"
                style={{ backgroundColor: colorScene.color }}
              />
              {colorScene.color.toUpperCase()}
            </span>
          </div>
          <div className="relative flex h-40 items-center justify-center bg-slate-100 p-3 dark:bg-slate-950">
            {fillLoading && !filledSrc ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Palette className="size-4 animate-pulse text-blue-500" />
                Applying color fill…
              </div>
            ) : filledSrc ? (
              <img
                src={filledSrc}
                alt={colorScene.label}
                className="max-h-full max-w-full object-contain drop-shadow-md"
              />
            ) : (
              <p className="text-xs text-slate-500">Could not render color fill</p>
            )}
          </div>
        </div>
      )}

      {showPlacementPanel && placementScene && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
              Canvas placement · {placementScene.targetLabel}
            </span>
            <span className="font-mono text-[10px] font-bold capitalize text-blue-600 dark:text-blue-400">
              {placementScene.position}
            </span>
          </div>
          <div className="relative h-44 w-full bg-slate-100 dark:bg-slate-950">
            {placementScene.baseImage ? (
              <img
                src={placementScene.baseImage}
                alt={placementScene.targetLabel}
                className="size-full object-cover opacity-90"
              />
            ) : (
              <div className="flex size-full items-center justify-center text-xs text-slate-500">
                No target canvas image
              </div>
            )}

            {placementScene.overlayImage ? (
              <div
                className={kioskPlacementOverlayClass(placementScene.position)}
              >
                <img
                  src={placementScene.overlayImage}
                  alt={placementScene.objectLabel}
                  className="size-full object-cover"
                />
              </div>
            ) : (
              <div
                className={cn(
                  kioskPlacementOverlayClass(placementScene.position, "size-14"),
                  "flex items-center justify-center border-dashed border-blue-500/80 bg-blue-500/20 text-[10px] font-bold text-blue-700 dark:text-blue-300",
                )}
              >
                {placementScene.position}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
