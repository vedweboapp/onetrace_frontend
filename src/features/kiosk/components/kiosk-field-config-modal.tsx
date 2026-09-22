"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Sparkles,
  AlertCircle,
  Palette,
  Check,
  ImageIcon,
} from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { KIOSK_FIELD_TYPES } from "../types/kiosk-field-types";
import type {
  KioskOption,
  PlacementMode,
  ColorFillConfig,
} from "../types/kiosk.types";
import { cn } from "@/core/utils/http.util";
import { applyColorFill } from "../utils/kiosk-color-fill";
import { deriveApiNameFromLabel } from "../utils/kiosk-api-name";

interface KioskFieldConfigModalProps {
  option: KioskOption;
  questionUid?: string;
  questions?: any[];
  onSave: (updated: KioskOption) => void;
  onClose: () => void;
  /** Emits draft changes so split live preview can sync before save */
  onDraftChange?: (draft: KioskOption) => void;
}

const ALLOWED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
  "image/gif",
];

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".gif"];

function isValidImageFile(file: File): boolean {
  const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
  return (
    ALLOWED_IMAGE_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(ext)
  );
}

function parseColorAlpha(val: string): { hex: string; alpha: number } {
  if (!val) return { hex: "#2563EB", alpha: 100 };
  if (val.startsWith("rgba")) {
    const m = val.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (m) {
      const r = parseInt(m[1]).toString(16).padStart(2, "0");
      const g = parseInt(m[2]).toString(16).padStart(2, "0");
      const b = parseInt(m[3]).toString(16).padStart(2, "0");
      const a = m[4] != null ? parseFloat(m[4]) : 1;
      return { hex: `#${r}${g}${b}`, alpha: Math.round(a * 100) };
    }
  }
  if (val.startsWith("#")) {
    if (val.length === 9) {
      const hex = val.substring(0, 7);
      const a = parseInt(val.substring(7, 9), 16) / 255;
      return { hex, alpha: Math.round(a * 100) };
    }
    return { hex: val.substring(0, 7), alpha: 100 };
  }
  return { hex: val, alpha: 100 };
}

function formatColorAlpha(hex: string, alphaPercent: number): string {
  const cleanHex = hex.startsWith("#") ? hex : `#${hex}`;
  if (alphaPercent >= 100) return cleanHex;
  const a = Math.max(0, Math.min(100, alphaPercent)) / 100;
  const r = parseInt(cleanHex.substring(1, 3), 16) || 0;
  const g = parseInt(cleanHex.substring(3, 5), 16) || 0;
  const b = parseInt(cleanHex.substring(5, 7), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

const checkerboardPattern: React.CSSProperties = {
  backgroundImage: `
    linear-gradient(45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(-45deg, #cbd5e1 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #cbd5e1 75%),
    linear-gradient(-45deg, transparent 75%, #cbd5e1 75%)
  `,
  backgroundSize: "10px 10px",
  backgroundPosition: "0 0, 0 5px, 5px -5px, -5px 0",
};

function getQuestionUid(question: any): string {
  return question?.q_id || question?._uid || "";
}

function getQuestionOptions(question: any): any[] {
  return [
    ...(question?.options || []),
    ...(question?.groups || []).flatMap((group: any) => group.options || []),
  ];
}

export const KioskFieldConfigModal: React.FC<KioskFieldConfigModalProps> = ({
  option,
  questionUid,
  questions = [],
  onSave,
  onClose,
  onDraftChange,
}) => {
  const fieldType = (option.field_type as string) || "radio";
  const def = KIOSK_FIELD_TYPES[fieldType] ?? KIOSK_FIELD_TYPES.radio;

  const owningQuestion = React.useMemo(() => {
    if (questionUid) {
      return (questions || []).find((q: any) => (q.q_id || q._uid) === questionUid) || null;
    }

    const optionUid = option.o_id || option.uid || option._uid;
    return (questions || []).find((q: any) => {
      const allOpts = getQuestionOptions(q);
      return allOpts.some((opt: any) => (opt.o_id || opt.uid || opt._uid) === optionUid);
    }) || null;
  }, [option, questionUid, questions]);

  const isLookupImageQuestion = !!(
    owningQuestion &&
    owningQuestion.is_lookup &&
    (owningQuestion.lookup_option_type || "radio") === "image_radio"
  );

  const isColorField = fieldType === "color" || fieldType === "color_swatch";
  const isImageRadioField = fieldType === "image_radio";

  const [formData, setFormData] = useState<KioskOption>(() => ({
    ...def.defaultConfig(),
    ...option,
  }));

  const [colorFilledPreview, setColorFilledPreview] = useState<string>("");
  const [imageError, setImageError] = useState<string | null>(null);
  // 'individual' = pick specific image options; 'question' = target a whole question
  const [fillScopeMode, setFillScopeMode] = useState<'individual' | 'question'>(
    () => (option.fill_target_question ? 'question' : 'individual'),
  );
  const [placementScopeMode, setPlacementScopeMode] = useState<'individual' | 'question'>(
    () => (option.placement_target_question || option.placement?.target_question ? 'question' : 'individual'),
  );

  useEffect(() => {
    const merged: KioskOption = { ...def.defaultConfig(), ...option };
    const label = merged.label || "";
    if (label) {
      const ft = merged.field_type || "radio";
      const apiName = deriveApiNameFromLabel(
        label,
        ft === "input" ? "input_field" : "option",
      );
      merged.api_name = apiName;
      if (ft === "radio" || ft === "checkbox" || ft === "image_radio") {
        merged.value =
          ft === "image_radio" && merged.composite_item_id != null
            ? String(merged.composite_item_id)
            : apiName;
      }
    }
    setFormData(merged);
    setFillScopeMode(option.fill_target_question ? 'question' : 'individual');
    setPlacementScopeMode(
      option.placement_target_question || option.placement?.target_question
        ? 'question'
        : 'individual',
    );
  }, [option]);


  useEffect(() => {
    const timer = setTimeout(() => {
      onDraftChange?.(formData);
    }, 80);
    return () => clearTimeout(timer);
  }, [formData, onDraftChange]);

  // ──────────────────────────────────────────────────────────────
  // Derived: all external image options (excluding own question)
  // ──────────────────────────────────────────────────────────────
  const optId = option.o_id || option.uid || option._uid;
  const ownQuestionUid = React.useMemo(() => {
    const found = (questions || []).find((q: any) => {
      const allOpts = getQuestionOptions(q);
      return allOpts.some((opt: any) => (opt.o_id || opt.uid || opt._uid) === optId);
    });
    return questionUid || getQuestionUid(found) || null;
  }, [questions, optId, questionUid]);

  // All questions that are NOT this option's own question
  const availableQuestions = React.useMemo(() => {
    return (questions || []).filter((q: any) => getQuestionUid(q) !== ownQuestionUid);
  }, [questions, ownQuestionUid]);

  // All image-bearing options from external questions
  const availableImageFields = React.useMemo(() => {
    const list: { uid: string; label: string; questionUid: string; questionLabel: string; image: string }[] = [];
    availableQuestions.forEach((q: any, qIdx: number) => {
      const allOpts = getQuestionOptions(q);
      allOpts.forEach((opt: any, optIdx: number) => {
        const itemUid = opt.o_id || opt.uid || opt._uid;
        if (itemUid === optId) return;
        const img = opt.image || opt.fill_image;
        if (img) {
          list.push({
            uid: itemUid,
            label: opt.label || `Option ${optIdx + 1}`,
            questionUid: getQuestionUid(q),
            questionLabel: q.label || `Question ${qIdx + 1}`,
            image: String(img),
          });
        }
      });
    });
    return list;
  }, [availableQuestions, optId]);

  // Current fill_targets array (UIDs of targeted options)
  const fillTargets: string[] = React.useMemo(
    () => Array.isArray(formData.fill_targets) ? formData.fill_targets : [],
    [formData.fill_targets],
  );

  // First fill target's image — used for live preview
  const firstFillTargetImage = React.useMemo(() => {
    if (formData.fill_image) return formData.fill_image as string;
    const firstUid = fillTargets[0];
    if (!firstUid) return "";
    return availableImageFields.find((f) => f.uid === firstUid)?.image || "";
  }, [fillTargets, availableImageFields, formData.fill_image]);

  // activeFillImageSrc — gates live preview: only if there's a target
  const activeFillImageSrc = firstFillTargetImage;

  // Placement variables for image_radio
  // Only treat a mode as active if the user explicitly set it
  const placementMode: PlacementMode | undefined =
    formData.placement_mode || formData.placement?.mode || undefined;

  // Current placement_targets array (UIDs of target canvas options)
  const placementTargets: string[] = React.useMemo(() => {
    if (Array.isArray(formData.placement_targets)) return formData.placement_targets;
    if (Array.isArray(formData.placement?.target_fields)) return formData.placement.target_fields;
    if (formData.target_image_field) return [formData.target_image_field];
    if (formData.placement?.target_field) return [formData.placement.target_field];
    return [];
  }, [
    formData.placement_targets,
    formData.placement?.target_fields,
    formData.target_image_field,
    formData.placement?.target_field,
  ]);

  const selectedTargetField = availableImageFields.find(
    (f) =>
      placementTargets.includes(f.uid) ||
      f.uid ===
      (formData.target_image_field || formData.placement?.target_field),
  );

  // Real-time update for Color Fill on color / color_swatch options
  useEffect(() => {
    let isMounted = true;
    if (!isColorField || !activeFillImageSrc) {
      setColorFilledPreview("");
      return;
    }
    const colorToApply = formData.color || formData.value || "#2563EB";
    const timer = setTimeout(() => {
      applyColorFill(activeFillImageSrc, String(colorToApply)).then((result) => {
        if (isMounted) setColorFilledPreview(result);
      });
    }, 40);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isColorField, activeFillImageSrc, formData.color, formData.value]);

  const handlePlacementModeChange = (mode: PlacementMode) => {
    setFormData((prev) => {
      if (mode === "group") {
        return {
          ...prev,
          placement_mode: "group",
          target_image_field: undefined,
          placement_targets: undefined,
          placement_target_question: undefined,
          placement: {
            mode: "group",
          },
        };
      } else {
        const currentTargets = placementTargets.length > 0
          ? placementTargets
          : availableImageFields.length > 0
          ? [availableImageFields[0].uid]
          : [];
        const nextTargetField = currentTargets[0] || undefined;

        return {
          ...prev,
          placement_mode: "place",
          target_image_field: nextTargetField,
          placement_targets: currentTargets,
          placement: {
            mode: "place",
            target_field: nextTargetField,
            target_fields: currentTargets,
          },
        };
      }
    });
  };

  const handleSelectTargetField = (targetUid: string) => {
    const found = availableImageFields.find((f) => f.uid === targetUid);
    const chosenUid = found ? found.uid : "";
    setFormData((prev) => ({
      ...prev,
      target_image_field: chosenUid,
      placement_targets: chosenUid ? [chosenUid] : [],
      placement: {
        mode: prev.placement_mode || "place",
            coordinates: prev.placement?.coordinates || null,
        target_field: chosenUid || null,
        target_fields: chosenUid ? [chosenUid] : [],
        target_question: null,
      },
    }));
  };

  /** Toggle a single option UID in placement_targets (individual scope) */
  const handleTogglePlacementTarget = (targetUid: string) => {
    setFormData((prev) => {
      const current: string[] = Array.isArray(prev.placement_targets)
        ? prev.placement_targets
        : prev.target_image_field
        ? [prev.target_image_field]
        : [];
      const exists = current.includes(targetUid);
      const next = exists ? current.filter((uid) => uid !== targetUid) : [...current, targetUid];
      const primary = next[0] || undefined;
      return {
        ...prev,
        placement_targets: next,
        placement_target_question: null,
        target_image_field: primary,
        placement: {
          mode: prev.placement_mode || "place",
          coordinates: prev.placement?.coordinates || null,
          target_field: primary || null,
          target_fields: next,
          target_question: null,
        },
      };
    });
  };

  /** Select a whole question for placement targeting */
  const handleSelectPlacementQuestion = (targetQuestionUid: string) => {
    if (!targetQuestionUid) {
      setFormData((prev) => ({
        ...prev,
        placement_target_question: null,
        placement_targets: [],
        target_image_field: undefined,
        placement: {
          mode: prev.placement_mode || "place",
          coordinates: prev.placement?.coordinates || null,
          target_field: null,
          target_fields: [],
          target_question: null,
        },
      }));
      return;
    }
    const qFields = availableImageFields.filter((f) => f.questionUid === targetQuestionUid);
    const targetUids = qFields.map((f) => f.uid);
    const primary = targetUids[0] || undefined;
    setFormData((prev) => ({
      ...prev,
      placement_target_question: targetQuestionUid,
      placement_targets: targetUids,
      target_image_field: primary,
      placement: {
        mode: prev.placement_mode || "place",
        coordinates: prev.placement?.coordinates || null,
        target_field: primary || null,
        target_fields: targetUids,
        target_question: targetQuestionUid,
      },
    }));
  };

  /** Toggle a single option UID in fill_targets (individual scope) */
  const handleToggleFillTarget = (targetUid: string) => {
    setFormData((prev) => {
      const current: string[] = Array.isArray(prev.fill_targets) ? prev.fill_targets : [];
      const exists = current.includes(targetUid);
      const next = exists ? current.filter((uid) => uid !== targetUid) : [...current, targetUid];
      return {
        ...prev,
        fill_targets: next,
        fill_target_question: null,
        target_image_field: next[0] || null,
      };
    });
  };

  /** Select an entire question — all its image-bearing options become targets */
  const handleSelectFillQuestion = (qUid: string) => {
    if (!qUid) {
      setFormData((prev) => ({ ...prev, fill_targets: [], fill_target_question: null }));
      return;
    }
    const q = availableQuestions.find((q: any) => getQuestionUid(q) === qUid);
    if (!q) return;
    const imageUids = getQuestionOptions(q)
      .filter((o: any) => o.image || o.fill_image)
      .map((o: any) => (o.uid || o._uid) as string)
      .filter(Boolean);
    setFormData((prev) => ({
      ...prev,
      fill_targets: imageUids,
      fill_target_question: qUid,
      target_image_field: imageUids[0] || null,
      fill_image: undefined,
    }));
  };

  /** Legacy single-field handler kept for placement logic compatibility */
  const handleSelectFillField = (targetUid: string) => {
    const found = availableImageFields.find((f) => f.uid === targetUid);
    setFormData((prev) => ({
      ...prev,
      target_image_field: found ? found.uid : "",
      fill_image: found ? found.image : prev.fill_image,
      color_fill: {
        imageId: found ? found.uid : prev._uid,
        colorValue: String(prev.color || "#2563EB"),
      },
    }));
  };

  const handleFileChange = (file?: File, targetKey: keyof KioskOption = "image") => {
    if (!file) return;
    if (!isValidImageFile(file)) {
      setImageError(
        "Invalid file type. Only image files (SVG, PNG, JPG, WebP, GIF) are allowed.",
      );
      return;
    }
    setImageError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => {
        const updated: KioskOption = { ...prev, [targetKey]: dataUrl };
        if (targetKey === "fill_image" && prev.color_fill) {
          updated.color_fill = {
            ...prev.color_fill,
            colorValue: String(prev.color || "#2563EB"),
          };
        }
        return updated;
      });
    };
    reader.readAsDataURL(file);
  };

  const syncApiNameFromLabel = (
    prev: KioskOption,
    label: string,
  ): Pick<KioskOption, "api_name" | "value"> => {
    const ft = prev.field_type || "radio";
    const apiName = deriveApiNameFromLabel(
      label,
      ft === "input" ? "input_field" : "option",
    );
    if (ft === "radio" || ft === "checkbox" || ft === "image_radio") {
      return {
        api_name: apiName,
        value:
          ft === "image_radio" && prev.composite_item_id != null
            ? String(prev.composite_item_id)
            : apiName,
      };
    }
    if (ft === "input") {
      return { api_name: apiName };
    }
    return { api_name: apiName };
  };

  const handleChange = (key: keyof KioskOption, val: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: val };
      if (key === "color") {
        updated.color = val;
        updated.value = val;
        if (prev.color_fill) {
          updated.color_fill = {
            ...prev.color_fill,
            colorValue: val,
          };
        }
      }
      if (key === "label") {
        Object.assign(updated, syncApiNameFromLabel(prev, String(val)));
      }
      return updated;
    });
  };

  const handleSave = () => {
    if (isColorField) {
      const finalColor = formData.color || formData.value || "#2563EB";
      const finalTargets = Array.isArray(formData.fill_targets)
        ? formData.fill_targets.filter(Boolean)
        : [];
      const chosenTargetId = finalTargets[0] || formData.target_image_field || null;

      const finalColorFill: ColorFillConfig | null = chosenTargetId
        ? {
            imageId: chosenTargetId,
            colorValue: String(finalColor),
          }
        : null;

      // Clean out placement properties which do not belong to color fields
      const { placement, placement_mode, ...cleanData } = formData;

      const colorLabel = formData.label || "Color Choice";
      const colorApiName = deriveApiNameFromLabel(colorLabel, "color_choice");

      onSave({
        ...cleanData,
        api_name: colorApiName,
        value: String(finalColor),
        color: String(finalColor),
        fill_color: String(finalColor),
        fill_targets: finalTargets.length > 0 ? finalTargets : undefined,
        color_fill: finalColorFill,
        target_image_field: chosenTargetId,
      });
    } else {
      const ft = formData.field_type || "radio";
      const isImageRadio = ft === "image_radio";
      const normalizedApiName = deriveApiNameFromLabel(
        formData.label || (ft === "input" ? "input_field" : "option"),
        ft === "input" ? "input_field" : "option",
      );

      const normalizedValue =
        ft === "image_radio"
          ? String(formData.composite_item_id ?? formData.value ?? normalizedApiName)
          : ft === "radio" || ft === "checkbox"
          ? normalizedApiName
          : ft === "input"
          ? (formData.value ?? "")
          : formData.value;

      const cleanData = { ...formData };
      if (!isImageRadio) {
        delete cleanData.placement;
        delete cleanData.placement_mode;
        delete cleanData.placement_targets;
        delete cleanData.placement_target_question;
      } else if (!cleanData.placement_mode) {
        // User never clicked a placement button — strip the placement props entirely
        delete cleanData.placement;
        delete cleanData.placement_mode;
        delete cleanData.placement_position;
        delete cleanData.placement_scale_ratio;
        delete cleanData.placement_targets;
        delete cleanData.placement_target_question;
      } else if (cleanData.placement_mode === "group") {
        cleanData.placement = { mode: "group" };
        delete cleanData.placement_targets;
        delete cleanData.placement_target_question;
        delete cleanData.target_image_field;
      } else if (cleanData.placement_mode === "place") {
        const finalPlacementTargets = placementTargets.filter(Boolean);
        const primaryTarget = finalPlacementTargets[0] || null;
        cleanData.placement_targets = finalPlacementTargets.length > 0 ? finalPlacementTargets : undefined;
        cleanData.target_image_field = primaryTarget;
        cleanData.placement = {
          mode: "place",
          coordinates: formData.placement?.coordinates || null,
          target_field: primaryTarget,
          target_fields: finalPlacementTargets.length > 0 ? finalPlacementTargets : null,
          target_question: formData.placement_target_question || null,
        };
      }

      onSave({
        ...cleanData,
        api_name: normalizedApiName,
        value: normalizedValue,
      });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-md border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800 shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configure {def.label}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {def.description}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex size-7 items-center justify-center rounded-sm text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* 2-Column Body: Left Form Inputs | Right Live Preview */}
        <div className="flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Left Column: Form Fields */}
          <div className="w-full md:w-7/12 space-y-4 p-5 overflow-y-auto custom-scrollbar">
            {/* 1. Placement Section: ONLY for Image Radio Option */}
            {isImageRadioField && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Placement
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => handlePlacementModeChange("place")}
                      className={cn(
                        "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                        placementMode === "place"
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                      )}
                    >
                      Place / Overlap
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePlacementModeChange("group")}
                      className={cn(
                        "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                        placementMode === "group"
                          ? "bg-blue-600 text-white shadow-xs font-semibold"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                      )}
                    >
                      Group
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {placementMode === "place"
                      ? "Place mode: Select target image field in kiosk and choose position"
                      : placementMode === "group"
                      ? "Group mode: Standard grouped option without positioning coordinates"
                      : "No placement mode set — option will be grouped by default"}
                  </p>
                </div>

                {/* When placementMode === 'place': Target Field Selection + Joystick */}
                {placementMode === "place" && (
                  <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700/80 dark:bg-slate-800/80 space-y-3">
                    {/* Header with selected count */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Target Canvas Images
                      </label>
                      {placementTargets.length > 0 && (
                        <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                          {placementTargets.length} selected
                        </span>
                      )}
                    </div>

                    {/* Scope toggle: Individual images vs Whole question */}
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setPlacementScopeMode('individual');
                          setFormData((prev) => ({
                            ...prev,
                            placement_target_question: null,
                            placement: {
                              ...(prev.placement || { mode: "place" }),
                              target_question: null,
                            },
                          }));
                        }}
                        className={cn(
                          "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                          placementScopeMode === 'individual'
                            ? "bg-blue-600 text-white shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        Individual Images
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlacementScopeMode('question')}
                        className={cn(
                          "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                          placementScopeMode === 'question'
                            ? "bg-blue-600 text-white shadow-xs font-semibold"
                            : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                        )}
                      >
                        Whole Question
                      </button>
                    </div>

                    {/* Individual scope: checklist of image options */}
                    {placementScopeMode === 'individual' && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Select one or more image options from other questions to place this image onto:
                        </p>
                        {availableImageFields.length === 0 ? (
                          <div className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              No image options found in other questions
                            </p>
                          </div>
                        ) : (
                          <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 custom-scrollbar">
                            {availableQuestions.map((q: any) => {
                              const qId = getQuestionUid(q);
                              const qFields = availableImageFields.filter((f) => f.questionUid === qId);
                              if (qFields.length === 0) return null;
                              return (
                                <div key={qId}>
                                  <p className="sticky top-0 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 rounded">
                                    {q.label || 'Question'}
                                  </p>
                                  {qFields.map((field) => {
                                    const checked = placementTargets.includes(field.uid);
                                    return (
                                      <button
                                        key={field.uid}
                                        type="button"
                                        onClick={() => handleTogglePlacementTarget(field.uid)}
                                        className={cn(
                                          "w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition",
                                          checked
                                            ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                                            : "hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40",
                                        )}
                                      >
                                        <span className={cn(
                                          "size-4 shrink-0 rounded border-2 flex items-center justify-center transition",
                                          checked
                                            ? "bg-blue-600 border-blue-600"
                                            : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                                        )}>
                                          {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                                        </span>
                                        <span className="size-7 shrink-0 overflow-hidden rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                          <img
                                            src={field.image}
                                            alt={field.label}
                                            className="size-full object-cover"
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                          />
                                        </span>
                                        <span className="min-w-0 flex-1 truncate font-medium">{field.label}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Whole question scope: pick a question */}
                    {placementScopeMode === 'question' && (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Select a question — this image will be placed onto all its image options automatically:
                        </p>
                        <select
                          value={formData.placement_target_question || formData.placement?.target_question || ""}
                          onChange={(e) => handleSelectPlacementQuestion(e.target.value)}
                          className="w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        >
                          <option value="">
                            {availableQuestions.length === 0
                              ? "-- No other questions found --"
                              : "-- Select a question --"}
                          </option>
                          {availableQuestions.map((q: any) => {
                            const qId = getQuestionUid(q);
                            const imgCount = getQuestionOptions(q).filter((o: any) => o.image || o.fill_image).length;
                            return (
                              <option key={qId} value={qId}>
                                {q.label || 'Question'} ({imgCount} image{imgCount !== 1 ? 's' : ''})
                              </option>
                            );
                          })}
                        </select>
                        {(formData.placement_target_question || formData.placement?.target_question) && (
                          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            ✓ {placementTargets.length} image option{placementTargets.length !== 1 ? 's' : ''} targeted for overlap placement
                          </p>
                        )}
                      </div>
                    )}

                    {/* No targets warning */}
                    {placementTargets.length === 0 && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        ⚠ No target canvas selected — select an image or question to place this onto
                      </p>
                    )}

                    <div className="flex items-start gap-3">
                      {/* Target Canvas Preview Box */}
                      <div className="flex-1 min-w-0">
                        <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 h-24 w-full flex items-center justify-center">
                          {selectedTargetField?.image ? (
                            <img
                              src={String(selectedTargetField.image)}
                              alt={selectedTargetField.label || "Target image"}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                (
                                  e.target as HTMLImageElement
                                ).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center text-center p-2">
                              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                                {selectedTargetField
                                  ? selectedTargetField.label
                                  : "Select target field"}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                (Target Canvas)
                              </span>
                            </div>
                          )}

                          <div className="absolute inset-[25%] flex items-center justify-center border-2 border-blue-100 bg-blue-600/90 text-[10px] font-bold text-white pointer-events-none">
                            Freeform
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 w-40 space-y-2">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Position and size are edited in the freeform overlap tool from the live renderer.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* 2. Fill Target Selection: ONLY for Color & Color Swatch options */}
            {isColorField && (
              <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/50">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Palette className="size-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Fill Target Images
                    </span>
                  </div>
                  {fillTargets.length > 0 && (
                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      {fillTargets.length} selected
                    </span>
                  )}
                </div>

                {/* Scope toggle: Individual images vs Whole question */}
                <div className="grid grid-cols-2 gap-1 rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setFillScopeMode('individual');
                      // Clear question-scope targets when switching
                      setFormData((prev) => ({ ...prev, fill_target_question: null }));
                    }}
                    className={cn(
                      "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                      fillScopeMode === 'individual'
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                    )}
                  >
                    Individual Images
                  </button>
                  <button
                    type="button"
                    onClick={() => setFillScopeMode('question')}
                    className={cn(
                      "flex items-center justify-center rounded-md py-1.5 text-xs font-medium transition",
                      fillScopeMode === 'question'
                        ? "bg-blue-600 text-white shadow-xs font-semibold"
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100",
                    )}
                  >
                    Whole Question
                  </button>
                </div>

                {/* Individual scope: checklist of image options */}
                {fillScopeMode === 'individual' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select one or more image options from other questions to fill with this color:
                    </p>
                    {availableImageFields.length === 0 ? (
                      <div className="rounded-md border border-dashed border-slate-300 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-800">
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          No image options found in other questions
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-800 custom-scrollbar">
                        {/* Group by question */}
                        {availableQuestions.map((q: any) => {
                          const qId = getQuestionUid(q);
                          const qFields = availableImageFields.filter((f) => f.questionUid === qId);
                          if (qFields.length === 0) return null;
                          return (
                            <div key={qId}>
                              <p className="sticky top-0 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 rounded">
                                {q.label || 'Question'}
                              </p>
                              {qFields.map((field) => {
                                const checked = fillTargets.includes(field.uid);
                                return (
                                  <button
                                    key={field.uid}
                                    type="button"
                                    onClick={() => handleToggleFillTarget(field.uid)}
                                    className={cn(
                                      "w-full flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-xs transition",
                                      checked
                                        ? "bg-blue-50 text-blue-900 dark:bg-blue-950/40 dark:text-blue-200"
                                        : "hover:bg-slate-50 text-slate-700 dark:text-slate-300 dark:hover:bg-slate-700/40",
                                    )}
                                  >
                                    {/* Checkbox indicator */}
                                    <span className={cn(
                                      "size-4 shrink-0 rounded border-2 flex items-center justify-center transition",
                                      checked
                                        ? "bg-blue-600 border-blue-600"
                                        : "border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800",
                                    )}>
                                      {checked && <Check size={10} strokeWidth={3} className="text-white" />}
                                    </span>
                                    {/* Thumbnail */}
                                    <span className="size-7 shrink-0 overflow-hidden rounded border border-slate-200 dark:border-slate-600 bg-slate-100 dark:bg-slate-700">
                                      <img
                                        src={field.image}
                                        alt={field.label}
                                        className="size-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                      />
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">{field.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Whole question scope: pick a question */}
                {fillScopeMode === 'question' && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Select a question — color fill will apply to all its image options automatically:
                    </p>
                    <select
                      value={formData.fill_target_question || ""}
                      onChange={(e) => handleSelectFillQuestion(e.target.value)}
                      className="w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">
                        {availableQuestions.length === 0
                          ? "-- No other questions found --"
                          : "-- Select a question --"}
                      </option>
                      {availableQuestions.map((q: any) => {
                        const qId = getQuestionUid(q);
                        const imgCount = getQuestionOptions(q).filter((o: any) => o.image || o.fill_image).length;
                        return (
                          <option key={qId} value={qId}>
                            {q.label || 'Question'} ({imgCount} image{imgCount !== 1 ? 's' : ''})
                          </option>
                        );
                      })}
                    </select>
                    {formData.fill_target_question && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ {fillTargets.length} image option{fillTargets.length !== 1 ? 's' : ''} will be filled with this color
                      </p>
                    )}
                  </div>
                )}

                {/* No targets warning */}
                {fillTargets.length === 0 && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400">
                    ⚠ No fill targets selected — color fill won't appear in the live view
                  </p>
                )}
              </div>
            )}


            {/* 3. Standard Config Fields (Filtered per field type) */}
            {def.configFields.map((field) => {
              // Skip fill_image if rendered above, and skip value / api_name from modal
              if (field.key === "fill_image" && isColorField) return null;
              if (field.key === "value") return null;
              if (field.key === "api_name") return null;
              if (fieldType === "items_lookup" && field.key === "item_group_id") return null;
              if (
                isLookupImageQuestion &&
                (field.key === "image" || field.key === "label" || field.key === "subLabel" || field.key === "price")
              ) {
                return null;
              }

              const val = (formData[field.key] as any) ?? "";

              if (field.type === "color") {
                const parsedColor = parseColorAlpha(String(val) || "#2563EB");
                const hexVal = parsedColor.hex;
                const alphaVal = parsedColor.alpha;

                const handleColorHexChange = (newHex: string) => {
                  handleChange(field.key, formatColorAlpha(newHex, alphaVal));
                };
                const handleAlphaChange = (newAlpha: number) => {
                  handleChange(field.key, formatColorAlpha(hexVal, newAlpha));
                };

                // Build a gradient for the alpha slider track: hex → transparent
                const r = parseInt(hexVal.substring(1, 3), 16) || 0;
                const g = parseInt(hexVal.substring(3, 5), 16) || 0;
                const b = parseInt(hexVal.substring(5, 7), 16) || 0;
                const alphaTrackGradient = `linear-gradient(to right, rgba(${r},${g},${b},0), rgba(${r},${g},${b},1))`;

                return (
                  <div key={String(field.key)} className="space-y-2.5">
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-red-500">*</span>
                      )}
                    </label>

                    {/* Color Picker Row */}
                    <div className="flex items-center gap-2.5">
                      {/* Checkerboard + color swatch preview */}
                      <div
                        className="size-9 flex-shrink-0 rounded-sm border border-slate-200 shadow-xs dark:border-slate-700 overflow-hidden relative"
                        style={checkerboardPattern}
                      >
                        <div
                          className="absolute inset-0 rounded-sm"
                          style={{ backgroundColor: String(val) || "#2563EB" }}
                        />
                      </div>
                      <input
                        type="color"
                        value={hexVal}
                        onChange={(e) => handleColorHexChange(e.target.value)}
                        className="h-9 flex-1 cursor-pointer rounded-sm border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
                      />
                      {/* Opacity % label */}
                      <span className="shrink-0 min-w-[3rem] text-right text-xs font-mono font-semibold text-slate-700 dark:text-slate-300">
                        {alphaVal}%
                      </span>
                    </div>

                    {/* Transparency / Opacity slider */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Opacity / Transparency
                        </span>
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                          {alphaVal === 100
                            ? "Solid"
                            : alphaVal === 0
                            ? "Transparent"
                            : `${alphaVal}% opaque`}
                        </span>
                      </div>
                      {/* Alpha slider with checkerboard bg behind the gradient */}
                      <div
                        className="relative h-4 rounded-full overflow-hidden border border-slate-200 dark:border-slate-700"
                        style={checkerboardPattern}
                      >
                        <div
                          className="absolute inset-0 rounded-full"
                          style={{ background: alphaTrackGradient }}
                        />
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={1}
                          value={alphaVal}
                          onChange={(e) =>
                            handleAlphaChange(Number(e.target.value))
                          }
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          aria-label="Color opacity"
                        />
                        {/* Thumb indicator */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full border-2 border-white shadow-md pointer-events-none transition-all"
                          style={{
                            left: `calc(${alphaVal}% - ${alphaVal === 0 ? "0px" : alphaVal === 100 ? "16px" : "8px"})`,
                            backgroundColor: `rgba(${r},${g},${b},${alphaVal / 100})`,
                          }}
                        />
                      </div>
                      {/* Quick transparency presets */}
                      <div className="flex gap-1 mt-1">
                        {[100, 75, 50, 25, 0].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => handleAlphaChange(preset)}
                            className={cn(
                              "flex-1 rounded text-[10px] font-semibold py-0.5 border transition",
                              alphaVal === preset
                                ? "bg-blue-600 text-white border-blue-600"
                                : "bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
                            )}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {field.description && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {field.description}
                      </p>
                    )}
                  </div>
                );
              }

              if (field.type === "textarea") {
                return (
                  <div key={String(field.key)}>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                    </label>
                    <textarea
                      value={String(val)}
                      placeholder={field.placeholder}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      rows={2}
                      className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                );
              }

              if (field.type === "image") {
                return (
                  <div key={String(field.key)}>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                    </label>

                    {/* File picker with Strict Image File Type Guard */}
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-sm border border-dashed border-slate-300 bg-slate-50 px-3 py-2.5 text-xs text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/30 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800/50 dark:hover:border-blue-600 dark:hover:text-blue-400">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="size-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <span>
                        {val
                          ? "Change image"
                          : "Upload image (SVG, PNG, JPG, WebP)"}
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,.png,.jpg,.jpeg,.webp,.svg,.gif"
                        className="sr-only"
                        onChange={(e) =>
                          handleFileChange(e.target.files?.[0], field.key)
                        }
                      />
                    </label>

                    {/* File validation error banner */}
                    {imageError && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                        <AlertCircle size={13} />
                        <span>{imageError}</span>
                      </div>
                    )}

                    {/* Image Preview & Remove */}
                    {val && (
                      <div className="mt-2 overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700 relative">
                        <img
                          src={String(val)}
                          alt="Image preview"
                          className="h-24 w-full object-cover"
                          onError={(e) => {
                            (
                              e.target as HTMLImageElement
                            ).style.display = "none";
                          }}
                        />
                      </div>
                    )}

                    {val && (
                      <button
                        type="button"
                        onClick={() => handleChange(field.key, "")}
                        className="mt-1.5 text-[11px] text-red-500 hover:underline"
                      >
                        Remove image
                      </button>
                    )}

                    {field.description && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {field.description}
                      </p>
                    )}
                  </div>
                );
              }

              if (field.type === "select") {
                return (
                  <div key={String(field.key)}>
                    <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                      {field.label}
                      {field.required && (
                        <span className="ml-0.5 text-red-500">*</span>
                      )}
                    </label>
                    <select
                      value={String(val || (field.options?.[0]?.value ?? ""))}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      {(field.options || []).map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {field.description && (
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                        {field.description}
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <div key={String(field.key)}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {field.label}
                    {field.required && (
                      <span className="ml-0.5 text-red-500">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={String(val)}
                    placeholder={field.placeholder}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                  {field.description && (
                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                      {field.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Live-Updating Preview Panel */}
          <div className="w-full md:w-5/12 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-5 flex flex-col justify-between overflow-y-auto custom-scrollbar">
            <div className="space-y-4">
              {/* Live Preview Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
                  <Eye className="size-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Live Preview</span>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300">
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Realtime
                </span>
              </div>

              {/* 1. Realtime Option Card Preview */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Option Card in Kiosk
                </span>
                {fieldType === "input" ? (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-700 dark:bg-slate-900 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {formData.label || "Input Label"}
                        {formData.required && <span className="ml-1 text-red-500">*</span>}
                      </label>
                      {formData.price && parseFloat(String(formData.price)) > 0 && (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          +${parseFloat(String(formData.price)).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {formData.subLabel && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {formData.subLabel}
                      </p>
                    )}
                    {formData.input_type === "textarea" ? (
                      <textarea
                        disabled
                        rows={2}
                        placeholder={formData.placeholder || "Enter value here..."}
                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 select-none cursor-not-allowed"
                      />
                    ) : (
                      <input
                        type="text"
                        disabled
                        placeholder={formData.placeholder || "Enter value here..."}
                        className="h-9 w-full rounded-sm border border-slate-200 bg-slate-50 px-3 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800/60 select-none cursor-not-allowed"
                      />
                    )}
                    <div className="flex items-center gap-2 pt-0.5">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                        format: {formData.input_type || "text"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-xs dark:border-slate-700 dark:bg-slate-900 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        {/* Indicator: Color Swatch vs Radio Dot */}
                        {isColorField ? (
                          <div
                            className="size-5 rounded-full border-2 border-white shadow-xs ring-1 ring-slate-300 dark:border-slate-800 dark:ring-slate-600 shrink-0 overflow-hidden relative"
                            style={checkerboardPattern}
                          >
                            <div
                              className="absolute inset-0 rounded-full"
                              style={{
                                backgroundColor:
                                  String(formData.color || formData.value || "#2563EB"),
                              }}
                            />
                          </div>
                        ) : (
                          <div className="size-4.5 rounded-full border-2 border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500 flex items-center justify-center shrink-0">
                            <div className="size-1.5 rounded-full bg-white" />
                          </div>
                        )}

                        {/* Image Thumbnail for Image Radio */}
                        {isImageRadioField && formData.image && (
                          <div className="size-12 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0 shadow-2xs">
                            <img
                              src={String(formData.image)}
                              alt="Object image"
                              className="size-full object-cover"
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                            {formData.label ||
                              (isColorField
                                ? "Color Choice"
                                : isImageRadioField
                                ? "Image Choice"
                                : "Choice")}
                          </p>
                          {formData.subLabel && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                              {formData.subLabel}
                            </p>
                          )}
                        </div>
                      </div>

                      {formData.price && (
                        <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 font-mono text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                          ${formData.price}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 2A. LIVE COLOR-FILLED IMAGE PREVIEW: For Color and Color Swatch Options */}
              {isColorField && (
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Live Color-Filled Image Preview
                  </span>
                  <div className="relative h-44 w-full rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 overflow-hidden flex items-center justify-center shadow-inner">
                    {colorFilledPreview ? (
                      <div className="size-full p-2 flex items-center justify-center">
                        <img
                          src={colorFilledPreview}
                          alt="Live Color-Filled Preview"
                          className="max-h-full max-w-full object-contain drop-shadow-md"
                        />
                      </div>
                    ) : (
                      <div className="text-center p-3">
                        <Palette className="mx-auto size-6 text-slate-300 dark:text-slate-600 mb-1" />
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {activeFillImageSrc
                            ? "Processing color fill..."
                            : "No fill image selected"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Select an image from kiosk or upload an SVG/PNG to preview color fill
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 2B. CANVAS PLACEMENT OVERLAY PREVIEW: For Image Radio Options with Place Mode */}
              {isImageRadioField && placementMode === "place" && (
                <div>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                    Canvas Placement Overlay (Freeform)
                  </span>
                  <div className="relative h-44 w-full rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 overflow-hidden flex items-center justify-center shadow-inner">
                    {/* Base Target Image */}
                    {selectedTargetField?.image ? (
                      <img
                        src={selectedTargetField.image}
                        alt="Target Canvas"
                        className="size-full object-cover opacity-80"
                      />
                    ) : (
                      <div className="text-center p-3">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          {selectedTargetField?.label || "Base Canvas"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                          Target image will show here
                        </p>
                      </div>
                    )}

                    {/* Placed Overlay Object (NO Color Tint) */}
                    {formData.image ? (
                      <div className="absolute inset-[25%] overflow-hidden rounded-md border-2 border-white shadow-lg">
                        <img
                          src={String(formData.image)}
                          alt="Placed object"
                          className="size-full object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className={cn(
                          "absolute inset-[25%] flex items-center justify-center overflow-hidden rounded-md border-2 border-dashed border-blue-500/80 bg-blue-500/20 backdrop-blur-xs text-[10px] font-bold text-blue-700 dark:text-blue-300",
                        )}
                      >
                        Place image
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Detail Information Pill */}
              {isColorField ? (
                  <div className="rounded-lg border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <Palette size={13} className="text-blue-600" />
                      Active Swatch Color:
                    </span>
                    <div className="flex items-center gap-1.5 font-mono font-bold text-slate-800 dark:text-slate-200">
                      <span
                        className="size-3.5 rounded-full border border-black/10 overflow-hidden relative shrink-0"
                        style={checkerboardPattern}
                      >
                        <span
                          className="absolute inset-0 rounded-full"
                          style={{
                            backgroundColor: String(formData.color || "#2563EB"),
                          }}
                        />
                      </span>
                      <span className="text-[10px] truncate max-w-[100px]">
                        {formData.color || "#2563EB"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-slate-500 dark:text-slate-400">
                      Fill Targets:
                    </span>
                    <span className={cn(
                      "font-semibold",
                      fillTargets.length > 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400",
                    )}>
                      {fillTargets.length > 0
                        ? `${fillTargets.length} image${fillTargets.length !== 1 ? 's' : ''} selected`
                        : "None — fill won't display"}
                    </span>
                  </div>
                </div>
              ) : isImageRadioField ? (
                <div className="rounded-lg border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400">
                      Placement Mode:
                    </span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                      {placementMode}
                    </span>
                  </div>

                  {placementMode === "place" && selectedTargetField && (
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 dark:text-slate-400">
                        Target Canvas:
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">
                        {selectedTargetField.label}
                      </span>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            {/* Footer Summary note */}
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-4 text-center">
              Changes reflect live above. Click Save Option to commit to schema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3.5 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900">
          <AppButton variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton size="sm" onClick={handleSave}>
            <Save className="mr-1.5 size-3.5" />
            Save Option
          </AppButton>
        </div>
      </div>
    </div>
  );
};
