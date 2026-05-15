import React, { useRef } from "react";
import {
  Minus,
  AlignLeft,
  Mail,
  Phone,
  List,
  ListChecks,
  Calendar,
  Clock,
  Hash,
  DollarSign,
  Circle,
  Percent,
  CheckSquare,
  Link,
  Search,
  Calculator,
  User,
  FileUp,
  Image,
  BarChart3,
  Home,
  ArrowUpDown,
  EllipsisIcon,
  Globe,
  LucideIcon,
} from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import {
  DataTableRowActionsMenu,
} from "@/shared/ui/data-table-row-actions-menu";

const icons: Record<string, LucideIcon> = {
  text: Minus,
  "multi-text": AlignLeft,
  email: Mail,
  phone: Phone,
  "pick-list": List,
  "multi-select": ListChecks,
  date: Calendar,
  "date-time": Clock,
  number: Hash,
  "auto-number": ArrowUpDown,
  currency: DollarSign,
  decimal: Circle,
  percent: Percent,
  checkbox: CheckSquare,
  url: Link,
  lookup: Search,
  formula: Calculator,
  user: User,
  "file-upload": FileUp,
  "image-upload": Image,
  "image_uploader": Image,
  "rollup-summary": BarChart3,
  address: Home,
  "multi-select-lookup": ListChecks,
  "long-integer": Hash,
  "pick_list": List,
  "multi_line": AlignLeft,
  "multi_select": ListChecks,
  "date_time": Clock,
  "auto_number": ArrowUpDown,
  "file_upload": FileUp,
  "rollup_summary": BarChart3,
  "multi_select_lookup": ListChecks,
  "long_integer": Hash,
  country: Globe,
};

interface Field {
  _uid: string;
  type: string;
  label: string;
  name?: string;
  required?: boolean;
  is_deleted?: boolean;
  [key: string]: any;
}

interface DynamicFieldPreviewProps {
  field: Field;
  modalsetter: (modal: any) => void;
  sectionUid: string;
  deleteField: (sectionUid: string, fieldUid: string) => void;
  index: number;
  moveField: (sectionUid: string, fromUid: string, toIndex: number) => void;
  isSubform?: boolean;
}

export default function DynamicFieldPreview({
  field,
  modalsetter,
  sectionUid,
  deleteField,
  index,
  moveField,
  isSubform = false,
}: DynamicFieldPreviewProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag(
    () => ({
      type: "FIELD",
      item: { _uid: field._uid, index, sectionUid, type: field.type },
      collect: (monitor) => ({ isDragging: !!monitor.isDragging() }),
    }),
    [field._uid, index, sectionUid]
  );

  const [, drop] = useDrop(
    () => ({
      accept: "FIELD",
      hover: (item: any) => {
        if (!item._uid) return;
        if (item._uid === field._uid) return;
        if (item.sectionUid !== sectionUid) return;
        const dragIndex = item.index;
        const hoverIndex = index;
        if (dragIndex === hoverIndex) return;
        moveField(sectionUid, item._uid, hoverIndex);
        item.index = hoverIndex;
      },
    }),
    [field._uid, index, sectionUid, moveField]
  );

  drag(drop(ref));

  if (isSubform) {
    return (
      <div
        ref={ref}
        style={{ opacity: isDragging ? 0.5 : 1 }}
        className={`group border m-2 relative flex flex-col p-4 bg-gray-50/50 hover:bg-gray-100/80 transition-all border-r border-gray-200 min-h-fit border-b `}
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800 flex items-center gap-1.5">
            {field.label || "Untitled Field"}
            {field.name && (
              <span className="text-xs font-normal text-gray-400">
                ({field.name})
              </span>
            )}
          </span>
          <DataTableRowActionsMenu
            menuAriaLabel="Field Options"
            items={[
              {
                id: "edit",
                label: "Edit properties",
                onSelect: () =>
                  modalsetter({
                    type: field.type,
                    config: field,
                    sectionUid: sectionUid,
                    _fieldUid: field._uid,
                  }),
              },
              {
                id: "remove",
                label: "Remove Field",
                tone: "danger",
                onSelect: () => deleteField(sectionUid, field._uid),
              },
            ]}
          />
        </div>
        <span className="font-medium text-gray-500 text-md">
          {field.type || "text"}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`group relative ${
        field.required
          ? "border-l-2 border-l-red-500"
          : "border-dotted border-2"
      } flex items-center justify-between bg-gray-50 rounded-[4px] border-gray-300  px-5 py-3 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="flex items-center gap-3">
        <div className="font-medium text-gray-800 flex flex-col">
          <span className="flex items-center gap-2">
            {field.label || "Untitled Field"}
            {field.name && (
              <span className="text-[11px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                {field.name}
              </span>
            )}
          </span>
          <span className="text-sm text-gray-500">{field.type || "text"}</span>
        </div>
      </div>
      <DataTableRowActionsMenu
        menuAriaLabel="Field Options"
        items={[
          {
            id: "edit",
            label: "Edit properties",
            onSelect: () =>
              modalsetter({
                type: field.type,
                config: field,
                sectionUid: sectionUid,
                _fieldUid: field._uid,
              }),
          },
          {
            id: "remove",
            label: "Remove Field",
            tone: "danger",
            onSelect: () => deleteField(sectionUid, field._uid),
          },
        ]}
      />
    </div>
  );
}
