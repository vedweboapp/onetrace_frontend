import React, { useRef, useState } from "react";
import { FIELD_TYPES } from "./fieldTypes";
import { AppButton as Button } from "@/shared/ui/app-button";
import { GripVertical, Plus, Trash2, Paperclip, FileText, X, Palette, Image as ImageIcon, Search, Layers, Check, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, CircleDot } from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import { surfaceInputClassName, surfaceSelectClassName, surfaceTextareaClassName } from "@/shared/ui";
import { getCompositeItemsCatalog } from "../utils/composite-items.util";
import { cn } from "@/core/utils/http.util";

interface FieldConfigModalProps {
  fieldType: string;
  initialConfig: any;
  sections?: any[];
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

export const DEFAULT_COLOR_PALETTE = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#6B7280", // Gray
  "#14B8A6", // Teal
  "#F97316", // Orange
];

export type OptionItem = {
  label: string;
  value: string;
  associated_value_type?: "default" | "color" | "image";
  associated_value?: string | null;
  /** Raw File object — used for binary multipart upload. */
  fileObject?: File | null;
  file?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  fileSize?: number | null;
  color_value?: string | null;
  image_value?: string | null;
};

// Pure helpers — defined at module level so useState initializers can safely call them.
const isColorString = (s: unknown): boolean => {
  if (typeof s !== "string") return false;
  const trimmed = s.trim().toLowerCase();
  return (
    trimmed.startsWith("#") ||
    trimmed.startsWith("rgb(") ||
    trimmed.startsWith("rgba(") ||
    trimmed.startsWith("hsl(") ||
    trimmed.startsWith("hsla(")
  );
};

const parseOptionsLines = (text: string): string[] =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "");

const toOptionItem = (option: unknown, defaultType?: unknown): OptionItem => {
  const safeDefaultType: "default" | "color" | "image" =
    typeof defaultType === "string" && (defaultType === "color" || defaultType === "colors")
      ? "color"
      : typeof defaultType === "string" && defaultType === "image"
        ? "image"
        : "default";

  if (typeof option === "string") {
    return {
      label: option,
      value: option,
      associated_value_type: safeDefaultType,
      associated_value: null,
      file: null,
      fileObject: null,
      fileName: null,
    };
  }
  const obj = (option || {}) as any;
  const label = String(obj.label ?? obj.value ?? "");
  const value = String(obj.value ?? obj.label ?? "");

  const hasImage = Boolean(obj.image || obj.file || obj.fileObject || obj.image_value);
  const isColorVal = isColorString(value) || isColorString(obj.color) || isColorString(obj.associated_color);

  const candidateType =
    typeof obj.associated_value_type === "string"
      ? obj.associated_value_type
      : typeof obj.associatedValueType === "string"
        ? obj.associatedValueType
        : hasImage
          ? "image"
          : isColorVal
            ? "color"
            : safeDefaultType;

  const rawType = String(candidateType || "default").toLowerCase();
  const normalizedType: "default" | "color" | "image" =
    rawType === "colors" || rawType === "color"
      ? "color"
      : rawType === "image"
        ? "image"
        : "default";

  const colorVal =
    normalizedType === "color"
      ? (isColorString(value) ? value : (obj.color || obj.associated_color || obj.color_value || obj.associated_value || null))
      : null;

  const imageVal =
    normalizedType === "image"
      ? (obj.image || obj.file || obj.file_url || obj.image_value || obj.associated_value || null)
      : null;

  const assocVal = normalizedType === "color" ? colorVal : normalizedType === "image" ? imageVal : (obj.associated_value ?? null);

  return {
    label,
    value,
    associated_value_type: normalizedType,
    associated_value: assocVal,
    color_value: colorVal,
    image_value: imageVal,
    file: imageVal,
    fileObject: obj.fileObject instanceof File ? obj.fileObject : (obj.file instanceof File ? obj.file : null),
    fileName: obj.fileName ?? obj.file_name ?? obj.name ?? null,
    fileType: obj.fileType ?? obj.file_type ?? null,
    fileSize: obj.fileSize ?? obj.file_size ?? null,
  };
};

const normalizeOptionValue = (option: unknown): string => {
  if (typeof option === "string") return option;
  return String(
    (option as { label?: unknown; value?: unknown } | null)?.label ??
      (option as { label?: unknown; value?: unknown } | null)?.value ??
      "",
  );
};

type DraggableOptionRowProps = {
  option: OptionItem;
  index: number;
  associatedValueType: "default" | "color" | "image";
  onChange: (index: number, option: OptionItem) => void;
  onDelete: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
};

function DraggableOptionRow({
  option,
  index,
  associatedValueType,
  onChange,
  onDelete,
  onMove,
}: DraggableOptionRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    onChange(index, {
      ...option,
      associated_value_type: "image",
      associated_value: previewUrl,
      image_value: previewUrl,
      file: previewUrl,
      fileObject: file,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    e.target.value = "";
  };

  const handleRemoveFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (option.file && option.file.startsWith("blob:")) {
      URL.revokeObjectURL(option.file);
    }
    onChange(index, {
      ...option,
      associated_value: null,
      image_value: null,
      file: null,
      fileObject: null,
      fileName: null,
      fileType: null,
      fileSize: null,
    });
  };

  const handleColorChange = (newColor: string) => {
    onChange(index, {
      ...option,
      associated_value_type: "color",
      associated_value: newColor,
      color_value: newColor,
    });
  };

  const currentColor =
    (option.associated_value_type === "color" && option.associated_value)
      ? option.associated_value
      : option.color_value || DEFAULT_COLOR_PALETTE[index % DEFAULT_COLOR_PALETTE.length];

  const currentImage =
    (option.associated_value_type === "image" && option.associated_value)
      ? option.associated_value
      : option.image_value || option.file || null;

  return (
    <div
      ref={setRowNode}
      className={`flex flex-col gap-2 rounded-md border border-gray-200 bg-white p-2.5 transition dark:border-slate-700 dark:bg-slate-900 ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <button
          ref={drag as unknown as React.Ref<HTMLButtonElement>}
          type="button"
          aria-label="Drag option"
          className="flex size-8 shrink-0 cursor-grab items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <GripVertical className="size-4" />
        </button>

        {/* ── Mode 1: Colors ── */}
        {associatedValueType === "color" && (
          <div className="relative flex items-center gap-1 shrink-0">
            <label
              className="relative flex size-7 cursor-pointer items-center justify-center rounded-md border border-gray-300 dark:border-slate-600 shadow-sm transition hover:scale-105"
              style={{ backgroundColor: currentColor }}
              title="Pick color"
            >
              <input
                type="color"
                value={currentColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="absolute inset-0 size-full opacity-0 cursor-pointer"
              />
            </label>
          </div>
        )}

        {/* Option text input */}
        <input
          type="text"
          value={option.label}
          onChange={(e) =>
            onChange(index, {
              ...option,
              label: e.target.value,
              value: e.target.value,
            })
          }
          placeholder="Option label"
          className="min-w-0 flex-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[color:var(--dash-accent)] dark:border-slate-600 dark:bg-slate-800 dark:text-gray-100"
        />

        {/* ── Mode 2: Image ── */}
        {associatedValueType === "image" && (
          <>
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {!currentImage ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Upload image"
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700"
              >
                <ImageIcon className="size-3.5 text-emerald-500" />
                <span>Upload Image</span>
              </button>
            ) : null}
          </>
        )}

        <button
          type="button"
          aria-label="Delete option"
          onClick={() => onDelete(index)}
          className="flex size-8 shrink-0 items-center justify-center rounded text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {/* Uploaded Image preview chip in Image mode */}
      {associatedValueType === "image" && currentImage && (
        <div className="ml-10 flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50/70 px-2.5 py-1.5 text-xs text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentImage}
              alt={option.fileName || "Preview"}
              className="size-7 rounded object-cover border border-emerald-300 dark:border-emerald-800 shrink-0"
            />
            <span
              className="truncate font-medium"
              title={option.fileName || "Uploaded image"}
            >
              {option.fileName || "Uploaded image"}
            </span>
            {option.fileSize ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 shrink-0">
                ({(option.fileSize / 1024).toFixed(1)} KB)
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/50"
              title="Replace image"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={handleRemoveFile}
              className="flex size-5 items-center justify-center rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-950/50"
              title="Remove image"
            >
              <X className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
export default function FieldConfigModal({
  fieldType,
  initialConfig,
  sections = [],
  onSave,
  onClose,
}: FieldConfigModalProps) {
  const typeConfig = FIELD_TYPES[fieldType] || FIELD_TYPES.single_line;
  
  const [config, setConfig] = useState<any>(() => {
    const base = initialConfig || (typeConfig ? typeConfig.defaultConfig() : FIELD_TYPES.single_line.defaultConfig());
    const initialOptions =
      Array.isArray(base.options) && base.options.length > 0
        ? base.options
        : Array.isArray(base.associated_options) && base.associated_options.length > 0
          ? base.associated_options
          : base.options || [];

    const normalized = {
      ...base,
      field_label: base.field_label || base.label || "",
      api_name: base.api_name || base.name || "",
      field_type: base.field_type || base.type || fieldType,
      options: initialOptions,
      associated_options: base.associated_options || (base.associated_value_type !== "default" ? initialOptions : []),
    };
    delete normalized.label;
    delete normalized.name;
    delete normalized.type;

    normalized.api_name = (normalized.api_name || normalized.field_label || "").trim().replace(/\s+/g, "_").toLowerCase();
    return normalized;
  });

  const [associatedValueType, setAssociatedValueType] = useState<"default" | "color" | "image">(() => {
    const raw =
      config.associated_value_type ||
      config.associatedValueType ||
      (Array.isArray(config.associated_options) && config.associated_options.length > 0
        ? config.associated_options[0]?.associated_value_type
        : undefined);
    if (raw === "color" || raw === "colors") return "color";
    if (raw === "image") return "image";
    return "default";
  });

  const handleAssociatedTypeChange = (type: "default" | "color" | "image") => {
    setAssociatedValueType(type);
    setConfig((prev: any) => ({
      ...prev,
      associated_value_type: type,
    }));
  };

  // ── Composite ──────────────────────────────────────────────────────────────
  const isPicklistOrMulti =
    fieldType === "picklist" || fieldType === "multi_select";

  const [isComposite, setIsComposite] = useState<boolean>(
    () => Boolean(config.is_composite)
  );
  const [compositeItems, setCompositeItems] = useState<{ id: number; name: string }[]>(
    () => {
      if (Array.isArray(config.composite_items) && config.composite_items.length > 0) {
        return config.composite_items.map((ci: any) => {
          const id = typeof ci === "object" ? ci.id : ci;
          let name = typeof ci === "object" && ci.name ? ci.name : "";
          if (!name && Array.isArray(config.options)) {
            const matchedOpt = config.options.find((o: any) =>
              (typeof o === "object" ? String(o.value) : String(o)) === String(id)
            );
            if (matchedOpt) {
              name = typeof matchedOpt === "object" ? (matchedOpt.label || matchedOpt.value) : String(matchedOpt);
            }
          }
          return {
            id: isNaN(Number(id)) ? id : Number(id),
            name: name || `Item ${id}`,
          };
        });
      }
      if (config.is_composite && Array.isArray(config.options) && config.options.length > 0) {
        return config.options.map((o: any) => {
          const id = typeof o === "object" ? (o.value ?? o.id) : o;
          const name = typeof o === "object" ? (o.label ?? o.name ?? o.value) : o;
          return {
            id: isNaN(Number(id)) ? id : Number(id),
            name: String(name),
          };
        });
      }
      return [];
    }
  );
  const [itemsPool, setItemsPool] = useState<{ id: number; name: string }[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");
  const itemsFetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (isComposite && !itemsFetchedRef.current) {
      setItemsLoading(true);
      getCompositeItemsCatalog()
        .then((pool) => {
          setItemsPool(pool);
          itemsFetchedRef.current = true;
          setCompositeItems((prev) =>
            prev.map((ci) => {
              const matched = pool.find((p) => p.id === ci.id);
              return matched ? { id: ci.id, name: matched.name } : ci;
            })
          );
        })
        .catch(() => {})
        .finally(() => setItemsLoading(false));
    }
  }, [isComposite]);

  const handleCompositeToggle = async (checked: boolean) => {
    setIsComposite(checked);
    setConfig((prev: any) => {
      const next = { ...prev, is_composite: checked };
      if (checked) {
        const validIds = compositeItems.map((ci) => String(ci.id));
        if (typeof next.defaultValue === "string" && next.defaultValue !== "" && !validIds.includes(String(next.defaultValue))) {
          next.defaultValue = "";
        } else if (Array.isArray(next.defaultValue)) {
          next.defaultValue = next.defaultValue.filter((v: any) => validIds.includes(String(v)));
        }
      }
      return next;
    });
    if (checked && !itemsFetchedRef.current) {
      setItemsLoading(true);
      try {
        const pool = await getCompositeItemsCatalog();
        setItemsPool(pool);
        itemsFetchedRef.current = true;
        setCompositeItems((prev) =>
          prev.map((ci) => {
            const matched = pool.find((p) => p.id === ci.id);
            return matched ? { id: ci.id, name: matched.name } : ci;
          })
        );
      } catch {
        // silent
      } finally {
        setItemsLoading(false);
      }
    }
  };

  const toggleCompositeItem = (item: { id: number; name: string }) => {
    setCompositeItems((prev) => {
      const exists = prev.some((ci) => ci.id === item.id);
      const next = exists ? prev.filter((ci) => ci.id !== item.id) : [...prev, item];
      const validIds = next.map((ci) => String(ci.id));

      setConfig((cfg: any) => {
        let nextDefault = cfg.defaultValue;
        if (typeof nextDefault === "string" && nextDefault !== "") {
          if (!validIds.includes(String(nextDefault))) {
            nextDefault = "";
          }
        } else if (Array.isArray(nextDefault)) {
          nextDefault = nextDefault.filter((v: any) => validIds.includes(String(v)));
        }

        return {
          ...cfg,
          composite_items: next,
          defaultValue: nextDefault,
        };
      });

      return next;
    });
  };

  const filteredPool = itemsPool.filter((it) =>
    it.name.toLowerCase().includes(itemSearch.toLowerCase())
  );
  // ── end Composite ──────────────────────────────────────────────────────────

  // ── Fill Field Selection for Color mode ────────────────────────────────────
  const [fillField, setFillField] = useState<string>(() => {
    return String(
      config.fill_field ??
      config.fill_field_id ??
      config.fillField ??
      config.target_image_field ??
      config.target_field ??
      ""
    );
  });

  const availableFillFields = React.useMemo(() => {
    const list: { key: string; label: string; sectionName?: string; f_id?: string | number }[] = [];
    const seenUniqueKeys = new Set<string>();

    (sections || []).forEach((sec: any, secIdx: number) => {
      (sec.fields || []).forEach((f: any, fIdx: number) => {
        if (f.is_deleted) return;

        // Use the best available unique key for deduplication (never collapses to a shared sentinel)
        const uniqueKey = String(
          f._uid ??
          f.f_id ??
          f.field_id ??
          f.id ??
          f.api_name ??
          `sec-${secIdx}-f-${fIdx}`
        );
        if (seenUniqueKeys.has(uniqueKey)) return;
        seenUniqueKeys.add(uniqueKey);

        // The value stored as the fill target must come from f_id (server-assigned stable id)
        const fid =
          f.f_id ??
          f.field_id ??
          (f.id != null && !String(f.id).startsWith("field-") ? f.id : null) ??
          f._uid ??
          f.api_name ??
          uniqueKey;

        const fieldLabel = f.field_label || f.label || f.api_name || "Untitled Field";
        list.push({
          key: uniqueKey,
          label: fieldLabel,
          sectionName: sec.name || "Section",
          f_id: fid,
        });
      });
    });

    // If no fields found in sections yet, include the current field so options are always available
    if (list.length === 0) {
      const selfFid =
        config.f_id ??
        config.field_id ??
        (config.id != null && !String(config.id).startsWith("field-") ? config.id : null) ??
        config._uid ??
        "current_field";
      list.push({
        key: String(selfFid),
        label: config.field_label || config.label || "Current Field",
        sectionName: "Current Field",
        f_id: selfFid,
      });
    }

    return list;
  }, [sections, config.f_id, config.field_id, config.id, config._uid, config.field_label, config.label]);

  const availableQuestionFields = React.useMemo(() => {
    const list: { key: string; label: string; hasImages?: boolean; sectionName?: string }[] = [];
    const currentApiName = (config.api_name || config.name || "").toLowerCase().trim();

    (sections || []).forEach((sec: any) => {
      (sec.fields || []).forEach((f: any) => {
        if (f.is_deleted) return;
        const fieldKey = f.api_name || f.name || f._uid || f.f_id || String(f.id);
        const fieldLabel = f.field_label || f.label || f.api_name || "Untitled Field";
        if (currentApiName && fieldKey.toLowerCase().trim() === currentApiName) {
          return;
        }
        const norm = (f.field_type || f.type || "").toLowerCase();
        // Only include picklist / select / multi_select fields (or image upload)
        const isEligible = ["picklist", "select", "multi_select", "image_upload"].includes(norm);
        if (!isEligible) return;

        const hasImages =
          f.associated_value_type === "image" ||
          norm === "image_upload" ||
          (Array.isArray(f.options) &&
            f.options.some(
              (o: any) =>
                o.associated_value_type === "image" ||
                o.file ||
                o.image_value ||
                o.associated_value,
            ));
        list.push({
          key: fieldKey,
          label: fieldLabel,
          hasImages,
          sectionName: sec.name || "Section",
        });
      });
    });
    return list;
  }, [sections, config.api_name, config.name]);
  // ───────────────────────────────────────────────────────────────────────────

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
    })
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
      const existing: OptionItem[] = (prev.options || []).map(toOptionItem);
      const fileByLabel = new Map<string, OptionItem>();
      existing.forEach((opt) => {
        if (opt.file || opt.fileName) {
          fileByLabel.set(opt.label.trim().toLowerCase(), opt);
        }
      });

      const nextOptions: OptionItem[] = lines.map((line) => {
        const matched = fileByLabel.get(line.trim().toLowerCase());
        if (matched) {
          return { ...matched, label: line, value: line };
        }
        return { label: line, value: line, file: null, fileName: null };
      });

      const next = { ...prev, options: nextOptions };
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

  const handleNormalOptionChange = (index: number, updated: OptionItem) => {
    const nextOptions = (config.options || []).map(toOptionItem);
    nextOptions[index] = updated;
    setConfig((prev: any) => {
      const next = { ...prev, options: nextOptions };
      const optLabels = nextOptions.map((o: OptionItem) => o.label);
      if (typeof prev.defaultValue === "string" && prev.defaultValue !== "" && !optLabels.includes(prev.defaultValue)) {
        next.defaultValue = "";
      } else if (Array.isArray(prev.defaultValue)) {
        next.defaultValue = prev.defaultValue.filter((v: string) => optLabels.includes(v));
      }
      return next;
    });
    setOptionsText(nextOptions.map((o: OptionItem) => o.label).join("\n"));
  };

  const handleAddNormalOption = () => {
    const nextIndex = (config.options || []).length;
    const defaultColor = DEFAULT_COLOR_PALETTE[nextIndex % DEFAULT_COLOR_PALETTE.length];
    const newOpt: OptionItem = {
      label: "",
      value: "",
      associated_value_type: associatedValueType,
      associated_value: associatedValueType === "color" ? defaultColor : null,
      color_value: defaultColor,
      image_value: null,
      file: null,
      fileName: null,
    };
    const nextOptions = [...(config.options || []).map((o: any) => toOptionItem(o, associatedValueType)), newOpt];
    setConfig((prev: any) => ({ ...prev, options: nextOptions }));
    setOptionsText(nextOptions.map((o: OptionItem) => o.label).join("\n"));
  };

  const _unusedAdd = () => {
    const nextOptions = [...(config.options || []).map(toOptionItem), { label: "", value: "", file: null, fileName: null }];
    setConfig((prev: any) => ({ ...prev, options: nextOptions }));
    setOptionsText(nextOptions.map((o: OptionItem) => o.label).join("\n"));
  };

  const handleDeleteNormalOption = (index: number) => {
    const nextOptions = (config.options || []).map(toOptionItem);
    nextOptions.splice(index, 1);
    setConfig((prev: any) => {
      const next = { ...prev, options: nextOptions };
      const optLabels = nextOptions.map((o: OptionItem) => o.label);
      if (typeof prev.defaultValue === "string" && prev.defaultValue !== "" && !optLabels.includes(prev.defaultValue)) {
        next.defaultValue = "";
      } else if (Array.isArray(prev.defaultValue)) {
        next.defaultValue = prev.defaultValue.filter((v: string) => optLabels.includes(v));
      }
      return next;
    });
    setOptionsText(nextOptions.map((o: OptionItem) => o.label).join("\n"));
  };

  const handleMoveNormalOption = (fromIndex: number, toIndex: number) => {
    const nextOptions = (config.options || []).map(toOptionItem);
    const [moved] = nextOptions.splice(fromIndex, 1);
    nextOptions.splice(toIndex, 0, moved);
    setConfig((prev: any) => ({ ...prev, options: nextOptions }));
    setOptionsText(nextOptions.map((o: OptionItem) => o.label).join("\n"));
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
    let finalOptions: any[];
    if (isComposite) {
      finalOptions = [];
    } else if (optionsMode === "normal") {
      finalOptions = (config.options || []).map((o: any, idx: number) => {
        const opt = toOptionItem(o, associatedValueType);
        const itemType = associatedValueType;
        const defaultColor = DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];
        const itemValue = itemType === "color"
          ? (opt.color_value || (isColorString(opt.value) ? opt.value : (opt.associated_value || defaultColor)))
          : itemType === "image"
            ? (opt.associated_value || opt.image_value || opt.file || null)
            : null;

        return {
          label: opt.label,
          value: itemType === "color" ? itemValue : (opt.value || opt.label),
          associated_value_type: itemType,
          associated_value: itemValue,
          ...(itemType === "color"
            ? {
                color: itemValue,
                associated_color: itemValue,
                color_value: itemValue,
              }
            : {}),
          ...(itemType === "image"
            ? {
                file: opt.file || itemValue,
                fileName: opt.fileName,
                fileObject: (o as any)?.fileObject ?? opt.fileObject ?? ((opt.file as any) instanceof File ? (opt.file as any) : null) ?? ((o as any)?.file instanceof File ? (o as any).file : null) ?? null,
              }
            : {}),
        };
      });
    } else {
      const lines = parseOptionsLines(optionsText);
      finalOptions = lines.map((line, idx) => {
        const defaultCol = DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];
        return {
          label: line,
          value: associatedValueType === "color" ? defaultCol : line,
          associated_value_type: associatedValueType,
          associated_value: associatedValueType === "color" ? defaultCol : null,
          ...(associatedValueType === "color"
            ? {
                color: defaultCol,
                associated_color: defaultCol,
                color_value: defaultCol,
              }
            : {}),
        };
      });
    }

    let cleanedDefaultValue = config.defaultValue;
    if (isComposite) {
      const validIds = compositeItems.map((ci) => String(ci.id));
      if (typeof cleanedDefaultValue === "string" && cleanedDefaultValue !== "") {
        if (!validIds.includes(String(cleanedDefaultValue))) {
          cleanedDefaultValue = "";
        }
      } else if (Array.isArray(cleanedDefaultValue)) {
        cleanedDefaultValue = cleanedDefaultValue.filter((v: any) => validIds.includes(String(v)));
      }
    }

    const finalConfig = {
      ...config,
      defaultValue: cleanedDefaultValue,
      default_value: cleanedDefaultValue,
      associated_value_type: associatedValueType,
      options: finalOptions,
      associated_options: associatedValueType !== "default" ? finalOptions : [],
      field_type: config.field_type || fieldType,
      // Fill field when in color mode
      ...(associatedValueType === "color" && fillField
        ? {
            fill_field: fillField,
            fill_field_id: fillField,
            target_image_field: fillField,
          }
        : {
            fill_field: null,
            fill_field_id: null,
            target_image_field: null,
          }),
      ...(isPicklistOrMulti
        ? {
            is_composite: isComposite,
            composite_items: isComposite
              ? compositeItems.map((ci) => ({ id: ci.id }))
              : [],
          }
        : {}),
      ...(fieldType === "position_selection"
        ? {
            first_field: config.first_field || "",
            second_field: config.second_field || "",
            overlap_mode: config.overlap_mode || "second_over_first",
            default_position: config.default_position || config.defaultValue || "center",
            defaultValue: config.default_position || config.defaultValue || "center",
            default_value: config.default_position || config.defaultValue || "center",
            options: [
              { label: "Left", value: "left" },
              { label: "Right", value: "right" },
              { label: "Up", value: "up" },
              { label: "Down", value: "down" },
              { label: "Center", value: "center" },
            ],
          }
        : {}),
    };

    const newErrors: Record<string, string> = {};
    (typeConfig.configFields || []).forEach((f: any) => {
      let mappedKey = f.key;
      if (f.key === "label") mappedKey = "field_label";
      if (f.key === "name") mappedKey = "api_name";
      if (f.key === "type") mappedKey = "field_type";

      if (fieldType === "position_selection" && f.key === "position_settings") {
        if (!finalConfig.first_field) {
          newErrors["first_field"] = "Please select the first question";
        }
        if (!finalConfig.second_field) {
          newErrors["second_field"] = "Please select the second question";
        }
      }

      const val = finalConfig[mappedKey];
      if (f.required) {
        if (f.type === "checkbox") {
          if (!val) newErrors[f.key] = "Required";
        } else if (f.type === "options") {
          if (isComposite) {
            if (!compositeItems || compositeItems.length === 0) {
              newErrors[f.key] = "At least one item required";
            }
          } else {
            if (!finalConfig.options || finalConfig.options.length === 0) {
              newErrors[f.key] = "At least one option required";
            }
          }
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
            className={`${surfaceInputClassName} ${errors[field.key] ? "border-red-500" : ""}`}

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
              className={`${surfaceTextareaClassName} ${errors[field.key] ? "border-red-500" : ""}`}
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
              className={`${surfaceInputClassName} ${errors[field.key] ? "border-red-500" : ""}`}
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
                className="w-4 h-4 accent-[color:var(--dash-accent,#111111)]"
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
                    className="w-4 h-4 accent-[color:var(--dash-accent)] border-[color:var(--dashed-accent,#111111)]"
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
                            className={`${surfaceSelectClassName} ${errors[field.key] ? "border-red-500" : ""}`}
            >
              {field.options?.map((option: any, index: number) => (
                <option value={option.value} key={index} className="hover:bg-[color:var(--dash-accent,#111111)]">
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "position-field-config": {
        const firstFieldVal = config.first_field || "";
        const secondFieldVal = config.second_field || "";
        const defaultPosVal = config.default_position || config.defaultValue || "center";

        const firstFieldObj = availableQuestionFields.find((f) => f.key === firstFieldVal);
        const secondFieldObj = availableQuestionFields.find((f) => f.key === secondFieldVal);

        // Exclude the field selected in the other dropdown so it cannot be selected twice
        const firstFieldOptions = availableQuestionFields.filter(
          (f) => !secondFieldVal || f.key !== secondFieldVal,
        );
        const secondFieldOptions = availableQuestionFields.filter(
          (f) => !firstFieldVal || f.key !== firstFieldVal,
        );

        const posButtons = [
          { key: "left", label: "Left", icon: ArrowLeft },
          { key: "up", label: "Up", icon: ArrowUp },
          { key: "center", label: "Center", icon: CircleDot },
          { key: "down", label: "Down", icon: ArrowDown },
          { key: "right", label: "Right", icon: ArrowRight },
        ];

        return (
          <div key={field.key} className="space-y-4">
            <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200 border-b border-indigo-100 dark:border-indigo-900/50 pb-2.5">
                <Layers className="size-4 text-indigo-500" />
                <h4 className="text-sm font-semibold">Image Overlap Setup</h4>
              </div>

              {availableQuestionFields.length < 2 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200">
                  Position Selection requires at least <strong>two Pick List fields</strong> with images in the form.
                </div>
              )}

              {/* First Question */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  First Question (Base Image Picklist) <span className="text-red-500">*</span>
                </label>
                <select
                  value={firstFieldVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange("first_field", val);
                    if (val && val === secondFieldVal) {
                      handleChange("second_field", "");
                    }
                  }}
                  className={`${surfaceSelectClassName} ${errors["first_field"] ? "border-red-500" : ""}`}
                >
                  <option value="">— Select First Question (Base Image) —</option>
                  {firstFieldOptions.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.key}) {f.hasImages ? "📷" : ""} • {f.sectionName}
                    </option>
                  ))}
                </select>
                {errors["first_field"] && (
                  <p className="text-red-600 text-xs mt-1">{errors["first_field"]}</p>
                )}
              </div>

              {/* Second Question */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Second Question (Overlay Image Picklist) <span className="text-red-500">*</span>
                </label>
                <select
                  value={secondFieldVal}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange("second_field", val);
                    if (val && val === firstFieldVal) {
                      handleChange("first_field", "");
                    }
                  }}
                  className={`${surfaceSelectClassName} ${errors["second_field"] ? "border-red-500" : ""}`}
                >
                  <option value="">— Select Second Question (Overlay Image) —</option>
                  {secondFieldOptions.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label} ({f.key}) {f.hasImages ? "📷" : ""} • {f.sectionName}
                    </option>
                  ))}
                </select>
                {errors["second_field"] && (
                  <p className="text-red-600 text-xs mt-1">{errors["second_field"]}</p>
                )}
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  The image from {secondFieldObj?.label ? <strong className="text-gray-700 dark:text-gray-200">{secondFieldObj.label}</strong> : "this question"} will overlap on top of {firstFieldObj?.label ? <strong className="text-gray-700 dark:text-gray-200">{firstFieldObj.label}</strong> : "the first question"}.
                </p>
              </div>

              {/* Default Position Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Default Overlap Position
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {posButtons.map((pos) => {
                    const Icon = pos.icon;
                    const isSelected = defaultPosVal === pos.key;
                    return (
                      <button
                        key={pos.key}
                        type="button"
                        onClick={() => {
                          handleChange("default_position", pos.key);
                          handleChange("defaultValue", pos.key);
                        }}
                        className={cn(
                          "flex flex-col items-center justify-center gap-1 py-2 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer",
                          isSelected
                            ? "border-indigo-600 bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-200 dark:ring-indigo-900"
                            : "border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50",
                        )}
                      >
                        <Icon size={16} />
                        <span className="text-[11px]">{pos.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Users filling out the form can choose between Left, Right, Up, Down, and Center with live preview.
                </p>
              </div>
            </div>
          </div>
        );
      }

      case "option-default": {
        const options: { label: string; value: string }[] = isComposite
          ? compositeItems.map((ci) => ({ label: ci.name, value: String(ci.id) }))
          : getOptionsList().map((opt) => ({ label: opt, value: opt }));
        const current = config[mappedKey] != null ? String(config[mappedKey]) : "";
        const validValue = options.some((o) => o.value === current) ? current : "";

        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            <select
              value={validValue}
              onChange={(e) => handleChange(field.key, e.target.value)}
              disabled={options.length === 0}
              className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-[8px] focus:ring-2 focus:ring-[color:var(--dash-accent)] outline-none bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 disabled:bg-gray-50 dark:disabled:bg-slate-800 disabled:text-gray-400"
            >
              <option value="">— None —</option>
              {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {options.length === 0 ? (
              <p className="text-xs text-gray-500 mt-1">
                {isComposite
                  ? "Select composite items above to choose a default"
                  : "Add options above to choose a default"}
              </p>
            ) : null}
          </div>
        );
      }

      case "option-default-multi": {
        const options: { label: string; value: string }[] = isComposite
          ? compositeItems.map((ci) => ({ label: ci.name, value: String(ci.id) }))
          : getOptionsList().map((opt) => ({ label: opt, value: opt }));
        const rawSelected: string[] = Array.isArray(config[mappedKey])
          ? config[mappedKey].map(String)
          : config[mappedKey] != null && config[mappedKey] !== ""
            ? [String(config[mappedKey])]
            : [];
        const selected = rawSelected.filter((v: string) => options.some((o) => o.value === v));

        return (
          <div key={field.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {field.label}
            </label>
            {options.length === 0 ? (
              <p className="text-sm text-gray-500">
                {isComposite
                  ? "Select composite items above to choose defaults"
                  : "Add options above to choose defaults"}
              </p>
            ) : (
              <div className="flex flex-col gap-2 p-3 border border-gray-200 dark:border-slate-600 rounded-[8px] bg-gray-50 dark:bg-slate-800 max-h-40 overflow-y-auto">
                {options.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 dark:text-gray-300"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(opt.value)}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...selected, opt.value]
                          : selected.filter((v) => v !== opt.value);
                        handleChange(field.key, next);
                      }}
                      className="w-4 h-4 accent-[color:var(--dash-accent)]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        );
      }

      case "options": {
        const normalOptions: OptionItem[] = (config.options || []).map((o: any) => toOptionItem(o, associatedValueType));

        return (
          <div key={field.key} className="space-y-3">
            {/* ── Composite toggle (picklist / multi-select only) ── */}
            {isPicklistOrMulti && (
              <div className="rounded-lg border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                {/* Toggle row */}
                <div
                  onClick={() => handleCompositeToggle(!isComposite)}
                  className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      <Layers className="size-4" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200 block">
                        Is Composite
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Link items from catalog to this picklist
                      </span>
                    </div>
                  </div>

                  {/* Toggle switch */}
                  <div
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                      isComposite
                        ? "bg-indigo-600"
                        : "bg-gray-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-4 rounded-full bg-white shadow-sm transform transition-transform ${
                        isComposite ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </div>
                </div>

                {/* Items lookup panel */}
                {isComposite && (
                  <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/20">
                    {/* Search box */}
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={itemSearch}
                        onChange={(e) => setItemSearch(e.target.value)}
                        placeholder="Search items by name..."
                        className="w-full rounded-md border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 pl-8 pr-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Selected chips */}
                    {compositeItems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1">
                        {compositeItems.map((ci) => (
                          <span
                            key={ci.id}
                            className="inline-flex items-center gap-1 rounded-full border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:text-indigo-200"
                          >
                            <span>{ci.name}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleCompositeItem(ci);
                              }}
                              className="ml-0.5 rounded-full p-0.5 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                            >
                              <X className="size-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Items list */}
                    <div className="max-h-48 overflow-y-auto rounded-md border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 divide-y divide-gray-100 dark:divide-slate-700/60 shadow-inner">
                      {itemsLoading ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          Loading items from catalog...
                        </div>
                      ) : filteredPool.length === 0 ? (
                        <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                          {itemsPool.length === 0 ? "No items available" : "No items match your search"}
                        </div>
                      ) : (
                        filteredPool.map((item) => {
                          const selected = compositeItems.some((ci) => ci.id === item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => toggleCompositeItem(item)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                                selected
                                  ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-200 font-medium"
                                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                              }`}
                            >
                              <span className="truncate">{item.name}</span>
                              {selected ? (
                                <Check className="size-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                              ) : (
                                <span className="text-xs text-gray-400">ID: {item.id}</span>
                              )}
                            </button>
                          );
                        })
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-1">
                      <span>
                        {compositeItems.length} selected
                      </span>
                      <span className="font-mono text-indigo-600 dark:text-indigo-400 text-[11px]">
                        payload: composite_items: [{compositeItems.map(c => c.id).join(", ")}]
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* When isComposite is true, hide the manual option adding menu */}
            {!isComposite && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {field.label}
                      <span className="text-red-500">{field.required ? "*" : ""}</span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {/* Add Options / Add Mass Options */}
                    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => switchOptionsMode("normal")}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                          optionsMode === "normal"
                            ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100 font-semibold"
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
                            ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100 font-semibold"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        Add Mass Options
                      </button>
                    </div>

                    {/* Default, Colors, Image buttons - positioned down here next to Add Options! */}
                    <div className="inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-slate-700 dark:bg-slate-800">
                      <button
                        type="button"
                        onClick={() => handleAssociatedTypeChange("default")}
                        className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                          associatedValueType === "default"
                            ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100 font-semibold"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssociatedTypeChange("color")}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                          associatedValueType === "color"
                            ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100 font-semibold"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        <Palette className="size-3.5 text-indigo-500" />
                        Colors
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAssociatedTypeChange("image")}
                        className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition ${
                          associatedValueType === "image"
                            ? "bg-white text-gray-900 shadow-sm dark:bg-slate-900 dark:text-gray-100 font-semibold"
                            : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                        }`}
                      >
                        <ImageIcon className="size-3.5 text-emerald-500" />
                        Image
                      </button>
                    </div>
                  </div>

                  {/* ── Fill Field Selector when in Colors mode ── */}
                  {associatedValueType === "color" && (
                    <div className="rounded-md border border-indigo-100 dark:border-indigo-950/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-3 space-y-1.5 transition-all">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <Palette className="size-3.5 text-indigo-500" />
                          <span>Target Fill Field</span>
                        </label>
                        <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                          Field to apply this color fill to
                        </span>
                      </div>

                      <select
                        value={fillField}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFillField(val);
                          setConfig((prev: any) => ({
                            ...prev,
                            fill_field: val,
                            target_image_field: val,
                          }));
                        }}
                        className="w-full rounded-md border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                      >
                        <option value="">— Select Target Fill Field (None) —</option>
                        {availableFillFields.map((f) => (
                          <option key={f.key} value={f.key}>
                            {f.label} ({f.key}) • {f.sectionName}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {optionsMode === "normal" ? (
                  <div className="rounded-md border border-gray-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                    <div className="space-y-2">
                      {normalOptions.length > 0 ? (
                        normalOptions.map((option, index) => (
                          <DraggableOptionRow
                            key={`option-${index}`}
                            option={option}
                            index={index}
                            associatedValueType={associatedValueType}
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
                        Options Preview ({associatedValueType === "color" ? "Colors" : associatedValueType === "image" ? "Image" : "Default"})
                      </p>
                      <span className="px-2.5 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                        {config.options.length}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {config.options.map((opt: any, idx: number) => {
                        const item = toOptionItem(opt, associatedValueType);
                        const optColor = (item.associated_value_type === "color" && item.associated_value)
                          ? item.associated_value
                          : item.color_value || DEFAULT_COLOR_PALETTE[idx % DEFAULT_COLOR_PALETTE.length];
                        const optImage = (item.associated_value_type === "image" && item.associated_value)
                          ? item.associated_value
                          : item.image_value || item.file;

                        return (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-full text-xs font-medium border border-gray-200 dark:border-slate-700 shadow-sm"
                          >
                            {associatedValueType === "color" && (
                              <span
                                className="size-3 rounded-full shrink-0 shadow-sm border border-black/10"
                                style={{ backgroundColor: optColor }}
                              />
                            )}
                            {associatedValueType === "image" && optImage && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={optImage}
                                alt=""
                                className="size-4 rounded-full object-cover shrink-0 border border-gray-200 dark:border-slate-600"
                              />
                            )}
                            <span>{item.label || item.value}</span>
                            {item.fileName && associatedValueType !== "image" ? (
                              <span
                                className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold"
                                title={`Attached: ${item.fileName}`}
                              >
                                <Paperclip className="size-3" />
                                <span className="max-w-[80px] truncate">{item.fileName}</span>
                              </span>
                            ) : null}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
            {errors[field.key] && isComposite && (
              <p className="text-red-600 text-sm mt-1">{errors[field.key]}</p>
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
