"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
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
  Eye,
} from "lucide-react";
import {
  type KioskConfig,
  type KioskQuestion,
  type KioskOption,
  type KioskGroup,
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

// Inner Frame Group Component inside a Question
const QuestionInnerGroupFrame: React.FC<{
  group: KioskGroup;
  groupIndex: number;
  totalGroups: number;
  questionUid: string;
  columns: number;
  onUpdateGroupName: (name: string) => void;
  onUpdateGroupColumns: (cols: number) => void;
  onDeleteGroup: () => void;
  onDropOption: (item: any) => void;
  onEditOption: (option: KioskOption, questionUid: string) => void;
  onDeleteOption: (questionUid: string, optionUid: string) => void;
  onDuplicateOption: (questionUid: string, option: KioskOption) => void;
  onMoveOption: (questionUid: string, fromUid: string, toIndex: number) => void;
}> = ({
  group,
  groupIndex,
  totalGroups,
  questionUid,
  columns,
  onUpdateGroupName,
  onUpdateGroupColumns,
  onDeleteGroup,
  onDropOption,
  onEditOption,
  onDeleteOption,
  onDuplicateOption,
  onMoveOption,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameText, setNameText] = useState(group.name || `Group ${groupIndex + 1}`);

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ["KIOSK_PALETTE_FIELD"],
      drop: (item: any) => {
        onDropOption(item);
        return { handled: true };
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver({ shallow: true }),
      }),
    }),
    [onDropOption]
  );

  const saveName = () => {
    setIsEditingName(false);
    onUpdateGroupName(nameText.trim() || `Group ${groupIndex + 1}`);
  };

  return (
    <div
      ref={drop as any}
      className={cn(
        "rounded-lg border border-dashed p-4 transition-all duration-150 space-y-3",
        isOver
          ? "border-blue-500 bg-blue-50/30 ring-2 ring-blue-500/20 dark:border-blue-400 dark:bg-blue-950/20"
          : "border-slate-300 bg-slate-50/50 hover:border-slate-400/80 dark:border-slate-700 dark:bg-slate-900/40"
      )}
    >
      {/* Inner Frame Group Header */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 pb-2.5 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            Group
          </span>

          {isEditingName ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                autoFocus
                value={nameText}
                onChange={(e) => setNameText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") {
                    setNameText(group.name || `Group ${groupIndex + 1}`);
                    setIsEditingName(false);
                  }
                }}
                className="rounded border border-blue-400 bg-white px-2 py-0.5 text-xs font-bold text-slate-800 dark:border-blue-500 dark:bg-slate-800 dark:text-white"
              />
              <button
                type="button"
                onClick={saveName}
                className="rounded bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          ) : (
            <div
              onClick={() => setIsEditingName(true)}
              className="group/grp flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.5 hover:bg-slate-200/60 dark:hover:bg-slate-800"
            >
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {group.name || `Group ${groupIndex + 1}`}
              </span>
              <Edit2 className="size-2.5 text-slate-400 opacity-0 group-hover/grp:opacity-100" />
            </div>
          )}

          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
            ({group.options.length} {group.options.length === 1 ? "field" : "fields"})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Columns selector */}
          <div className="flex items-center gap-0.5 rounded border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {[1, 2, 3, 4].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => onUpdateGroupColumns(num)}
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-semibold transition",
                  columns === num
                    ? "bg-blue-600 text-white"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                )}
                title={`${num} column${num > 1 ? "s" : ""}`}
              >
                {num}c
              </button>
            ))}
          </div>

          {/* Delete group */}
          <button
            type="button"
            onClick={onDeleteGroup}
            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
            title="Delete group"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Options / Fields inside this Group */}
      {group.options && group.options.length > 0 ? (
        <div className={cn("grid gap-2.5", getGridClass(columns))}>
          {group.options.map((option, optIdx) => {
            const optId = option.uid || option._uid || String(optIdx);
            return (
              <DynamicKioskFieldPreview
                key={optId}
                option={option}
                index={optIdx}
                onEdit={() => onEditOption(option, questionUid)}
                onDelete={() => onDeleteOption(questionUid, optId)}
                onDuplicate={() => onDuplicateOption(questionUid, option)}
                onMove={(fromIdx, toIdx) => onMoveOption(questionUid, optId, toIdx)}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/60 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
          Drag fields here into {group.name || "this group"}
        </div>
      )}
    </div>
  );
};

// Question Section Dropzone for palette fields & options
const QuestionDropZone: React.FC<{
  question: KioskQuestion;
  index: number;
  onAddOption: (questionUid: string, item?: any) => void;
  onAddGroupToQuestion: (questionUid: string) => void;
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
  onAddGroupToQuestion,
  onEditOption,
  onDeleteOption,
  onDuplicateOption,
  onMoveOption,
  onUpdateQuestion,
  onDeleteQuestion,
  onDuplicateQuestion,
}) => {
  const qId = question.q_id || question._uid || `q_${index}`;
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

  // Resolve inner groups — NO default group auto-creation
  const resolvedGroups = useMemo((): KioskGroup[] => {
    return question.groups && question.groups.length > 0 ? question.groups : [];
  }, [question.groups]);

  const hasGroups = resolvedGroups.length > 0;

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: ["KIOSK_PALETTE_FIELD", "ADD_GROUP"],
      drop: (item: any, monitor) => {
        if (monitor.didDrop()) {
          return;
        }
        const itemType = monitor.getItemType();
        if (itemType === "ADD_GROUP" || item?.type === "ADD_GROUP") {
          onAddGroupToQuestion(qId);
          return;
        }
        if (hasGroups) {
          // Drop into the last group
          const lastGroup = resolvedGroups[resolvedGroups.length - 1];
          const lastGid = lastGroup.gid || lastGroup._uid || "";
          onAddOption(qId, { ...item, targetGroupUid: lastGid });
        } else {
          // No groups — add directly to question.options
          onAddOption(qId, item);
        }
      },
      collect: (monitor) => ({
        isOver: !!monitor.isOver({ shallow: true }),
      }),
    }),
    [qId, onAddOption, onAddGroupToQuestion, resolvedGroups, hasGroups]
  );

  const handleUpdateGroupName = (groupUid: string, name: string) => {
    const updated = resolvedGroups.map((g) =>
      (g.gid || g._uid) === groupUid ? { ...g, name } : g
    );
    onUpdateQuestion(question.q_id || question._uid || "", {
      groups: updated,
    });
  };

  const handleUpdateGroupColumns = (groupUid: string, cols: number) => {
    const updated = resolvedGroups.map((g) =>
      (g.gid || g._uid) === groupUid ? { ...g, columns: cols } : g
    );
    onUpdateQuestion(question.q_id || question._uid || "", {
      groups: updated,
    });
  };

  const handleDeleteGroup = (groupUid: string) => {
    const groupToDelete = resolvedGroups.find((g) => (g.gid || g._uid) === groupUid);
    const updated = resolvedGroups.filter((g) => (g.gid || g._uid) !== groupUid);
    // Merge the deleted group's options back into flat question.options if no groups remain
    if (updated.length === 0) {
      const deletedOptions = groupToDelete?.options || [];
      onUpdateQuestion(question.q_id || question._uid || "", {
        groups: undefined,
        options: deletedOptions,
      });
    } else {
      onUpdateQuestion(question.q_id || question._uid || "", {
        groups: updated,
      });
    }
  };

  const saveHeader = () => {
    setIsEditingHeader(false);
    onUpdateQuestion(question.q_id || question._uid || "", {
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
                        onUpdateQuestion(qId, { columns: num, column_count: num });
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
                onClick={() => { onDeleteQuestion(qId); setMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-xs font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 size={13} />
                Delete Question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Options List / Inner Group Frames */}
      <div className="p-5 space-y-3.5">
        {hasGroups ? (
          // Render explicit group frames
          resolvedGroups.map((grp, grpIdx) => {
            const grpId = grp.gid || grp._uid || `grp_${grpIdx}`;
            return (
              <QuestionInnerGroupFrame
                key={grpId}
                group={grp}
                groupIndex={grpIdx}
                totalGroups={resolvedGroups.length}
                questionUid={qId}
                columns={grp.columns || question.columns || question.column_count || 2}
                onUpdateGroupName={(name) => handleUpdateGroupName(grpId, name)}
                onUpdateGroupColumns={(cols) => handleUpdateGroupColumns(grpId, cols)}
                onDeleteGroup={() => handleDeleteGroup(grpId)}
                onDropOption={(item) => onAddOption(qId, { ...item, targetGroupUid: grpId })}
                onEditOption={onEditOption}
                onDeleteOption={onDeleteOption}
                onDuplicateOption={onDuplicateOption}
                onMoveOption={onMoveOption}
              />
            );
          })
        ) : (
          // No groups — render options directly in a flat grid
          <div>
            {(question.options || []).length > 0 ? (
              <div className={cn("grid gap-2.5", getGridClass(question.columns || question.column_count || 2))}>
                {(question.options || []).map((option, optIdx) => {
                  const optId = option.uid || option._uid || String(optIdx);
                  return (
                    <DynamicKioskFieldPreview
                      key={optId}
                      option={option}
                      index={optIdx}
                      onEdit={() => onEditOption(option, qId)}
                      onDelete={() => onDeleteOption(qId, optId)}
                      onDuplicate={() => onDuplicateOption(qId, option)}
                      onMove={(fromIdx, toIdx) => onMoveOption(qId, optId, toIdx)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="flex h-16 items-center justify-center rounded-md border border-dashed border-slate-200 bg-white/60 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900/30">
                Drag fields here to add options
              </div>
            )}
          </div>
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

// Helper to sanitize options and payload hierarchy strictly
export const sanitizeOption = (opt: KioskOption): KioskOption => {
  const isImageRadio = opt.field_type === "image_radio";
  const isColor = opt.field_type === "color" || opt.field_type === "color_swatch";
  const optUid = opt.uid || opt._uid || generateUid("opt_");

  const clean: KioskOption = {
    uid: optUid,
    _uid: optUid,
    id: opt.id ?? null,
    field_type: opt.field_type || "radio",
    label: opt.label || "",
    subLabel: opt.subLabel || "",
    api_name: opt.api_name || "",
    value: opt.value ?? "",
    price: opt.price || "",
    image: opt.image || "",
    required: opt.required ?? false,
  };

  if (opt.placeholder !== undefined) clean.placeholder = opt.placeholder;
  if (opt.input_type !== undefined) clean.input_type = opt.input_type;
  if (opt.color !== undefined) clean.color = opt.color;
  if (opt.fill_color !== undefined) clean.fill_color = opt.fill_color;
  if (opt.gid !== undefined) clean.gid = opt.gid;

  if (isImageRadio) {
    if (opt.placement_mode) clean.placement_mode = opt.placement_mode;
    if (opt.placement_position) clean.placement_position = opt.placement_position;
    if (opt.placement) clean.placement = opt.placement;
  }

  if (isColor) {
    if (opt.fill_targets && opt.fill_targets.length > 0) {
      clean.fill_targets = opt.fill_targets;
    }
    if (opt.target_image_field) {
      clean.target_image_field = opt.target_image_field;
    }
    if (opt.color_fill) {
      clean.color_fill = opt.color_fill;
    }
  }

  return clean;
};

export const sanitizeConfig = (rawConfig: KioskConfig): KioskConfig => {
  return {
    name: rawConfig.name || "",
    id: rawConfig.id,
    api_name: rawConfig.api_name,
    description: rawConfig.description,
    submitting: rawConfig.submitting,
    is_active: rawConfig.is_active,
    questions: (rawConfig.questions || []).map((q) => {
      const q_id = q.q_id || q._uid || generateUid("q_");

      if (q.groups && q.groups.length > 0) {
        const sanitizedGroups = q.groups.map((g) => {
          const gid = g.gid || g._uid || generateUid("gid_");
          const groupOptions = (g.options || []).map((opt) => {
            const cleaned = sanitizeOption(opt);
            cleaned.gid = gid;
            return cleaned;
          });
          const cleanGroup: KioskGroup = {
            gid,
            id: g.id ?? null,
            name: g.name,
            columns: g.columns,
            options: groupOptions,
          };
          if (g.description) cleanGroup.description = g.description;
          if (g.api_name) cleanGroup.api_name = g.api_name;
          return cleanGroup;
        });

        // Question with groups strictly HAS NO "options" key and NO "_uid" key
        return {
          q_id,
          id: q.id ?? null,
          label: q.label,
          subLabel: q.subLabel,
          api_name: q.api_name,
          columns: q.columns,
          column_count: q.column_count,
          groups: sanitizedGroups,
        };
      } else {
        const sanitizedOptions = (q.options || []).map(sanitizeOption);
        return {
          q_id,
          id: q.id ?? null,
          label: q.label,
          subLabel: q.subLabel,
          api_name: q.api_name,
          columns: q.columns,
          column_count: q.column_count,
          options: sanitizedOptions,
        };
      }
    }),
  };
};

export const KioskBuilder: React.FC<KioskBuilderProps> = ({
  initialConfig,
  onSave,
  backUrl = routes.dashboard.settingsKiosks,
}) => {
  const router = useRouter();

  // Normalize initial config to sanitized questions structure
  const [config, setConfig] = useState<KioskConfig>(() => {
    if (!initialConfig) return DEFAULT_KIOSK_CONFIG;
    return sanitizeConfig(initialConfig);
  });

  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [editingOptionModal, setEditingOptionModal] = useState<{
    option: KioskOption;
    questionUid: string;
  } | null>(null);
  const [draftOption, setDraftOption] = useState<KioskOption | null>(null);

  const livePreviewOptions = useMemo(() => {
    if (!editingOptionModal || !draftOption) return undefined;
    return { [editingOptionModal.questionUid]: draftOption };
  }, [editingOptionModal, draftOption]);

  const previewConfig = useMemo((): KioskConfig => {
    if (!draftOption || !editingOptionModal) return config;
    const { questionUid } = editingOptionModal;
    const draftOptId = draftOption.uid || draftOption._uid;
    return {
      ...config,
      questions: (config.questions || []).map((q) => {
        const qId = q.q_id || q._uid;
        if (qId !== questionUid) return q;
        const updatedOpts = q.options
          ? q.options.map((opt) =>
              (opt.uid || opt._uid) === draftOptId ? { ...draftOption } : opt,
            )
          : undefined;
        const updatedGroups = q.groups
          ? q.groups.map((g) => ({
              ...g,
              options: (g.options || []).map((opt) =>
                (opt.uid || opt._uid) === draftOptId ? { ...draftOption } : opt,
              ),
            }))
          : undefined;
        return {
          ...q,
          options: updatedOpts,
          groups: updatedGroups,
        };
      }),
    };
  }, [config, draftOption, editingOptionModal]);

  // Question Management
  const handleAddQuestion = useCallback((insertIndex?: number) => {
    const qUid = generateUid("q_");
    const newQuestion: KioskQuestion = {
      q_id: qUid,
      _uid: qUid,
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

  // Add a new group frame to a specific question (called on drag-and-drop of ADD_GROUP)
  const handleAddGroupToQuestion = useCallback((questionUid: string) => {
    setConfig((prev) => {
      const questions = [...(prev.questions || [])];
      const targetQIdx = questions.findIndex((q) => (q.q_id || q._uid) === questionUid);
      if (targetQIdx === -1) return prev;

      const targetQ = { ...questions[targetQIdx] };
      const existingGroups = targetQ.groups || [];
      const isFirstGroup = existingGroups.length === 0;

      const gUid = generateUid("grp_");
      const gid = generateUid("gid_");

      const newGroup: KioskGroup = {
        gid,
        _uid: gUid,
        name: `Group ${existingGroups.length + 1}`,
        columns: targetQ.columns || targetQ.column_count || 2,
        options: isFirstGroup ? (targetQ.options || []).map(sanitizeOption) : [],
      };

      const updatedGroups = [...existingGroups, newGroup];
      questions[targetQIdx] = {
        ...targetQ,
        q_id: targetQ.q_id || targetQ._uid || generateUid("q_"),
        groups: updatedGroups,
        options: undefined, // do not duplicate options on question
      };
      return { ...prev, questions };
    });
  }, []);

  // Add a new group frame to the last question (called from the module bar sidebar button)
  const handleAddGroupToLastQuestion = useCallback(() => {
    setConfig((prev) => {
      const questions = [...(prev.questions || [])];
      if (questions.length === 0) return prev; // no question to add group to
      const lastIdx = questions.length - 1;
      const lastQ = questions[lastIdx];

      // Use existing explicit groups only — no auto-wrapping
      const currentGroups: KioskGroup[] =
        lastQ.groups && lastQ.groups.length > 0 ? lastQ.groups : [];

      const isFirstGroup = currentGroups.length === 0;
      const gUid = generateUid("grp_");
      const gid = generateUid("gid_");

      const newGroup: KioskGroup = {
        gid,
        _uid: gUid,
        name: `Group ${currentGroups.length + 1}`,
        columns: lastQ.columns || lastQ.column_count || 2,
        options: isFirstGroup ? (lastQ.options || []).map(sanitizeOption) : [],
      };

      const updatedGroups = [...currentGroups, newGroup];
      questions[lastIdx] = {
        ...lastQ,
        q_id: lastQ.q_id || lastQ._uid || generateUid("q_"),
        groups: updatedGroups,
        options: undefined, // do not duplicate options on question
      };
      return { ...prev, questions };
    });
  }, []);

  const handleUpdateQuestion = useCallback((questionUid: string, updates: Partial<KioskQuestion>) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) =>
        (q.q_id || q._uid) === questionUid ? { ...q, ...updates } : q
      ),
    }));
  }, []);

  const handleDeleteQuestion = useCallback((questionUid: string) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).filter((q) => (q.q_id || q._uid) !== questionUid),
    }));
  }, []);

  const handleDuplicateQuestion = useCallback((question: KioskQuestion) => {
    const newQId = generateUid("q_");
    const duplicatedGroups = question.groups
      ? question.groups.map((g) => {
          const newGid = generateUid("gid_");
          const newGrpUid = generateUid("grp_");
          const opts = (g.options || []).map((opt) => ({
            ...opt,
            uid: generateUid("opt_"),
            _uid: generateUid("opt_"),
            id: null,
            gid: newGid,
            group_uid: newGrpUid,
          }));
          return {
            ...g,
            gid: newGid,
            _uid: newGrpUid,
            options: opts,
          };
        })
      : undefined;

    const duplicatedOptions = duplicatedGroups
      ? undefined
      : (question.options || []).map((opt) => ({
          ...opt,
          uid: generateUid("opt_"),
          _uid: generateUid("opt_"),
          id: null,
        }));

    const duplicated: KioskQuestion = {
      ...question,
      q_id: newQId,
      _uid: newQId,
      id: null,
      label: `${question.label || "Question"} (Copy)`,
      api_name: `${question.api_name || "question"}_copy`,
      groups: duplicatedGroups,
      options: duplicatedOptions,
    };

    setConfig((prev) => {
      const current = [...(prev.questions || [])];
      const idx = current.findIndex((q) => (q.q_id || q._uid) === (question.q_id || question._uid));
      if (idx !== -1) {
        current.splice(idx + 1, 0, duplicated);
      } else {
        current.push(duplicated);
      }
      return { ...prev, questions: current };
    });
  }, []);

  // Option Management (Radio, Checkbox, Color, Color Swatch, Image Radio, or Input Field)
  const handleAddOption = useCallback(
    (
      questionUid: string,
      droppedItem?: {
        field_type?: "radio" | "checkbox" | "color" | "color_swatch" | "image_radio" | "input";
        defaultConfig?: Partial<KioskOption>;
        targetGroupUid?: string;
      }
    ) => {
      const fieldType = (droppedItem?.field_type || "radio") as
        | "radio"
        | "checkbox"
        | "color"
        | "color_swatch"
        | "image_radio"
        | "input";
      const typeDef = KIOSK_FIELD_TYPES[fieldType] ?? KIOSK_FIELD_TYPES.radio;
      const defaultOpt = droppedItem?.defaultConfig || typeDef.defaultConfig();
      const isColorType = fieldType === "color" || fieldType === "color_swatch";
      const isRadioOrCheckbox =
        fieldType === "radio" || fieldType === "checkbox" || fieldType === "image_radio";
      const isImageRadio = fieldType === "image_radio";

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
          : fieldType === "input"
          ? "Input Field"
          : "Radio Option");

      const apiName = defaultOpt.api_name || deriveApiNameFromLabel(label);

      let initialValue = defaultOpt.value;
      if (isRadioOrCheckbox) {
        initialValue = apiName;
      } else if (isColorType) {
        initialValue = defaultOpt.color || (fieldType === "color_swatch" ? "#0EA5E9" : "#2563EB");
      } else if (fieldType === "input") {
        initialValue = "";
      }

      const optUid = generateUid("opt_");
      const newOption: KioskOption = {
        uid: optUid,
        _uid: optUid,
        id: null,
        label,
        subLabel: defaultOpt.subLabel || "",
        api_name: apiName,
        value: initialValue || apiName,
        color:
          defaultOpt.color ||
          (isColorType
            ? fieldType === "color_swatch"
              ? "#0EA5E9"
              : "#2563EB"
            : undefined),
        price: defaultOpt.price || "",
        image: defaultOpt.image || "",
        ...(isImageRadio && defaultOpt.placement_mode
          ? {
              placement_mode: defaultOpt.placement_mode,
              placement_position: defaultOpt.placement_position || undefined,
              placement: defaultOpt.placement || undefined,
            }
          : {}),
        field_type: fieldType,
        input_type: defaultOpt.input_type || (fieldType === "input" ? "text" : undefined),
        placeholder: defaultOpt.placeholder || (fieldType === "input" ? "Enter value here..." : undefined),
        required: defaultOpt.required ?? false,
      };

      setConfig((prev) => ({
        ...prev,
        questions: (prev.questions || []).map((q) => {
          if ((q.q_id || q._uid) !== questionUid) return q;

          const hasExplicitGroups = q.groups && q.groups.length > 0;
          const targetGroupUid = droppedItem?.targetGroupUid;

          if (hasExplicitGroups) {
            // Add into a specific group (or last group if none specified)
            const groups = q.groups!;
            const targetGroup = targetGroupUid
              ? groups.find((g) => (g.gid || g._uid) === targetGroupUid) || groups[groups.length - 1]
              : groups[groups.length - 1];

            newOption.gid = targetGroup.gid || targetGroup._uid;
            newOption.group_uid = targetGroup._uid || targetGroup.gid;
            newOption.group_name = targetGroup.name;

            const updatedGroups = groups.map((g) =>
              (g.gid || g._uid) === (targetGroup.gid || targetGroup._uid)
                ? { ...g, options: [...(g.options || []), newOption] }
                : g
            );

            return {
              ...q,
              groups: updatedGroups,
              options: undefined, // DO NOT duplicate options on question when groups exist
            };
          } else {
            // No groups — add directly to question.options
            return {
              ...q,
              options: [...(q.options || []), newOption],
            };
          }
        }),
      }));
    },
    []
  );

  const handleEditOption = useCallback((option: KioskOption, questionUid: string) => {
    setDraftOption({ ...option });
    setEditingOptionModal({ option, questionUid });
  }, []);

  const handleSaveOptionConfig = useCallback((updatedOption: KioskOption) => {
    if (!editingOptionModal) return;
    const { questionUid } = editingOptionModal;

    const ft = updatedOption.field_type || "radio";
    const normalizedOption = sanitizeOption({ ...updatedOption });
    if (ft === "radio" || ft === "checkbox" || ft === "image_radio") {
      normalizedOption.value = normalizedOption.api_name || normalizedOption.value || "";
    } else if (ft === "color" || ft === "color_swatch") {
      normalizedOption.value = normalizedOption.color || normalizedOption.value || "#2563EB";
    }

    const optId = normalizedOption.uid || normalizedOption._uid;

    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if ((q.q_id || q._uid) !== questionUid) return q;
        const updatedOptions = q.options
          ? q.options.map((opt) =>
              (opt.uid || opt._uid) === optId ? normalizedOption : opt
            )
          : undefined;
        const updatedGroups = q.groups
          ? q.groups.map((g) => ({
              ...g,
              options: (g.options || []).map((opt) =>
                (opt.uid || opt._uid) === optId ? normalizedOption : opt
              ),
            }))
          : undefined;
        return {
          ...q,
          options: updatedOptions,
          groups: updatedGroups,
        };
      }),
    }));
    setEditingOptionModal(null);
    setDraftOption(null);
  }, [editingOptionModal]);

  const handleDeleteOption = useCallback((questionUid: string, optionUid: string) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if ((q.q_id || q._uid) !== questionUid) return q;
        const updatedOptions = q.options
          ? q.options.filter((opt) => (opt.uid || opt._uid) !== optionUid)
          : undefined;
        const updatedGroups = q.groups
          ? q.groups.map((g) => ({
              ...g,
              options: (g.options || []).filter((opt) => (opt.uid || opt._uid) !== optionUid),
            }))
          : undefined;
        return {
          ...q,
          options: updatedOptions,
          groups: updatedGroups,
        };
      }),
    }));
  }, []);

  const handleDuplicateOption = useCallback((questionUid: string, option: KioskOption) => {
    const isRadioOrCb =
      option.field_type === "radio" ||
      option.field_type === "checkbox" ||
      option.field_type === "image_radio";
    const newApiName = `${option.api_name || "option"}_copy`;
    const newOptUid = generateUid("opt_");

    const duplicated: KioskOption = sanitizeOption({
      ...option,
      uid: newOptUid,
      _uid: newOptUid,
      id: null,
      label: `${option.label || "Option"} (Copy)`,
      api_name: newApiName,
      value: isRadioOrCb
        ? newApiName
        : option.field_type === "input"
        ? ""
        : option.value || option.color || "choice",
    });

    const targetOptId = option.uid || option._uid;

    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if ((q.q_id || q._uid) !== questionUid) return q;
        const opts = q.options ? [...q.options] : undefined;
        if (opts) {
          const idx = opts.findIndex((opt) => (opt.uid || opt._uid) === targetOptId);
          if (idx !== -1) {
            opts.splice(idx + 1, 0, duplicated);
          } else {
            opts.push(duplicated);
          }
        }

        const updatedGroups = q.groups
          ? q.groups.map((g) => {
              const grpOpts = [...(g.options || [])];
              const gIdx = grpOpts.findIndex((opt) => (opt.uid || opt._uid) === targetOptId);
              if (gIdx !== -1) {
                grpOpts.splice(gIdx + 1, 0, duplicated);
              }
              return { ...g, options: grpOpts };
            })
          : undefined;

        return { ...q, options: opts, groups: updatedGroups };
      }),
    }));
  }, []);

  const handleMoveOption = useCallback((questionUid: string, fromUid: string, toIndex: number) => {
    setConfig((prev) => ({
      ...prev,
      questions: (prev.questions || []).map((q) => {
        if ((q.q_id || q._uid) !== questionUid) return q;
        const allOpts = q.options ? [...q.options] : undefined;
        if (allOpts) {
          const fromIndex = allOpts.findIndex((opt) => (opt.uid || opt._uid) === fromUid);
          if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
            const [moved] = allOpts.splice(fromIndex, 1);
            allOpts.splice(toIndex, 0, moved);
          }
        }

        const updatedGroups = q.groups
          ? q.groups.map((g) => {
              const hasIt = (g.options || []).some((o) => (o.uid || o._uid) === fromUid);
              if (!hasIt) return g;
              const grpOpts = [...(g.options || [])];
              const gFromIdx = grpOpts.findIndex((o) => (o.uid || o._uid) === fromUid);
              if (gFromIdx === -1) return g;
              const [gMoved] = grpOpts.splice(gFromIdx, 1);
              const clampedTo = Math.max(0, Math.min(toIndex, grpOpts.length));
              grpOpts.splice(clampedTo, 0, gMoved);
              return { ...g, options: grpOpts };
            })
          : undefined;

        return { ...q, options: allOpts, groups: updatedGroups };
      }),
    }));
  }, []);

  // Top Action Handlers
  const handleSaveOnly = () => {
    const finalConfig = sanitizeConfig(config);
    console.log("==================== KIOSK BUILDER SAVE PAYLOAD ====================");
    console.log("Kiosk Payload Object:", finalConfig);
    console.log("Kiosk Payload JSON:\n", JSON.stringify(finalConfig, null, 2));
    console.log("====================================================================");
    onSave?.(finalConfig);
    toastSuccess("Kiosk saved successfully");
  };

  const handleSaveAndClose = () => {
    const finalConfig = sanitizeConfig(config);
    console.log("==================== KIOSK BUILDER SAVE & CLOSE PAYLOAD ============");
    console.log("Kiosk Payload Object:", finalConfig);
    console.log("Kiosk Payload JSON:\n", JSON.stringify(finalConfig, null, 2));
    console.log("====================================================================");
    onSave?.(finalConfig);
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
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-100 p-0.5 dark:border-slate-800 dark:bg-slate-800">
            <button
              onClick={() => setActiveTab("form")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "form"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
              }`}
            >
              Form
            </button>
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeTab === "preview"
                  ? "bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white"
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
              onAddGroup={handleAddGroupToLastQuestion}
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
                        onAddGroupToQuestion={handleAddGroupToQuestion}
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
          /* Full Live Preview Mode */
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
                  config={previewConfig}
                  livePreviewOptions={livePreviewOptions}
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
            questionUid={editingOptionModal.questionUid}
            questions={previewConfig.questions || []}
            onSave={handleSaveOptionConfig}
            onClose={() => {
              setEditingOptionModal(null);
              setDraftOption(null);
            }}
            onDraftChange={setDraftOption}
          />
        )}
      </div>
    </DndProvider>
  );
};