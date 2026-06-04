"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import type { EntityTableColumn } from "@/shared/components/entity/entity-table-columns";
import { entityResponsiveClass } from "@/shared/components/entity/entity-table-columns";
import { ActiveStatusBadge } from "@/shared/ui";
import {
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
} from "@/shared/ui";

const TRUNCATE_MAX = {
  sm: "max-w-[14rem]",
  md: "max-w-[16rem]",
  lg: "max-w-[20rem]",
} as const;

function columnHeaderClassName<T>(column: EntityTableColumn<T>) {
  return cn(column.responsive && entityResponsiveClass(column.responsive), column.headerClassName);
}

function columnCellClassName<T>(column: EntityTableColumn<T>) {
  return cn(
    column.responsive && entityResponsiveClass(column.responsive),
    entityTableTdClassName(column),
    column.cellClassName,
  );
}

function renderEntityTableCell<T>(column: EntityTableColumn<T>, row: T): ReactNode {
  switch (column.variant) {
    case "primary":
      return column.value(row);
    case "text":
      return column.value(row);
    case "truncate": {
      const title = column.title?.(row);
      return (
        <span className="block truncate" title={title}>
          {column.value(row)}
        </span>
      );
    }
    case "phone": {
      const raw = column.value(row);
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      return trimmed || "—";
    }
    case "mono":
      return column.value(row);
    case "tabular":
      return column.value(row);
    case "muted":
      return column.value(row);
    case "date":
      return column.dateFmt.format(new Date(column.value(row)));
    case "status":
      return (
        <ActiveStatusBadge
          active={column.isActive(row)}
          label={column.isActive(row) ? column.activeLabel : column.inactiveLabel}
        />
      );
    case "actions":
    case "selection":
      return column.render(row);
    case "custom":
      return column.render(row);
    default:
      return null;
  }
}

function entityTableTdClassName<T>(column: EntityTableColumn<T>): string | undefined {
  switch (column.variant) {
    case "primary":
      return "font-semibold text-slate-900 dark:text-slate-100";
    case "truncate": {
      const max = column.maxWidth ? TRUNCATE_MAX[column.maxWidth] : TRUNCATE_MAX.sm;
      return cn(max, "truncate");
    }
    case "mono":
      return "font-mono text-xs";
    case "tabular":
      return "tabular-nums";
    case "muted":
      return "text-slate-500 dark:text-slate-400";
    case "date":
      return "tabular-nums";
    default:
      return undefined;
  }
}

export type EntityDataTableProps<T extends { id: number | string }> = {
  columns: EntityTableColumn<T>[];
  rows: T[];
  /** Row click (entire row except actions column). */
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string | undefined;
  /** Sets `data-list-row-id` for list highlight return navigation. */
  rowHighlightId?: (row: T) => number | string;
  emptyMessage?: ReactNode;
  className?: string;
  scrollClassName?: string;
};

/**
 * Entity list table: shared header + body styling. Features pass `columns` and `rows` only.
 */
export function EntityDataTable<T extends { id: number | string }>({
  columns,
  rows,
  onRowClick,
  getRowClassName,
  rowHighlightId,
  emptyMessage,
  className,
  scrollClassName,
}: EntityDataTableProps<T>) {
  const clickable = !!onRowClick;

  return (
    <DataTableScroll className={scrollClassName}>
      <DataTable className={className}>
        <DataTableHead>
          <tr>
            {columns.map((col) => (
              <DataTableTh key={col.id} narrow={col.narrow} className={columnHeaderClassName(col)}>
                {col.headerSrOnly ? <span className="sr-only">{col.header}</span> : col.header}
              </DataTableTh>
            ))}
          </tr>
        </DataTableHead>
        <DataTableBody>
          {rows.length === 0 && emptyMessage ? (
            <DataTableEmptyRow colSpan={columns.length} message={emptyMessage} />
          ) : (
            rows.map((row) => {
              const highlightId = rowHighlightId?.(row) ?? row.id;
              return (
                <DataTableRow
                  key={row.id}
                  data-list-row-id={highlightId}
                  className={getRowClassName?.(row)}
                  clickable={clickable}
                  onClick={clickable ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => {
                    const isolateClick = col.variant === "actions" || col.variant === "selection";
                    return (
                      <DataTableTd
                        key={col.id}
                        narrow={col.narrow}
                        className={columnCellClassName(col)}
                        onPointerDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                        onMouseDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                        onClick={isolateClick ? (e) => e.stopPropagation() : undefined}
                        onKeyDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                      >
                        {renderEntityTableCell(col, row)}
                      </DataTableTd>
                    );
                  })}
                </DataTableRow>
              );
            })
          )}
        </DataTableBody>
      </DataTable>
    </DataTableScroll>
  );
}
