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
  Images,
  BarChart3,
  Home,
  ArrowUpDown,
  EllipsisIcon,
  Globe,
  LucideIcon,
  PenTool,
} from "lucide-react";
import { useDrag, useDrop } from "react-dnd";
import {
  DataTableRowActionsMenu,
} from "@/shared/ui/data-table-row-actions-menu";

const icons: Record<string, LucideIcon> = {
  single_line: Minus,
  email: Mail,
  phone: Phone,
  picklist: List,
  multi_select: ListChecks,
  date: Calendar,
  datetime: Clock,
  number: Hash,
  auto_number: ArrowUpDown,
  currency: DollarSign,
  decimal: Circle,
  percent: Percent,
  checkbox: CheckSquare,
  radio: Circle,
  url: Link,
  lookup: Search,
  formula: Calculator,
  user: User,
  file_upload: FileUp,
  image_upload: Image,
  multi_image_upload: Images,
  multi_images: Images,
  rollup_summary: BarChart3,
  address: Home,
  multi_select_lookup: ListChecks,
  long_integer: Hash,
  receiver_lookup: Home,
  country: Globe,
  signature: PenTool,
};

interface Field {
  _uid: string;
  field_type: string;
  field_label: string;
  api_name?: string;
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
      item: { _uid: field._uid, index, sectionUid, type: field.field_type },
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
        className="group border m-2 relative flex flex-col p-4 bg-gray-50/50 dark:bg-slate-800/50 hover:bg-gray-100/80 dark:hover:bg-slate-800 transition-all border-r border-gray-200 dark:border-slate-700 min-h-fit border-b"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-gray-800 dark:text-gray-100 flex items-center gap-1.5">
            {field.field_label || "Untitled Field"}
            {field.api_name && (
              <span className="text-xs font-normal text-gray-400 dark:text-gray-500">
                ({field.api_name})
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
                    type: field.field_type,
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
        <span className="font-medium text-gray-500 dark:text-gray-400 text-md">
          {field.field_type || "text"}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      className={`group relative ${field.required
          ? "border-l-2 border-l-red-500"
          : "border-dotted border-2"
        } flex items-center justify-between bg-gray-50 dark:bg-slate-800 rounded-[4px] border-gray-300 dark:border-slate-600 px-1 lg:px-5 py-1 lg:py-3 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md transition-all cursor-pointer min-w-0`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="font-medium text-gray-800 dark:text-gray-100 flex flex-col min-w-0 flex-1">
          <div className="flex flex-col lg:flex-row items-start lg:items-center gap-2 min-w-0 w-full">
            <span className="truncate block min-w-0 w-full lg:w-auto">
              {field.field_label || "Untitled Field"}
            </span>
            {/* {field.api_name && (
      <span className="text-[11px] font-normal text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-slate-700 px-1.5 py-0.5 rounded border border-gray-200 dark:border-slate-600 shrink-0">
        {field.api_name}
      </span>
    )} */}
          </div>
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
                type: field.field_type,
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
