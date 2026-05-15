import React, { useState } from "react";
import { FIELD_TYPES } from "./fieldTypes";
import { AppButton as Button } from "@/shared/ui/app-button";

interface FieldConfigModalProps {
  fieldType: string;
  initialConfig: any;
  onSave: (config: any) => void;
  onClose: () => void;
}

function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="inline-block ml-1.5 mb-0.5 text-amber-500 shrink-0"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2zm-1 4h2v6h-2v-6z" />
    </svg>
  );
}

export default function FieldConfigModal({
  fieldType,
  initialConfig,
  onSave,
  onClose,
}: FieldConfigModalProps) {
  const typeConfig = FIELD_TYPES[fieldType] || FIELD_TYPES.text;
  
  const [config, setConfig] = useState<any>(() => {
    const base = initialConfig || (typeConfig ? typeConfig.defaultConfig() : FIELD_TYPES.text.defaultConfig());
    return {
      ...base,
      name: (base.name || base.label || "").trim().replace(/\s+/g, "_").toLowerCase(),
    };
  });

  const [optionsText, setOptionsText] = useState(
    (config.options || []).join("\n")
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleChange = (key: string, value: any) => {
    setConfig((prev: any) => {
      const newConfig = { ...prev, [key]: value };
      if (key === "label") {
        newConfig.name = value.trim().replace(/\s+/g, "_").toLowerCase();
      }
      return newConfig;
    });
  };

  const handleOptionsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOptionsText(e.target.value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      const lines = e.target.value
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");
      handleChange("options", lines);
    }, 800);
    setDebounceTimer(timer);
  };

  const handleOptionsBlur = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    const lines = optionsText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line !== "");
    handleChange("options", lines);
  };

  const handleSave = () => {
    const lines = optionsText
      .split("\n")
      .map((line: string) => line.trim())
      .filter((line: string) => line !== "");
    const finalConfig = { ...config, options: lines };

    const newErrors: Record<string, string> = {};
    (typeConfig.configFields || []).forEach((f: any) => {
      const val = finalConfig[f.key];
      if (f.required) {
        if (f.type === "checkbox") {
          if (!val) newErrors[f.key] = "Required";
        } else if (f.type === "options") {
          if (!finalConfig.options || finalConfig.options.length === 0)
            newErrors[f.key] = "At least one option required";
        } else {
          if (val === undefined || val === null || String(val).trim() === "")
            newErrors[f.key] = "Required";
        }
      }
      if (
        f.maxLength &&
        f.type === "text" &&
        val !== undefined && val !== null &&
        String(val).length > f.maxLength
      ) {
        newErrors[f.key] = `Maximum ${f.maxLength} characters allowed`;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSave(finalConfig);
  };

  const renderField = (field: any) => {
    switch (field.type) {
      case "text":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              <span className="text-red-500">{field.required ? "*" : ""}</span>
            </label>
            <input
              type="text"
              value={config[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              aria-required={field.required}
              maxLength={field.maxLength || undefined}
              className={`w-full px-4 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {field.maxLength && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                {String(config[field.key] || "").length} / {field.maxLength}
              </p>
            )}
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <textarea
              value={config[field.key] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <input
              type="number"
              value={config[field.key] || ""}
              onChange={(e) =>
                handleChange(field.key, parseInt(e.target.value) || 0)
              }
              className={`w-full px-4 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.key}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config[field.key] || false}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">{field.label}</span>
              {field.showInfoIcon && <InfoIcon />}
            </label>
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case "checkbox-with-panel":
        return (
          <div key={field.key}>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id={`chk-${field.key}`}
                checked={config[field.key] || false}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">{field.label}</span>
              {field.showInfoIcon && <InfoIcon />}
            </label>
            {config[field.key] && field.panelFields?.length > 0 && (
              <div className="mt-3 ml-1 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                {field.panelFields.map((pf: any) => renderField(pf))}
              </div>
            )}
          </div>
        );

      case "radio-group":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <div className="flex items-center gap-6">
              {field.options.map((opt: any) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2 cursor-pointer text-sm text-gray-700"
                >
                  <input
                    type="radio"
                    name={field.key}
                    value={opt.value}
                    checked={config[field.key] === opt.value}
                    onChange={() => handleChange(field.key, opt.value)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        );

      case "drop-down":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
            </label>
            <select
              value={config[field.key] ?? ""}
              onChange={(e) => {
                const val = isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value);
                handleChange(field.key, val);
              }}
              className="border border-gray-300 rounded-lg p-2 w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {field.options?.map((option: any, index: number) => (
                <option value={option.value} key={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "options":
        return (
          <div key={field.key} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {field.label}
              <span className="text-red-500">{field.required ? "*" : ""}</span>
            </label>
            <textarea
              value={optionsText}
              onChange={handleOptionsTextChange}
              onBlur={handleOptionsBlur}
              placeholder="One option per line"
              rows={6}
              className={`w-full px-4 py-2 border border-gray-300 rounded-[8px] focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
            {config.options && config.options.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-md border border-blue-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700">
                    Options Preview
                  </p>
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                    {config.options.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.options.map((opt: string, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 bg-white border border-blue-300 rounded-md text-sm text-gray-700 font-medium shadow-sm hover:shadow transition-shadow"
                    >
                      {opt}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case "tooltip-panel":
        return (
          <div key="tooltip-panel">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chk-show_tooltip"
                checked={config.show_tooltip || false}
                onChange={(e) => handleChange("show_tooltip", e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Show Tooltip</span>
            </label>

            {config.show_tooltip && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-end">
                  <span className="text-xs text-gray-400">
                    Max of 255 characters
                  </span>
                </div>
                <textarea
                  value={config.tool_tip || ""}
                  onChange={(e) => handleChange("tool_tip", e.target.value)}
                  maxLength={255}
                  placeholder="Type tooltip message"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-gray-400"
                />
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold">Configure {typeConfig?.label || "Field Properties"}</h2>
        </div>

        <div className="p-6 space-y-6">
          {(typeConfig?.configFields || []).map((field: any) => renderField(field))}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-4">
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {initialConfig ? "Update Field" : "Add Field"}
          </Button>
        </div>
      </div>
    </div>
  );
}
