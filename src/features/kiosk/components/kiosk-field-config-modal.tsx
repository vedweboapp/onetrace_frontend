"use client";

import React, { useState } from "react";
import { AppButton as Button } from "@/shared/ui/app-button";
import { fieldRequiredMarkClassName } from "@/shared/ui/field-primitives";
import {
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Palette,
  Layers,
  Code,
  Tag,
  Hash,
  Eye,
  CreditCard,
} from "lucide-react";
import type { KioskField } from "../types/kiosk.types";

interface KioskFieldConfigModalProps {
  field: KioskField;
  onSave: (updatedField: KioskField) => void;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#2563EB", // Blue
  "#0D9488", // Teal
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#0F172A", // Slate
];

const PRESET_IMAGES = [
  { label: "Check-in", url: "https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=400&auto=format&fit=crop&q=60" },
  { label: "Visitor", url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=60" },
  { label: "Contractor", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400&auto=format&fit=crop&q=60" },
  { label: "Delivery", url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=400&auto=format&fit=crop&q=60" },
];

export const KioskFieldConfigModal: React.FC<KioskFieldConfigModalProps> = ({
  field,
  onSave,
  onClose,
}) => {
  const [fieldLabel, setFieldLabel] = useState(field.field_label || field.label || "Selection Card");
  const [apiName, setApiName] = useState(
    field.api_name || fieldLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")
  );
  const [fieldType, setFieldType] = useState(field.field_type || "selection_card");
  const [inputType, setInputType] = useState(field.input_type || "selection_card");
  const [value, setValue] = useState(field.value || "");
  const [color, setColor] = useState(field.color || "#2563EB");
  const [image, setImage] = useState(field.image || "");
  const [required, setRequired] = useState(Boolean(field.required));
  const [description, setDescription] = useState(field.description || "");
  const [previewSelected, setPreviewSelected] = useState(false);

  const handleLabelChange = (newLabel: string) => {
    setFieldLabel(newLabel);
    // Auto sync api_name if user hasn't heavily customized it
    const slug = newLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    if (!apiName || apiName === fieldLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "")) {
      setApiName(slug);
    }
    if (!value || value === fieldLabel) {
      setValue(newLabel);
    }
  };

  const handleSave = () => {
    onSave({
      ...field,
      field_label: fieldLabel.trim() || "Selection Card",
      label: fieldLabel.trim() || "Selection Card",
      api_name: apiName.trim() || "selection_card",
      field_type: fieldType,
      input_type: inputType,
      value: value.trim() || fieldLabel.trim(),
      color,
      image,
      required,
      description: description.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex h-full max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div
              className="flex size-9 items-center justify-center rounded-lg shadow-sm"
              style={{ backgroundColor: color, color: "#fff" }}
            >
              <CreditCard className="size-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Configure Selection Card Field
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Customize keys, visual attributes, and preview live state
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Modal Body: Left Inputs + Right Live Preview */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-12 custom-scrollbar">
          {/* Left Form Controls (7 cols) */}
          <div className="p-6 space-y-5 lg:col-span-7 border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-slate-800">
            {/* Label */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Tag className="size-3.5 text-slate-400" />
                Label <span className={fieldRequiredMarkClassName}>*</span>
              </label>
              <input
                type="text"
                value={fieldLabel}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g. Visitor Check-In"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* API Name & Field Type */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Code className="size-3.5 text-slate-400" />
                  API Name <span className={fieldRequiredMarkClassName}>*</span>
                </label>
                <input
                  type="text"
                  value={apiName}
                  onChange={(e) => setApiName(e.target.value)}
                  placeholder="e.g. visitor_check_in"
                  className="w-full font-mono text-xs rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Layers className="size-3.5 text-slate-400" />
                  Input Type
                </label>
                <select
                  value={inputType}
                  onChange={(e) => setInputType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                >
                  <option value="selection_card">Selection Card</option>
                  <option value="radio">Radio Selection</option>
                  <option value="checkbox">Multi-Select Card</option>
                  <option value="button">Action Button</option>
                </select>
              </div>
            </div>

            {/* Value & Field Type Hidden / Explicit */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Hash className="size-3.5 text-slate-400" />
                  Value / ID
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. visitor"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <Palette className="size-3.5 text-slate-400" />
                  Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="size-9 cursor-pointer rounded-lg border border-slate-300 p-0.5 dark:border-slate-700 bg-transparent"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`size-6 rounded-md transition-transform ${
                          color === c ? "scale-110 ring-2 ring-blue-500 ring-offset-1" : "hover:scale-105"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Image URL / Selection */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  <ImageIcon className="size-3.5 text-slate-400" />
                  Image / Thumbnail URL
                </label>
                {image && (
                  <button
                    type="button"
                    onClick={() => setImage("")}
                    className="text-[11px] text-red-500 hover:underline"
                  >
                    Clear Image
                  </button>
                )}
              </div>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/photo.jpg or choose preset below"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="text-[11px] text-slate-400 self-center">Presets:</span>
                {PRESET_IMAGES.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`rounded-md border px-2 py-0.5 text-xs transition-colors ${
                      image === preset.url
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Description / Subtext */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Description / Helper Text
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional subtitle for card"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>

            {/* Required Flag */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="kiosk-field-required"
                checked={required}
                onChange={(e) => setRequired(e.target.checked)}
                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
              <label htmlFor="kiosk-field-required" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Mark as Mandatory / Required
              </label>
            </div>
          </div>

          {/* Right Live Preview Box (5 cols) */}
          <div className="flex flex-col bg-slate-50 p-6 dark:bg-slate-900/50 lg:col-span-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <Eye className="size-4 text-blue-500" />
                Live Card Preview
              </div>
              <span className="text-[11px] text-slate-400">Click card to toggle selection</span>
            </div>

            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white/70 p-6 dark:border-slate-700 dark:bg-slate-800/40">
              {/* Construct of the Selection Card */}
              <div
                onClick={() => setPreviewSelected(!previewSelected)}
                className={`group relative flex w-full max-w-[280px] cursor-pointer flex-col overflow-hidden rounded-2xl border-2 transition-all duration-200 shadow-sm hover:shadow-md ${
                  previewSelected
                    ? "scale-[1.02] shadow-lg ring-2 ring-offset-2"
                    : "hover:border-slate-300 dark:hover:border-slate-600"
                }`}
                style={{
                  borderColor: previewSelected ? color : undefined,
                  boxShadow: previewSelected ? `0 10px 25px -5px ${color}33` : undefined,
                }}
              >
                {/* Image / Header Banner */}
                {image ? (
                  <div className="relative h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                    <img
                      src={image}
                      alt={fieldLabel}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                  </div>
                ) : (
                  <div
                    className="flex h-24 w-full items-center justify-center transition-colors"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <div
                      className="flex size-12 items-center justify-center rounded-xl shadow-sm"
                      style={{ backgroundColor: color, color: "#ffffff" }}
                    >
                      <Sparkles className="size-6" />
                    </div>
                  </div>
                )}

                {/* Card Content */}
                <div className="flex flex-col p-4 bg-white dark:bg-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                      {fieldLabel || "Untitled Option"}
                    </h4>
                    <div
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        previewSelected
                          ? "border-transparent text-white"
                          : "border-slate-300 text-transparent dark:border-slate-600"
                      }`}
                      style={{
                        backgroundColor: previewSelected ? color : "transparent",
                      }}
                    >
                      <CheckCircle2 className="size-4" />
                    </div>
                  </div>

                  {description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                      {description}
                    </p>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 dark:border-slate-700/50">
                    <span className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                      {apiName || "key_name"}
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: `${color}18`, color }}
                    >
                      {value || "val"}
                    </span>
                  </div>
                </div>

                {/* Required Indicator Strip */}
                {required && (
                  <div className="absolute top-2 left-2 rounded bg-red-500/90 px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    Required
                  </div>
                )}
              </div>
            </div>

            {/* Preview Summary Note */}
            <div className="mt-4 rounded-lg bg-blue-50/70 p-3 text-xs text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
              <span className="font-semibold">Live Attribute Snapshot:</span>
              <div className="mt-1 grid grid-cols-2 gap-1 text-[11px] font-mono">
                <div>type: {fieldType}</div>
                <div>input: {inputType}</div>
                <div>color: {color}</div>
                <div>val: {value || "none"}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-3.5 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="px-6">
            Save Field Configuration
          </Button>
        </div>
      </div>
    </div>
  );
};
