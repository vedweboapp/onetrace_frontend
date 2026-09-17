"use client";

import React from "react";
import { useDrag } from "react-dnd";
import { KIOSK_FIELD_TYPES, KioskFieldTypeDefinition } from "../types/kiosk-field-types";

const DraggablePaletteField: React.FC<{
  fieldTypeDef: KioskFieldTypeDefinition;
}> = ({ fieldTypeDef }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "KIOSK_PALETTE_FIELD",
    item: {
      field_type: fieldTypeDef.field_type,
      defaultConfig: fieldTypeDef.defaultConfig(),
    },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  const Icon = fieldTypeDef.icon;

  return (
    <div
      ref={drag as any}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-move transition-transform hover:scale-[1.02]"
    >
      <div className="flex w-full items-center gap-2.5 rounded-md border border-gray-200 bg-gray-50/80 px-3 py-2.5 text-left transition-all hover:border-gray-300 hover:bg-white dark:border-slate-800 dark:bg-slate-800/80 dark:hover:border-slate-700 dark:hover:bg-slate-800 select-none">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-white border border-gray-200 text-slate-700 shadow-2xs dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <Icon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
            {fieldTypeDef.label}
          </div>
          <div className="truncate text-[10px] text-slate-400 dark:text-slate-500">
            Drag to question section
          </div>
        </div>
      </div>
    </div>
  );
};

const DraggableAddQuestionButton: React.FC<{
  onAddQuestion?: () => void;
}> = ({ onAddQuestion }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ADD_QUESTION",
    item: { type: "ADD_QUESTION" },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag as any}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="w-full cursor-move"
    >
      <button
        type="button"
        onClick={onAddQuestion}
        className="flex h-10 w-full items-center justify-center rounded-md bg-black px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] dark:bg-white dark:text-black dark:hover:bg-white/90"
      >
        Add New Question
      </button>
    </div>
  );
};

interface KioskModuleBarProps {
  onAddQuestion?: () => void;
}

export const KioskModuleBar: React.FC<KioskModuleBarProps> = ({ onAddQuestion }) => {
  const fieldList = Object.values(KIOSK_FIELD_TYPES);

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Kiosk Options
        </h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Drag options into question sections
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="flex flex-col gap-2">
          {fieldList.map((fieldTypeDef) => (
            <DraggablePaletteField
              key={fieldTypeDef.field_type}
              fieldTypeDef={fieldTypeDef}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <DraggableAddQuestionButton onAddQuestion={onAddQuestion} />
      </div>
    </aside>
  );
};
