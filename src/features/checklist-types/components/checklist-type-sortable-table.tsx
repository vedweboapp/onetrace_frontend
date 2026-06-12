"use client";

import * as React from "react";
import { GripVertical } from "lucide-react";
import type { ChecklistType } from "@/features/checklist-types/types/checklist-type.types";
import {
  formatChecklistTypeLabel,
  projectTypeLabelFromChecklistRow,
} from "@/features/checklist-types/utils/checklist-type-display.util";
import { ActiveStatusBadge, DataTableRowActionsMenu } from "@/shared/ui";
import {
  DataTable,
  DataTableBody,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  DataTableHead,
} from "@/shared/ui/data-table";
import { cn } from "@/core/utils/http.util";

const CHECKLIST_DND_TYPE = "application/x-checklist-type-order";

type RowMenuItem = React.ComponentProps<typeof DataTableRowActionsMenu>["items"][number];

type Props = {
  items: ChecklistType[];
  reordering: boolean;
  dragFromIndex: number | null;
  onDragFromIndexChange: (index: number | null) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRowClick: (row: ChecklistType) => void;
  rowMenuItems: (row: ChecklistType) => RowMenuItem[];
  labels: {
    sequence: string;
    title: string;
    projectType: string;
    required: string;
    requiredYes: string;
    requiredNo: string;
    status: string;
    active: string;
    inactive: string;
    created: string;
    actions: string;
    openRowActions: string;
  };
  formatCreated: (row: ChecklistType) => React.ReactNode;
};

export function ChecklistTypeSortableTable({
  items,
  reordering,
  dragFromIndex,
  onDragFromIndexChange,
  onReorder,
  onRowClick,
  rowMenuItems,
  labels,
  formatCreated,
}: Props) {
  return (
    <DataTableScroll>
      <DataTable>
        <DataTableHead>
          <tr>
            <DataTableTh narrow className="w-16">
              <span className="sr-only">{labels.sequence}</span>
            </DataTableTh>
            <DataTableTh>{labels.title}</DataTableTh>
            <DataTableTh className="hidden sm:table-cell">{labels.projectType}</DataTableTh>
            <DataTableTh>{labels.required}</DataTableTh>
            <DataTableTh>{labels.status}</DataTableTh>
            <DataTableTh className="hidden lg:table-cell">{labels.created}</DataTableTh>
            <DataTableTh narrow>
              <span className="sr-only">{labels.actions}</span>
            </DataTableTh>
          </tr>
        </DataTableHead>
        <DataTableBody>
          {items.map((row, index) => (
            <DataTableRow
              key={row.id}
              data-list-row-id={row.id}
              draggable={!reordering}
              onDragStart={(e) => {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData(CHECKLIST_DND_TYPE, String(index));
                onDragFromIndexChange(index);
              }}
              onDragEnd={() => onDragFromIndexChange(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const raw = e.dataTransfer.getData(CHECKLIST_DND_TYPE);
                const from = Number.parseInt(raw, 10);
                if (Number.isFinite(from)) onReorder(from, index);
              }}
              className={cn(dragFromIndex === index && "opacity-50", reordering && "pointer-events-none")}
              clickable
              onClick={() => onRowClick(row)}
            >
              <DataTableTd narrow>
                <div
                  className="flex items-center gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <GripVertical
                    className="size-4 shrink-0 cursor-grab text-slate-400 active:cursor-grabbing"
                    aria-hidden
                  />
                  <span className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                    {row.sequence}
                  </span>
                </div>
              </DataTableTd>
              <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                {formatChecklistTypeLabel(row)}
              </DataTableTd>
              <DataTableTd className="hidden sm:table-cell text-slate-600 dark:text-slate-300">
                {projectTypeLabelFromChecklistRow(row)}
              </DataTableTd>
              <DataTableTd>
                {row.is_required ? (
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                    {labels.requiredYes}
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 dark:text-slate-400">{labels.requiredNo}</span>
                )}
              </DataTableTd>
              <DataTableTd>
                <ActiveStatusBadge
                  active={row.is_active}
                  label={row.is_active ? labels.active : labels.inactive}
                />
              </DataTableTd>
              <DataTableTd className="hidden lg:table-cell">{formatCreated(row)}</DataTableTd>
              <DataTableTd
                narrow
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              >
                <DataTableRowActionsMenu menuAriaLabel={labels.openRowActions} items={rowMenuItems(row)} />
              </DataTableTd>
            </DataTableRow>
          ))}
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}
