"use client";

import React from "react";
import { useDrag } from "react-dnd";
import {
  CreditCard,
  MousePointerClick,
  CheckSquare,
  CircleDot,
  LucideIcon,
} from "lucide-react";

export interface KioskFieldPaletteItem {
  key: string;
  field_type: string;
  input_type: string;
  label: string;
  icon: LucideIcon;
  defaultColor?: string;
}

export const KIOSK_FIELDS_PALETTE: KioskFieldPaletteItem[] = [
  {
    key: "selection_card",
    field_type: "selection_card",
    input_type: "selection_card",
    label: "Selection Card",
    icon: CreditCard,
    defaultColor: "#2563EB",
  },
  {
    key: "action_card",
    field_type: "selection_card",
    input_type: "button",
    label: "Action Card",
    icon: MousePointerClick,
    defaultColor: "#10B981",
  },
  {
    key: "multi_card",
    field_type: "selection_card",
    input_type: "checkbox",
    label: "Multi Card",
    icon: CheckSquare,
    defaultColor: "#8B5CF6",
  },
  {
    key: "radio_card",
    field_type: "selection_card",
    input_type: "radio",
    label: "Radio Card",
    icon: CircleDot,
    defaultColor: "#F59E0B",
  },
];

const DraggablePaletteField: React.FC<{
  item: KioskFieldPaletteItem;
  onAdd?: () => void;
}> = ({ item, onAdd }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "KIOSK_PALETTE_FIELD",
    item: {
      field_type: item.field_type,
      input_type: item.input_type,
      label: item.label,
      color: item.defaultColor,
    },
    collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
  }));

  const Icon = item.icon;

  return (
    <div
      ref={drag as any}
      onClick={onAdd}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className="cursor-move transition-transform hover:scale-[1.02]"
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-3 text-left transition-all hover:border-gray-400 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600 dark:hover:bg-slate-700"
      >
        <Icon size={17} className="shrink-0 text-gray-600 dark:text-gray-400" />
        <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
          {item.label}
        </span>
      </button>
    </div>
  );
};

const DraggableAddSectionButton: React.FC<{
  onAddSection?: () => void;
}> = ({ onAddSection }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ADD_SECTION",
    item: { type: "ADD_SECTION" },
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
        onClick={onAddSection}
        className="flex h-10 w-full items-center justify-center rounded-md bg-black px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-black/90 active:scale-[0.99] dark:bg-white dark:text-black dark:hover:bg-white/90"
      >
        Add New Section
      </button>
    </div>
  );
};

interface KioskModuleBarProps {
  onAddSection?: () => void;
  onAddFieldDirectly?: (item: KioskFieldPaletteItem) => void;
}

export const KioskModuleBar: React.FC<KioskModuleBarProps> = ({
  onAddSection,
  onAddFieldDirectly,
}) => {
  return (
    <aside className="flex h-full w-[272px] shrink-0 flex-col border-r border-gray-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-gray-200 px-4 py-3 dark:border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Kiosk Fields
        </h3>
        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          Drag fields or sections to the canvas
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2">
          {KIOSK_FIELDS_PALETTE.map((field) => (
            <DraggablePaletteField
              key={field.key}
              item={field}
              onAdd={() => onAddFieldDirectly?.(field)}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <DraggableAddSectionButton onAddSection={onAddSection} />
      </div>
    </aside>
  );
};
