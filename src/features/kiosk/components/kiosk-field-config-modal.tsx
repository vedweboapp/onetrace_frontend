"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Save,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AppButton } from "@/shared/ui/app-button";
import { KIOSK_FIELD_TYPES } from "../types/kiosk-field-types";
import type {
  KioskOption,
  PlacementMode,
  PositionValue,
} from "../types/kiosk.types";
import { cn } from "@/core/utils/http.util";

interface KioskFieldConfigModalProps {
  option: KioskOption;
  questions?: any[];
  onSave: (updated: KioskOption) => void;
  onClose: () => void;
}

export const KioskFieldConfigModal: React.FC<KioskFieldConfigModalProps> = ({
  option,
  questions = [],
  onSave,
  onClose,
}) => {
  const fieldType = (option.field_type as string) || "radio";
  const def = KIOSK_FIELD_TYPES[fieldType] ?? KIOSK_FIELD_TYPES.radio;

  const [formData, setFormData] = useState<KioskOption>(() => ({
    ...def.defaultConfig(),
    ...option,
  }));

  useEffect(() => {
    setFormData({ ...def.defaultConfig(), ...option });
  }, [option]);

  // Extract all existing image fields / image options in the kiosk
  const availableImageFields = React.useMemo(() => {
    const list: {
      uid: string;
      label: string;
      questionLabel: string;
      image: string;
    }[] = [];

    (questions || []).forEach((q: any, qIdx: number) => {
      (q.options || []).forEach((opt: any, optIdx: number) => {
        if (opt._uid === option._uid) return; // skip self
        list.push({
          uid: opt._uid,
          label: opt.label || `Option ${optIdx + 1}`,
          questionLabel: q.label || `Question ${qIdx + 1}`,
          image: String(opt.image || ""),
        });
      });
    });

    return list;
  }, [questions, option._uid]);

  const placementMode: PlacementMode =
    formData.placement_mode || formData.placement?.mode || "group";

  const position: PositionValue | undefined =
    formData.placement_position ||
    formData.placement?.position ||
    (placementMode === "place" ? "center" : undefined);

  const selectedTargetField = availableImageFields.find(
    (f) =>
      f.uid ===
      (formData.target_image_field || formData.placement?.target_field)
  );

  const handlePlacementModeChange = (mode: PlacementMode) => {
    setFormData((prev) => {
      if (mode === "group") {
        return {
          ...prev,
          placement_mode: "group",
          placement_position: undefined,
          target_image_field: undefined,
          placement: {
            mode: "group",
          },
        };
      } else {
        const nextPos: PositionValue = position || "center";
        const nextTargetField =
          prev.target_image_field ||
          (availableImageFields.length > 0
            ? availableImageFields[0].uid
            : undefined);

        return {
          ...prev,
          placement_mode: "place",
          placement_position: nextPos,
          target_image_field: nextTargetField,
          placement: {
            mode: "place",
            position: nextPos,
            target_field: nextTargetField,
          },
        };
      }
    });
  };

  const handlePositionChange = (pos: PositionValue) => {
    setFormData((prev) => ({
      ...prev,
      placement_mode: "place",
      placement_position: pos,
      placement: {
        mode: "place",
        position: pos,
        target_field: prev.target_image_field,
      },
    }));
  };

  const handleSelectImageField = (targetUid: string) => {
    if (targetUid === "__upload__") {
      setFormData((prev) => ({
        ...prev,
        target_image_field: "__upload__",
      }));
      return;
    }

    const found = availableImageFields.find((f) => f.uid === targetUid);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        target_image_field: found.uid,
        image: found.image || prev.image,
        placement: {
          mode: "place",
          position: position || "center",
          target_field: found.uid,
        },
      }));
    }
  };

  const handleChange = (key: keyof KioskOption, val: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: val };
      // Keep value in sync with color for color-type options
      if (
        key === "color" &&
        (fieldType === "color" || fieldType === "color_swatch")
      ) {
        updated.value = val;
      }
      return updated;
    });
  };

  const handleSave = () => {
    onSave({ ...formData });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-sm border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] flex flex-col">
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

        {/* Fields */}
        <div className="space-y-4 p-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Placement Section for Image Radio Option */}
          {fieldType === "image_radio" && (
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
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
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
                        : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                    )}
                  >
                    Group
                  </button>
                </div>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {placementMode === "place"
                    ? "Place mode: Select which image field in the kiosk to place onto and set its position"
                    : "Group mode: Standard grouped option without placement positioning"}
                </p>
              </div>

              {/* When placementMode === 'place': Show Target Field Dropdown + Target Preview + Joystick */}
              {placementMode === "place" && (
                <div className="rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700/80 dark:bg-slate-800/80 space-y-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Image field to choose
                    </label>

                    {/* Dropdown to select existing image field from the kiosk */}
                    <select
                      value={formData.target_image_field || formData.placement?.target_field || ""}
                      onChange={(e) => handleSelectImageField(e.target.value)}
                      className="w-full rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    >
                      <option value="">
                        {availableImageFields.length === 0
                          ? "-- No other image fields in kiosk --"
                          : "-- Select target image field --"}
                      </option>
                      {availableImageFields.map((field) => (
                        <option key={field.uid} value={field.uid}>
                          {field.questionLabel} → {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-start gap-3">
                    {/* Left: Target Image Preview Box */}
                    <div className="flex-1 min-w-0">
                      <div className="relative overflow-hidden rounded-md border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-900 h-24 w-full flex items-center justify-center">
                        {selectedTargetField?.image ? (
                          <img
                            src={String(selectedTargetField.image)}
                            alt={selectedTargetField.label || "Target image"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center p-2">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              {selectedTargetField
                                ? selectedTargetField.label
                                : "Select an image field above"}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                              (Target Canvas)
                            </span>
                          </div>
                        )}

                        {/* Visual Position Target Overlay Indicator */}
                        <div
                          className={cn(
                            "absolute size-7 rounded-sm border-2 border-white bg-blue-600/90 shadow-md backdrop-blur-xs flex items-center justify-center text-[10px] font-bold text-white transition-all duration-150 pointer-events-none",
                            position === "top" && "top-1.5 inset-x-auto",
                            position === "bottom" && "bottom-1.5 inset-x-auto",
                            position === "left" && "left-1.5 inset-y-auto",
                            position === "right" && "right-1.5 inset-y-auto",
                            (!position || position === "center") && "inset-0 m-auto"
                          )}
                        >
                          {position === "center" ? "0" : position ? position[0].toUpperCase() : "0"}
                        </div>
                      </div>
                      {selectedTargetField && (
                        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                          Target: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTargetField.label}</span>
                        </p>
                      )}
                    </div>

                    {/* Right: Joystick Position Controller */}
                    <div className="shrink-0 flex flex-col items-center">
                      <span className="mb-1 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        Position:{" "}
                        <span className="font-mono text-blue-600 dark:text-blue-400 font-bold capitalize">
                          {position || "center"}
                        </span>
                      </span>

                      {/* 3x3 Joystick Grid */}
                      <div className="relative grid grid-cols-3 grid-rows-3 gap-1 size-24 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-inner">
                        {/* Top */}
                        <div className="col-start-2 row-start-1 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handlePositionChange("top")}
                            className={cn(
                              "size-6 rounded flex items-center justify-center transition shadow-2xs",
                              position === "top"
                                ? "bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            )}
                            title="Top (▲)"
                          >
                            <ChevronUp size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Left */}
                        <div className="col-start-1 row-start-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handlePositionChange("left")}
                            className={cn(
                              "size-6 rounded flex items-center justify-center transition shadow-2xs",
                              position === "left"
                                ? "bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            )}
                            title="Left (◀)"
                          >
                            <ChevronLeft size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Center */}
                        <div className="col-start-2 row-start-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handlePositionChange("center")}
                            className={cn(
                              "size-6 rounded flex items-center justify-center text-[10px] font-bold transition shadow-2xs font-mono",
                              position === "center"
                                ? "bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            )}
                            title="Center (0)"
                          >
                            0
                          </button>
                        </div>

                        {/* Right */}
                        <div className="col-start-3 row-start-2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handlePositionChange("right")}
                            className={cn(
                              "size-6 rounded flex items-center justify-center transition shadow-2xs",
                              position === "right"
                                ? "bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            )}
                            title="Right (▶)"
                          >
                            <ChevronRight size={14} strokeWidth={2.5} />
                          </button>
                        </div>

                        {/* Bottom */}
                        <div className="col-start-2 row-start-3 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => handlePositionChange("bottom")}
                            className={cn(
                              "size-6 rounded flex items-center justify-center transition shadow-2xs",
                              position === "bottom"
                                ? "bg-blue-600 text-white shadow-xs scale-105 ring-2 ring-blue-400"
                                : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 dark:hover:bg-slate-700"
                            )}
                            title="Bottom (▼)"
                          >
                            <ChevronDown size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standard Config Fields */}
          {def.configFields.map((field) => {
            const val = (formData[field.key] as any) ?? "";

            if (field.type === "color") {
              return (
                <div key={String(field.key)}>
                  <label className="mb-1.5 block text-xs font-medium text-slate-700 dark:text-slate-300">
                    {field.label}
                    {field.required && (
                      <span className="ml-0.5 text-red-500">*</span>
                    )}
                  </label>
                  <div className="flex items-center gap-3">
                    <div
                      className="size-9 flex-shrink-0 rounded-sm border border-slate-200 shadow-xs dark:border-slate-700"
                      style={{ backgroundColor: String(val) || "#0EA5E9" }}
                    />
                    <input
                      type="color"
                      value={String(val) || "#0EA5E9"}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      className="h-9 w-full cursor-pointer rounded-sm border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800"
                    />
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

                  {/* File picker */}
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
                    <span>{val ? "Change image" : "Upload image"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          handleChange(field.key, reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>

                  {/* Preview */}
                  {val && (
                    <div className="mt-2 overflow-hidden rounded-sm border border-slate-200 dark:border-slate-700">
                      <img
                        src={String(val)}
                        alt="Object image preview"
                        className="h-24 w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Clear button */}
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800 shrink-0">
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
