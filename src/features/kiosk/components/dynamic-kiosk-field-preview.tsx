"use client";

import React, { useRef } from "react";
import { useDrag, useDrop } from "react-dnd";
import {
  CreditCard,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Image as ImageIcon,
} from "lucide-react";
import { DataTableRowActionsMenu } from "@/shared/ui/data-table-row-actions-menu";
import type { KioskField } from "../types/kiosk.types";

interface DynamicKioskFieldPreviewProps {
  field: KioskField;
  sectionUid: string;
  index: number;
  onEdit: (field: KioskField, sectionUid: string) => void;
  onDelete: (sectionUid: string, fieldUid: string) => void;
  onDuplicate: (sectionUid: string, field: KioskField) => void;
  onMove: (sectionUid: string, fromUid: string, toIndex: number) => void;
}

const DND_KIOSK_FIELD = "KIOSK_FIELD";

export const DynamicKioskFieldPreview: React.FC<DynamicKioskFieldPreviewProps> = ({
  field,
  sectionUid,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  onMove,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: DND_KIOSK_FIELD,
      item: { uid: field._uid, sectionUid, index },
      collect: (monitor) => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [field._uid, sectionUid, index]
  );

  const [, drop] = useDrop(
    () => ({
      accept: DND_KIOSK_FIELD,
      hover(item: { uid: string; sectionUid: string; index: number }, monitor) {
        if (!ref.current || item.sectionUid !== sectionUid || item.uid === field._uid) {
          return;
        }

        const hoverBoundingRect = ref.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        if (!clientOffset) return;
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        if (item.index < index && hoverClientY < hoverMiddleY) return;
        if (item.index > index && hoverClientY > hoverMiddleY) return;

        onMove(sectionUid, item.uid, index);
        item.index = index;
      },
    }),
    [sectionUid, field._uid, index, onMove]
  );

  drag(drop(ref));

  const colorAccent = field.color || "#2563EB";

  return (
    <div
      ref={ref}
      className={`group relative flex items-center justify-between rounded-md border border-slate-200 bg-white p-3.5 shadow-sm transition-all hover:border-slate-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 ${
        field.required ? "border-l-4" : ""
      }`}
      style={{
        opacity: isDragging ? 0.4 : 1,
        borderLeftColor: field.required ? "#EF4444" : undefined,
      }}
    >
      <div
        className="flex flex-1 cursor-pointer items-center gap-3 min-w-0"
        onClick={() => onEdit(field, sectionUid)}
      >
        {/* Visual icon/thumbnail */}
        {field.image ? (
          <div className="size-10 shrink-0 overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <img
              src={field.image}
              alt={field.field_label || field.label}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        ) : (
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg shadow-xs"
            style={{ backgroundColor: `${colorAccent}20`, color: colorAccent }}
          >
            <CreditCard className="size-5" />
          </div>
        )}

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
              {field.field_label || field.label || "Selection Card"}
            </span>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: colorAccent }}
              title={`Color: ${colorAccent}`}
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            <span className="font-mono text-[11px] truncate">{field.api_name || "api_key"}</span>
            <span>•</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] uppercase font-medium dark:bg-slate-700 dark:text-slate-300">
              {field.input_type || "card"}
            </span>
            {field.value && (
              <>
                <span>•</span>
                <span className="truncate max-w-[120px]">val: {field.value}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Field Actions Menu */}
      <div className="flex items-center gap-1 pl-2">
        <DataTableRowActionsMenu
          menuAriaLabel="Field options"
          items={[
            {
              id: "edit",
              label: "Configure Field",
              icon: Edit2,
              onSelect: () => onEdit(field, sectionUid),
            },
            {
              id: "duplicate",
              label: "Duplicate",
              icon: Copy,
              onSelect: () => onDuplicate(sectionUid, field),
            },
            {
              id: "delete",
              label: "Delete",
              icon: Trash2,
              tone: "danger",
              onSelect: () => onDelete(sectionUid, field._uid),
            },
          ]}
        />
      </div>
    </div>
  );
};
