import React, { useRef, useState } from "react";
import { FIELD_TYPES } from "./fieldTypes";
import { AppButton as Button } from "@/shared/ui/app-button";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";

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

const OPTION_DND_TYPE = "FIELD_CONFIG_OPTION";

// Pure helpers — defined at module level so useState initializers can safely call them.
const parseOptionsLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

const normalizeOptionValue = (option: unknown): string =>
  typeof option === "string"
    ? option
    : String(
        (option as { label?: unknown; value?: unknown } | null)?.label ??
          (option as { label?: unknown; value?: unknown } | null)?.value ??
          "",
      );

type DraggableOptionRowProps = {
  value: string;
  index: number;
  onChange: (index: number, value: string) => void;
  onDelete: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

function DraggableOptionRow({
  value,
  index,
  onChange,
  onDelete,
  onMove,
}: DraggableOptionRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);

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
    [index, onMove],
  );

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: OPTION_DND_TYPE,
      item: { index },
      collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    }),
    [index],
  );

  const setRowNode = React.useCallback(
    (node: HTMLDivElement | null) => {
      rowRef.current = node;
      drop(node);
    },
    [drop],
  );

  return (
    <div
      ref={setRowNode}
      className={`flex items-center gap-2 rounded-md border border-gray-200 bg-white p-2 transition dark:border-slate-700 dark:bg-slate-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <button
        ref={drag as unknown as React.Ref<HTMLButtonElement>}
        type="button"
        aria-label="Drag option"
        className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <GripVertical className="size-4" />
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(index, e.target.value)}
        placeholder="Option label"
        className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
      />
      <button
        type="button"
        aria-label="Delete option"
        onClick={() => onDelete(index)}
        className="flex size-8 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

export default function FieldConfigModal({
  fieldType,
  initialConfig,
  onSave,
  onClose,
}: FieldConfigModalProps) {
  const typeConfig = FIELD_TYPES[fieldType] || FIELD_TYPES.single_line;
  
  const [config, setConfig] = useState<any>(() => {
    const base = initialConfig || (typeConfig ? typeConfig.defaultConfig() : FIELD_TYPES.single_line.defaultConfig());
    const normalized = {
      ...base,
      field_label: base.field_label || base.label || "",
      api_name: base.api_name || base.name || "",
      field_type: base.field_type || base.type || fieldType,
    };
    delete normalized.label;
    delete normalized.name;
    delete normalized.type;

    normalized.api_name = (normalized.api_name || normalized.field_label || "").trim().replace(/\s+/g, "_").toLowerCase();
    return normalized;
  });

  const [optionsText, setOptionsText] = useState(
    (config.options || []).map(normalizeOptionValue).join("\n")
  );
  const [optionsMode, setOptionsMode] = useState<"normal" | "mass">("normal");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleChange = (key: string, value: any) => {
    setConfig((prev: any) => {
      let mappedKey = key;
      if (key === "label") mappedKey = "field_label";
      if (key === "name") mappedKey = "api_name";
      if (key === "type") mappedKey = "field_type";

      const newConfig = { ...prev, [mappedKey]: value };
      if (mappedKey === "field_label") {
        newConfig.api_name = value.trim().replace(/\s+/g, "_").toLowerCase();
      }
      return newConfig;
    });
  };



  const getOptionsList = (): string[] => {
    const fromText = parseOptionsLines(optionsText);
    if (fromText.length > 0) return fromText;
    return (config.options || []).map((o: any) =>
      typeof o === "string" ? o : String(o.label ?? o.value ?? ""),
    );
  };

  const applyOptionsUpdate = (lines: string[]) => {
    setConfig((prev: any) => {
      const next = { ...prev, options: lines };
      const currentDefault = prev.defaultValue;

      if (typeof currentDefault === "string" && currentDefault !== "") {
        if (!lines.includes(currentDefault)) {
          next.defaultValue = "";
        }
      } else if (Array.isArray(currentDefault)) {
        next.defaultValue = currentDefault.filter((v: string) => lines.includes(v));
      }

      return next;
    });
  };

  const setOptionsFromNormalEditor = (lines: string[]) => {
    setOptionsText(lines.join("\n"));
    applyOptionsUpdate(lines);
  };

  const handleNormalOptionChange = (index: number, value: string) => {
    const options = (config.options || []).map(normalizeOptionValue);
    options[index] = value;
    setOptionsFromNormalEditor(options);
  };

  const handleAddNormalOption = () => {
    setOptionsFromNormalEditor([...(config.options || []).map(normalizeOptionValue), ""]);
  };

  const handleDeleteNormalOption = (index: number) => {
    const options = (config.options || []).map(normalizeOptionValue);
    options.splice(index, 1);
    setOptionsFromNormalEditor(options);
  };

  const handleMoveNormalOption = (fromIndex: number, toIndex: number) => {
    const options = (config.options || []).map(normalizeOptionValue);
    const [moved] = options.splice(fromIndex, 1);
    options.splice(toIndex, 0, moved);
    setOptionsFromNormalEditor(options);
  };

  const switchOptionsMode = (mode: "normal" | "mass") => {
    if (mode === "normal") {
      if (debounceTimer) clearTimeout(debounceTimer);
      applyOptionsUpdate(parseOptionsLines(optionsText));
    } else {
      setOptionsText((config.options || []).map(normalizeOptionValue).join("\n"));
    }
    setOptionsMode(mode);
  };

  const handleOptionsTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOptionsText(e.target.value);
    if (debounceTimer) clearTimeout(debounceTimer);
    const timer = setTimeout(() => {
      applyOptionsUpdate(parseOptionsLines(e.target.value));
    }, 800);
    setDebounceTimer(timer);
  };

  const handleOptionsBlur = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    applyOptionsUpdate(parseOptionsLines(optionsText));
  };

  const handleSave = () => {
    // In normal mode use config.options (kept in sync by applyOptionsUpdate).
    // In mass mode parse the textarea text directly.
    const finalOptions =
      optionsMode === "normal"
        ? (config.options || []).map(normalizeOptionValue)
        : parseOptionsLines(optionsText);

    const finalConfig = {
      ...config,
      options: finalOptions,
      field_type: config.field_type || fieldType,
    };

    const newErrors: Record<string, string> = {};
    (typeConfig.configFields || []).forEach((f: any) => {
      let mappedKey = f.key;
      if (f.key === "label") mappedKey = "field_label";
      if (f.key === "name") mappedKey = "api_name";
      if (f.key === "type") mappedKey = "field_type";

      const val = finalConfig[mappedKey];
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
    let mappedKey = field.key;
    if (field.key === "label") mappedKey = "field_label";
    if (field.key === "name") mappedKey = "api_name";
    if (field.key === "type") mappedKey = "field_type";

    switch (field.type) {
      case "text":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
              <span className="text-red-500">{field.required ? "*" : ""}</span>
            </label>
            <input
              type="text"
              value={config[mappedKey] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              aria-required={field.required}
              maxLength={field.maxLength || undefined}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {field.maxLength && (
              <p className="text-xs text-gray-400 mt-1 text-right">
                {String(config[mappedKey] || "").length} / {field.maxLength}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            <textarea
              value={config[mappedKey] || ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              rows={3}
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
            />
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            <input
              type="number"
              value={config[mappedKey] || ""}
              onChange={(e) =>
                handleChange(field.key, parseInt(e.target.value) || 0)
              }
              className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none ${errors[field.key] ? "border-red-500" : ""}`}
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
                checked={config[mappedKey] || false}
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
                checked={config[mappedKey] || false}
                onChange={(e) => handleChange(field.key, e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">{field.label}</span>
              {field.showInfoIcon && <InfoIcon />}
            </label>
            {config[mappedKey] && field.panelFields?.length > 0 && (
              <div className="mt-3 ml-1 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
                {field.panelFields.map((pf: any) => renderField(pf))}
              </div>
            )}
          </div>
        );

      case "radio-group":
        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                    checked={config[mappedKey] === opt.value}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            <select
              value={config[mappedKey] ?? ""}
              onChange={(e) => {
                const val = isNaN(Number(e.target.value))
                  ? e.target.value
                  : Number(e.target.value);
                handleChange(field.key, val);
              }}
              className="border border-gray-300 dark:border-slate-600 rounded-lg p-2 w-full bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
            >
              {field.options?.map((option: any, index: number) => (
                <option value={option.value} key={index}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "option-default": {
        const options = getOptionsList();
        const current = config[mappedKey] ?? "";
        const validValue =
          typeof current === "string" && options.includes(current) ? current : "";

        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            <select
              value={validValue}
              onChange={(e) => handleChange(field.key, e.target.value)}
              disabled={options.length === 0}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400"
            >
              <option value="">— None —</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {options.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                Add options above to choose a default
              </p>
            ) : null}
          </div>
        );
      }

      case "option-default-multi": {
        const options = getOptionsList();
        const selected: string[] = Array.isArray(config[mappedKey])
          ? config[mappedKey].filter((v: string) => options.includes(v))
          : config[mappedKey]
            ? options.includes(String(config[mappedKey]))
              ? [String(config[mappedKey])]
              : []
            : [];

        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            {options.length === 0 ? (
              <p className="text-sm text-gray-500">Add options above to choose defaults</p>
            ) : (
              <div className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-slate-600 rounded-[8px] bg-gray-50 dark:bg-slate-800 max-h-40 overflow-y-auto">
                {options.map((opt) => (
                  <label
                    key={opt}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, opt]
                          : selected.filter((v) => v !== opt);
                        handleChange(field.key, next);
                      }}
                      className="w-4 h-4"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "options": {
        const normalOptions: string[] = (config.options || []).map(normalizeOptionValue);

        return (
          <div key={field.key} className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {field.label}
                <span className="text-red-500">{field.required ? "*" : ""}</span>
              </label>
              <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={() => switchOptionsMode("normal")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    optionsMode === "normal"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Add Options
                </button>
                <button
                  type="button"
                  onClick={() => switchOptionsMode("mass")}
                  className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                    optionsMode === "mass"
                      ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                  }`}
                >
                  Add Mass Options
                </button>
              </div>
            </div>
            {optionsMode === "normal" ? (
              <div className="rounded-md border border-gray-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                <div className="space-y-2">
                  {normalOptions.length > 0 ? (
                    normalOptions.map((option, index) => (
                      <DraggableOptionRow
                        key={`option-${index}`}
                        value={option}
                        index={index}
                        onChange={handleNormalOptionChange}
                        onDelete={handleDeleteNormalOption}
                        onMove={handleMoveNormalOption}
                      />
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-5 text-center text-sm text-gray-500 dark:border-slate-700 dark:bg-slate-900 dark:text-gray-400">
                      No options added yet
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={handleAddNormalOption}
                >
                  <Plus className="size-4" /> Add option
                </Button>
              </div>
            ) : (
              <textarea
                value={optionsText}
                onChange={handleOptionsTextChange}
                onBlur={handleOptionsBlur}
                placeholder="One option per line"
                rows={6}
                className={`w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none outline-none ${errors[field.key] ? "border-red-500" : ""}`}
              />
            )}
            {errors[field.key] && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
            )}
            {config.options && config.options.length > 0 && (
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    Options Preview
                  </p>
                  <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                    {config.options.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {config.options.map((opt: any, idx: number) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-3 py-1.5 bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 rounded-md text-sm text-gray-700 dark:text-gray-200 font-medium shadow-sm hover:shadow transition-shadow"
                    >
                      {normalizeOptionValue(opt)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      }

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
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-screen overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Configure {typeConfig?.label || "Field Properties"}
          </h2>
        </div>

        <div className="p-6 space-y-6">
          {(typeConfig?.configFields || []).map((field: any) => renderField(field))}
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-4">
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
