"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import {
  DetailEntityLink,
  entityNameLinkClassName,
} from "@/shared/components/entity/detail-entity-link";
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
import { DataTableTextModeToggle } from "@/shared/ui/data-table-text-mode-toggle";
import { useDataTableTextModeStore } from "@/shared/ui/data-table-text-mode.store";
import { formatSettingsDetailDate } from "@/shared/components/settings/settings-detail-view";

/** Sets native `title` when clipped cell text overflows (ellipsis). */
function TableTruncatedCell({
  children,
  title,
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [tooltip, setTooltip] = React.useState<string | undefined>(undefined);

  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const explicit = title?.trim();
    if (explicit) {
      setTooltip(explicit);
      return;
    }

    const text = el.textContent?.trim();
    if (!text) {
      setTooltip(undefined);
      return;
    }

    const clipped = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1;
    setTooltip(clipped ? text : undefined);
  }, [children, title]);

  return (
    <span ref={ref} className={cn("block min-w-0 truncate", className)} title={tooltip}>
      {children}
    </span>
  );
}

const TRUNCATE_MAX = {
  sm: "max-w-[14rem]",
  md: "max-w-[16rem]",
  lg: "max-w-[20rem]",
} as const;

function formatEntityTableDate(
  value: string | Date | number | null | undefined,
  dateFmt: Intl.DateTimeFormat,
): string {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime()) || value.getFullYear() < 1980) return "—";
    return dateFmt.format(value);
  }
  return formatSettingsDetailDate(dateFmt, value);
}

function columnHeaderClassName<T>(column: EntityTableColumn<T>) {
  return cn(column.responsive && entityResponsiveClass(column.responsive), column.headerClassName);
}

function columnCellClassName<T>(column: EntityTableColumn<T>, wrap: boolean): string | undefined {
  return cn(
    column.responsive && entityResponsiveClass(column.responsive),
    entityTableTdClassName(column, wrap),
    column.cellClassName,
  );
}

function wrapClippedCell(content: ReactNode, wrap: boolean, title?: string): ReactNode {
  if (wrap) {
    return <span className="block whitespace-normal break-words">{content}</span>;
  }
  return <TableTruncatedCell title={title}>{content}</TableTruncatedCell>;
}

function renderEntityTableCell<T>(column: EntityTableColumn<T>, row: T, wrap: boolean): ReactNode {
  switch (column.variant) {
    case "primary":
      return wrapClippedCell(column.value(row), wrap);
    case "text":
      return wrapClippedCell(column.value(row), wrap);
    case "truncate": {
      const title = column.title?.(row);
      return wrapClippedCell(column.value(row), wrap, title);
    }
    case "link": {
      const label = column.label(row)?.trim() || "—";
      const href = column.href?.(row)?.trim() || null;
      const title = column.title?.(row) ?? (label !== "—" ? label : undefined);
      const empty = label === "—";
      const content =
        !empty && href ? (
          <DetailEntityLink href={href} className="font-medium" onClick={(e) => e.stopPropagation()}>
            {label}
          </DetailEntityLink>
        ) : empty ? (
          <span className="text-slate-400 dark:text-slate-500">—</span>
        ) : (
          <span className={cn(entityNameLinkClassName, "font-medium")}>{label}</span>
        );
      return wrapClippedCell(content, wrap, title);
    }
    case "phone": {
      const raw = column.value(row);
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      return wrapClippedCell(trimmed || "—", wrap, trimmed || undefined);
    }
    case "mono":
      return wrapClippedCell(column.value(row), wrap);
    case "tabular":
      return wrapClippedCell(column.value(row), wrap);
    case "muted":
      return wrapClippedCell(column.value(row), wrap);
    case "date":
      return formatEntityTableDate(column.value(row), column.dateFmt);
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

function entityTableTdClassName<T>(column: EntityTableColumn<T>, wrap: boolean): string | undefined {
  switch (column.variant) {
    case "primary":
      return cn(
        "font-semibold",
        entityNameLinkClassName,
        wrap ? "whitespace-normal break-words" : "truncate",
      );
    case "truncate": {
      if (wrap) return "whitespace-normal break-words";
      const max = column.maxWidth ? TRUNCATE_MAX[column.maxWidth] : TRUNCATE_MAX.sm;
      return cn(max, "truncate");
    }
    case "link": {
      if (wrap) return "whitespace-normal break-words";
      const max = column.maxWidth ? TRUNCATE_MAX[column.maxWidth] : TRUNCATE_MAX.sm;
      return cn(max, "truncate");
    }
    case "text":
    case "muted":
    case "phone":
      return wrap ? "whitespace-normal break-words" : "truncate";
    case "mono":
      return "font-mono text-xs";
    case "tabular":
      return "tabular-nums";
    case "date":
      return "tabular-nums whitespace-nowrap";
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
  /** Hide the clip/wrap control (e.g. embedded mini tables). */
  hideTextModeToggle?: boolean;
};

/**
 * Entity list table: bordered Zoho/WMS chrome, sticky head, clip/wrap in header corner.
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
  hideTextModeToggle = false,
}: EntityDataTableProps<T>) {
  const clickable = !!onRowClick;
  const textMode = useDataTableTextModeStore((s) => s.textMode);
  const wrap = textMode === "wrap";
  const lastColIndex = columns.length - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <DataTableScroll className={scrollClassName}>
        <DataTable className={className} textWrap={wrap}>
          <DataTableHead>
            <tr>
              {columns.map((col, index) => {
                const isLast = index === lastColIndex;
                const showMode = isLast && !hideTextModeToggle;
                return (
                  <DataTableTh
                    key={col.id}
                    narrow={col.narrow && col.variant !== "selection"}
                    compact={col.variant === "selection"}
                    className={columnHeaderClassName(col)}
                  >
                    {showMode ? (
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">
                          {col.headerSrOnly ? <span className="sr-only">{col.header}</span> : col.header}
                        </span>
                        <DataTableTextModeToggle variant="header" className="shrink-0" />
                      </div>
                    ) : col.headerSrOnly ? (
                      <span className="sr-only">{col.header}</span>
                    ) : (
                      col.header
                    )}
                  </DataTableTh>
                );
              })}
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
                          narrow={col.narrow && col.variant !== "selection"}
                          compact={col.variant === "selection"}
                          className={columnCellClassName(col, wrap)}
                          onPointerDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                          onMouseDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                          onClick={isolateClick ? (e) => e.stopPropagation() : undefined}
                          onKeyDown={isolateClick ? (e) => e.stopPropagation() : undefined}
                        >
                          {renderEntityTableCell(col, row, wrap)}
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
    </div>
  );
}
