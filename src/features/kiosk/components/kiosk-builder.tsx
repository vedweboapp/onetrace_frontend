"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { DndProvider, useDrop } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { AppButton as Button } from "@/shared/ui/app-button";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  Monitor,
  Smartphone,
  Plus,
  Trash2,
  Copy,
  Edit2,
  ArrowLeft,
  Layers,
  MoreHorizontal,
  Check,
  Columns,
} from "lucide-react";
import {
  type KioskConfig,
  type KioskQuestion,
  type KioskOption,
  DEFAULT_KIOSK_CONFIG,
} from "../types/kiosk.types";
import { KIOSK_FIELD_TYPES } from "../types/kiosk-field-types";
import { KioskModuleBar } from "./kiosk-module-bar";
import { DynamicKioskFieldPreview } from "./dynamic-kiosk-field-preview";
import { KioskFieldConfigModal } from "./kiosk-field-config-modal";
import { KioskRenderer } from "./kiosk-renderer";
import { cn } from "@/core/utils/http.util";

interface KioskBuilderProps {
  initialConfig?: KioskConfig;
  onSave?: (config: KioskConfig) => void;
  backUrl?: string;
}

const generateUid = (prefix = "k_") =>
  `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

const deriveApiNameFromLabel = (label: string): string => {
  return (
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "") || "option"
  );
};

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

// Question Section Dropzone for palette fields & options
const QuestionDropZone: React.FC<{
  question: KioskQuestion;
  index: number;
  onAddOption: (questionUid: string, item?: any) => void;
  onEditOption: (option: KioskOption, questionUid: string) => void;
  onDeleteOption: (questionUid: string, optionUid: string) => void;
  onDuplicateOption: (questionUid: string, option: KioskOption) => void;
  onMoveOption: (questionUid: string, fromUid: string, toIndex: number) => void;
  onUpdateQuestion: (questionUid: string, updates: Partial<KioskQuestion>) => void;
  onDeleteQuestion: (questionUid: string) => void;
  onDuplicateQuestion: (question: KioskQuestion) => void;
}> = ({
  question,
  index,
  onAddOption,
  onEditOption,
  onDeleteOption,
  onDuplicateOption,
  onMoveOption,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
}) => {
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [labelText, setLabelText] = useState(question.label || `Question ${index + 1}`);
  const [subLabelText, setSubLabelText] = useState(question.subLabel || "");
  const [apiNameText, setApiNameText] = useState(question.api_name || `question_${index + 1}`);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close ellipsis menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ["KIOSK_PALETTE_FIELD"],
      drop: (item: any) => {
        onAddOption(question._uid, item);
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver({ shallow: true }),
      }),
    }),
    [question._uid, onAddOption]
  );

  const saveHeader = () => {
    setIsEditingHeader(false);
    onUpdateQuestion(question._uid, {
      label: labelText.trim() || `Question ${index + 1}`,
      subLabel: subLabelText.trim() || undefined,
      api_name: apiNameText.trim() || `question_${index + 1}`,
    });
  };

  const cancelHeader = () => {
    setLabelText(question.label || `Question ${index + 1}`);
    setSubLabelText(question.subLabel || "");
    setApiNameText(question.api_name || `question_${index + 1}`);
    setIsEditingHeader(false);
  };

  return (
    <div
      ref={drop as any}
      className={`relative rounded-sm border bg-white shadow-2xs transition-all dark:bg-slate-900 ${
        isOver
          ? "border-blue-500 bg-blue-50/20 ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/20"
          : "border-slate-200 dark:border-slate-800"
      }`}
    >
      {/* Question Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-800/40 rounded-t-xl">
        <div className="flex flex-1 min-w-[240px] items-center gap-2">
          {isEditingHeader ? (
            <div className="flex flex-1 flex-col gap-1.5 max-w-lg">
              <input
                type="text"
                value={labelText}
                autoFocus
                onChange={(e) => setLabelText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveHeader();
                  if (e.key === "Escape") cancelHeader();
                }}
                className="rounded border border-blue-400 bg-white px-2.5 py-1 text-sm font-semibold text-slate-900 dark:border-blue-500 dark:bg-slate-800 dark:text-white"
                placeholder="Question label..."
              />
              <input
                type="text"
                value={subLabelText}
                onChange={(e) => setSubLabelText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveHeader();
                  if (e.key === "Escape") cancelHeader();
                }}
                className="rounded border border-slate-300 bg-white px-2.5 py-0.5 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                placeholder="Sub-label or instructions (optional)..."
              />
              <div className="sr-only">
                <span className="text-[10px] font-mono text-slate-400">api_name:</span>
                <input
                  type="text"
                  value={apiNameText}
                  onChange={(e) => setApiNameText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveHeader();
                    if (e.key === "Escape") cancelHeader();
                  }}
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 font-mono text-[10px] text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  placeholder="api_name..."
                />
              </div>
              {/* Save / Cancel buttons */}
              <div className="flex items-center gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={saveHeader}
                  className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700"
                >
                  <Check size={11} /> Save
                </button>
                <button
                  type="button"
                  onClick={cancelHeader}
                  className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingHeader(true)}
              className="group/title flex cursor-pointer items-start gap-2 rounded px-1.5 py-1 hover:bg-slate-200/50 dark:hover:bg-slate-800"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {question.label || `Question ${index + 1}`}
                  </span>
                  <Edit2 className="size-3 text-slate-400 opacity-0 group-hover/title:opacity-100" />
                </div>
                {question.subLabel && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {question.subLabel}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Ellipsis Menu: Columns + Duplicate + Delete */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "flex size-7 items-center justify-center rounded-md border transition",
              menuOpen
                ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-400"
                : "border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            )}
            title="Question options"
          >
            <MoreHorizontal size={14} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-30 w-52 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
              {/* Columns section */}
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <Columns size={10} /> Columns
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        onUpdateQuestion(question._uid, { columns: num, column_count: num });
                        setMenuOpen(false);
                      }}
                      className={cn(
                        "flex h-7 w-9 items-center justify-center rounded text-[11px] font-bold transition-all",
                        (question.columns || question.column_count || 2) === num
                          ? "bg-black text-white shadow-2xs dark:bg-white dark:text-black"
                          : "border border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      )}
                      title={`${num} Column${num > 1 ? "s" : ""}`}
                    >
                      {num}C
                    </button>
                  ))}
                </div>
              </div>

              {/* Duplicate */}
              <button
                type="button"
                onClick={() => { onDuplicateQuestion(question); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Copy size={13} className="text-slate-400" />
                Duplicate Question
              </button>

              {/* Delete */}
              <button
                type="button"
                onClick={() => { onDeleteQuestion(question._uid); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 size={13} />
                Delete Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options List / Drop Container */}
      <div className="p-5">
        {question.options && question.options.length > 0 ? (
          <div className={cn("grid gap-2.5", getGridClass(question.columns || question.column_count || 2))}>
            {question.options.map((option, optIdx) => (
              <DynamicKioskFieldPreview
                key={option._uid || optIdx}
                option={option}
                index={optIdx}
                onEdit={() => onEditOption(option, question._uid)}
                onDelete={() => onDeleteOption(question._uid, option._uid)}
                onDuplicate={() => onDuplicateOption(question._uid, option)}
                onMove={(fromIdx, toIdx) => onMoveOption(question._uid, option._uid, toIdx)}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800" />
        )}
      </div>
    </div>
  );
};

// Dropzone between question sections
const BetweenQuestionsDropZone: React.FC<{
  onDropQuestion: () => void;
  label?: string;
}> = ({ onDropQuestion, label }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["ADD_QUESTION"],
    drop: () => onDropQuestion(),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div
      ref={drop as any}
      className={`flex items-center justify-center rounded-lg border border-dashed py-2.5 text-center text-xs transition-colors ${
        isOver
          ? "border-blue-500 bg-blue-50 text-blue-600 dark:border-blue-400 dark:bg-blue-950/40 dark:text-blue-400 font-semibold"
          : "border-transparent text-slate-400 hover:border-slate-300 dark:text-slate-600 dark:hover:border-slate-700"
      }`}
    >
      {label || 'Drop "Add New Question" here'}
    </div>
  );
};

const EmptyCanvasDropZone: React.FC<{ onDropQuestion: () => void }> = ({
  onDropQuestion,
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ["ADD_QUESTION"],
    drop: () => onDropQuestion(),
    collect: (monitor) => ({ isOver: !!monitor.isOver() }),
  }));

  return (
    <div
      ref={drop as any}
      className={`my-8 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 text-center shadow-xs transition-colors ${
        isOver
          ? "border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/40"
          : "border-slate-300 bg-white dark:border-slate-800 dark:bg-slate-900"
      }`}
    >
      <div
        className={`flex size-14 items-center justify-center rounded-2xl mb-3 transition-colors ${
          isOver
            ? "bg-blue-100 text-blue-600 dark:bg-blue-900/60 dark:text-blue-300"
            : "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
        }`}
      >
        <Layers className="size-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
        {isOver ? "Release to add question" : "Empty Kiosk Canvas"}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
        Drag &quot;Add New Question&quot; from the left panel to create your first question section.
      </p>
    </div>
  );
};

export const KioskBuilder: React.FC<KioskBuilderProps> = ({
  initialConfig,
  onSave,
  backUrl = routes.dashboard.settingsKiosks,
}) => {
  const router = useRouter();

  // Normalize initial config to questions structure
  const [config, setConfig] = useState<KioskConfig>(() => {
    if (!initialConfig) return DEFAULT_KIOSK_CONFIG;
    const questions: KioskQuestion[] = Array.isArray(initialConfig.questions)
      ? initialConfig.questions.map((q) => ({
          ...q,
          options: (q.options || []).map((opt) => ({ ...opt })),
        }))
      : Array.isArray((initialConfig as any).sections)
        ? (initialConfig as any).sections.map((sec: any) => ({
            _uid: sec._uid || generateUid("q_"),
            id: sec.id ?? null,
            label: sec.heading || sec.name || "Question",
            subLabel: sec.subheading || "",
            api_name: sec.api_name || "question",
            options: (sec.fields || []).map((f: any) => ({
              _uid: f._uid || generateUid("opt_"),
              id: f.id ?? null,
              label: f.field_label || f.label || "Option",
              subLabel: f.description || "",
              api_name: deriveApiNameFromLabel(f.field_label || f.label || "option"),
              value: f.value || "",
              price: f.price || "",
              field_type: f.field_type || "radio",
              color: f.color,
            })),
          }))
        : [];

    return {
      ...DEFAULT_KIOSK_CONFIG,
      ...initialConfig,
      questions,
    };
  });

  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [editingOptionModal, setEditingOptionModal] = useState<{
    option: KioskOption;
    questionUid: string;
  } | null>(null);

  // Question Management
  const handleAddQuestion = useCallback((insertIndex?: number) => {
    const newQuestion: KioskQuestion = {
      _uid: generateUid("q_"),
      id: null,
      label: `Question ${(config.questions?.length ?? 0) + 1}`,
      subLabel: "Please select an option below",
      api_name: `question_${(config.questions?.length ?? 0) + 1}`,
      options: [],
    };

    setConfig((prev) => {
      const current = prev.questions ? [...prev.questions] : [];
      if (insertIndex != null && insertIndex >= 0 && insertIndex <= current.length) {
        current.splice(insertIndex, 0, newQuestion);
      } else {
        current.push(newQuestion);
      }
      return { ...prev, questions: current };
    });
  }, [config.questions]);

  const handleUpdateQuestion = useCallback((questionUid: string, updates: Partial<KioskQuestion>) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) =>
        q._uid === questionUid ? { ...q, ...updates } : q
      ),
    }));
  }, []);

  const handleDeleteQuestion = useCallback((questionUid: string) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).filter((q) => q._uid !== questionUid),
    }));
  }, []);

  const handleDuplicateQuestion = useCallback((question: KioskQuestion) => {
    const duplicated: KioskQuestion = {
      ...question,
      _uid: generateUid("q_"),
      id: null,
      label: `${question.label || "Question"} (Copy)`,
      api_name: `${question.api_name || "question"}_copy`,
      options: (question.options || []).map((opt) => ({
        ...opt,
        _uid: generateUid("opt_"),
        id: null,
      })),
    };

    setConfig((prev) => {
      const current = [...(prev.questions || [])];
      const idx = current.findIndex((q) => q._uid === question._uid);
      if (idx !== -1) {
        current.splice(idx + 1, 0, duplicated);
      } else {
        current.push(duplicated);
      }
      return { ...prev, questions: current };
    });
  }, []);

  // Option Management (Radio, Checkbox, Color, or Color Swatch Option)
  const handleAddOption = useCallback(
    (
      questionUid: string,
      droppedItem?: {
        field_type?: "radio" | "checkbox" | "color" | "color_swatch";
        defaultConfig?: Partial<KioskOption>;
      }
    ) => {
      const fieldType = (droppedItem?.field_type || "radio") as
        | "radio"
        | "checkbox"
        | "color"
        | "color_swatch"
        | "image_radio";
      const typeDef = KIOSK_FIELD_TYPES[fieldType] ?? KIOSK_FIELD_TYPES.radio;
      const defaultOpt = droppedItem?.defaultConfig || typeDef.defaultConfig();
      const isColorType = fieldType === "color" || fieldType === "color_swatch";
      const label =
        defaultOpt.label ||
        (fieldType === "color_swatch"
          ? "Color Swatch Choice"
          : fieldType === "color"
          ? "Color Choice"
          : fieldType === "checkbox"
          ? "Checkbox Option"
          : fieldType === "image_radio"
          ? "Image Choice"
          : "Radio Option");

      const newOption: KioskOption = {
        _uid: generateUid("opt_"),
        id: null,
        label,
        subLabel: defaultOpt.subLabel || "",
        api_name: defaultOpt.api_name || deriveApiNameFromLabel(label),
        value:
          defaultOpt.value ||
          (isColorType
            ? defaultOpt.color || (fieldType === "color_swatch" ? "#0EA5E9" : "#2563EB")
            : `${fieldType}_${Date.now()}`),
        color:
          defaultOpt.color ||
          (isColorType
            ? fieldType === "color_swatch"
              ? "#0EA5E9"
              : "#2563EB"
            : undefined),
        price: defaultOpt.price || "",
        image: defaultOpt.image || "",
        placement_mode: defaultOpt.placement_mode || "group",
        placement_position: defaultOpt.placement_position || undefined,
        placement: defaultOpt.placement || { mode: "group" },
        field_type: fieldType,
      };

      setConfig((prev) => ({
        ...prev,
        questions: (prev.questions || []).map((q) => {
          if (q._uid !== questionUid) return q;
          return {
            ...q,
            options: [...(q.options || []), newOption],
          };
        }),
      }));
    },
    []
  );

  const handleEditOption = useCallback((option: KioskOption, questionUid: string) => {
    setEditingOptionModal({ option, questionUid });
  }, []);

  const handleSaveOptionConfig = useCallback((updatedOption: KioskOption) => {
    if (!editingOptionModal) return;
    const { questionUid } = editingOptionModal;

    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if (q._uid !== questionUid) return q;
        return {
          ...q,
          options: (q.options || []).map((opt) =>
            opt._uid === updatedOption._uid ? updatedOption : opt
          ),
        };
      }),
    }));
    setEditingOptionModal(null);
  }, [editingOptionModal]);

  const handleDeleteOption = useCallback((questionUid: string, optionUid: string) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if (q._uid !== questionUid) return q;
        return {
          ...q,
          options: (q.options || []).filter((opt) => opt._uid !== optionUid),
        };
      }),
    }));
  }, []);

  const handleDuplicateOption = useCallback((questionUid: string, option: KioskOption) => {
    const duplicated: KioskOption = {
      ...option,
      _uid: generateUid("opt_"),
      id: null,
      label: `${option.label || "Option"} (Copy)`,
      api_name: `${option.api_name || "option"}_copy`,
      value: `${option.value || "choice"}_copy`,
    };

    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if (q._uid !== questionUid) return q;
        const opts = [...(q.options || [])];
        const idx = opts.findIndex((opt) => opt._uid === option._uid);
        if (idx !== -1) {
          opts.splice(idx + 1, 0, duplicated);
        } else {
          opts.push(duplicated);
        }
        return { ...q, options: opts };
      }),
    }));
  }, []);

  const handleMoveOption = useCallback((questionUid: string, fromUid: string, toIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if (q._uid !== questionUid) return q;
        const allOpts = [...(q.options || [])];
        const fromIndex = allOpts.findIndex((opt) => opt._uid === fromUid);
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return q;
        const [moved] = allOpts.splice(fromIndex, 1);
        allOpts.splice(toIndex, 0, moved);
        return { ...q, options: allOpts };
      }),
    }));
  }, []);

  // Top Action Handlers
  const handleSaveOnly = () => {
    onSave?.(config);
    toastSuccess("Kiosk saved successfully");
  };

  const handleSaveAndClose = () => {
    onSave?.(config);
    toastSuccess("Kiosk saved successfully");
    router.push(backUrl as any);
  };

  const handleClose = () => {
    router.push(backUrl as any);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div
        data-full-bleed-page
        className="dashboard-full-bleed-page flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-slate-100/60 dark:bg-slate-950 font-sans"
      >
        {/* Top Navigation Bar */}
        <header className="sticky top-0 z-30 flex h-14 w-full shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          {/* Left: Form Name Input */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="mr-1 flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Back"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                placeholder="Enter Kiosk Name"
                className="h-8 max-w-[240px] rounded-md border border-transparent bg-transparent px-2 text-sm font-semibold text-slate-900 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:outline-none dark:text-white dark:hover:border-slate-700 dark:focus:bg-slate-800"
              />
              <span className="text-red-500 font-bold">*</span>
            </div>
          </div>

          {/* Center: Tabs (Form, Preview) */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "form"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "preview"
                  ? "border-b-2 border-black text-black dark:border-white dark:text-white font-bold"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Preview
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {activeTab === "preview" && (
              <div className="mr-2 flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`flex size-7 items-center justify-center rounded ${
                    previewDevice === "desktop"
                      ? "bg-white shadow-xs dark:bg-slate-700 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="size-4" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`flex size-7 items-center justify-center rounded ${
                    previewDevice === "mobile"
                      ? "bg-white shadow-xs dark:bg-slate-700 text-blue-600"
                      : "text-slate-400 hover:text-slate-600"
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="size-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Close
            </button>
            <button
              onClick={handleSaveAndClose}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              Save and Close
            </button>
            <button
              onClick={handleSaveOnly}
              className="rounded-md bg-black px-4 py-1.5 text-xs font-semibold text-white hover:bg-black/90 dark:bg-white dark:text-black"
            >
              Save
            </button>
          </div>
        </header>

        {/* Builder / Preview Viewport */}
        {activeTab === "form" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Left ModuleBar Palette */}
            <KioskModuleBar
              onAddQuestion={() => handleAddQuestion()}
            />

            {/* Canvas Area */}
            <main className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              <div className="mx-auto w-full space-y-4 pb-20">
                {/* Top Drop Zone */}
                <BetweenQuestionsDropZone
                  onDropQuestion={() => handleAddQuestion(0)}
                  label='Drop "Add New Question" here to insert at the top'
                />

                {/* Question Sections List */}
                {config.questions && config.questions.length > 0 ? (
                  config.questions.map((question, qIndex) => (
                    <React.Fragment key={question._uid || qIndex}>
                      <QuestionDropZone
                        question={question}
                        index={qIndex}
                        onAddOption={handleAddOption}
                        onEditOption={handleEditOption}
                        onDeleteOption={handleDeleteOption}
                        onDuplicateOption={handleDuplicateOption}
                        onMoveOption={handleMoveOption}
                        onUpdateQuestion={handleUpdateQuestion}
                        onDeleteQuestion={handleDeleteQuestion}
                        onDuplicateQuestion={handleDuplicateQuestion}
                      />

                      {/* Dropzone between questions */}
                      <BetweenQuestionsDropZone
                        onDropQuestion={() => handleAddQuestion(qIndex + 1)}
                        label='Drop "Add New Question" here to insert below'
                      />
                    </React.Fragment>
                  ))
                ) : (
                  <EmptyCanvasDropZone
                    onDropQuestion={() => handleAddQuestion(0)}
                  />
                )}
              </div>
            </main>
          </div>
        ) : (
          /* Live Preview Mode */
           <main className="flex flex-1 min-h-0 flex-col overflow-y-auto p-4 custom-scrollbar bg-slate-200/60 dark:bg-slate-950">
            <div
              className={`w-full mt-6 transition-all duration-300 ${
                previewDevice === "mobile"
                  ? "mx-auto max-w-sm rounded-sm border-8 border-slate-800 bg-white shadow-2xl overflow-hidden min-h-[700px] dark:bg-slate-900"
                  : "rounded-sm border border-slate-200 bg-white shadow-xl overflow-hidden dark:border-slate-800 dark:bg-slate-900"
              }`}
            >
              <div className="p-4 md:p-5">
                <KioskRenderer
                  config={config}
                  onSubmit={(values) => {
                    console.log("Kiosk simulated submit values:", values);
                    toastSuccess("Simulated kiosk submission recorded!");
                  }}
                />
              </div>
            </div>
          </main>
        )}

        {/* Modal: Configure Option */}
        {editingOptionModal && (
          <KioskFieldConfigModal
            option={editingOptionModal.option}
            questions={config.questions || []}
            onSave={handleSaveOptionConfig}
            onClose={() => setEditingOptionModal(null)}
          />
        )}
      </div>
    </DndProvider>
  );
};