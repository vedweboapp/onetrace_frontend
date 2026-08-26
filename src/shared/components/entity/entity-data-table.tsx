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

const DATE_COL_WIDTH = "min-w-[13.25rem] w-[13.25rem]";

function columnHeaderClassName<T>(column: EntityTableColumn<T>) {
  return cn(
    column.responsive && entityResponsiveClass(column.responsive),
    column.variant === "date" && DATE_COL_WIDTH,
    column.headerClassName,
  );
}

function columnCellClassName<T>(column: EntityTableColumn<T>, wrap: boolean): string | undefined {
  return cn(
    column.responsive && entityResponsiveClass(column.responsive),
    entityTableTdClassName(column, wrap),
    column.variant === "date" && DATE_COL_WIDTH,
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
      return "overflow-hidden tabular-nums whitespace-nowrap";
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
  /**
   * When false, table is content-height (pagination can sit directly under rows).
   * Default true fills remaining flex height on list pages.
   */
  fillHeight?: boolean;
};

/**
 * Entity list table: bordered Zoho/WMS chrome, sticky head, clip/wrap pinned to
 * the viewport corner (does not slide away on horizontal scroll).
 * With `fillHeight` (default), grows so list-page pagination can pin below the scroll body.
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
  fillHeight = true,
}: EntityDataTableProps<T>) {
  const clickable = !!onRowClick;
  const textMode = useDataTableTextModeStore((s) => s.textMode);
  const wrap = textMode === "wrap";
  const showEmptyMessage = rows.length === 0 && Boolean(emptyMessage);

  return (
    <div
      className={cn(
        "relative flex flex-col overflow-hidden",
        fillHeight ? "min-h-0 flex-1" : "w-full shrink-0",
      )}
    >
      {/* Pinned to the table viewport — stays put while the grid scrolls X/Y. */}
      {!hideTextModeToggle ? (
        <div className="pointer-events-none absolute right-1.5 top-1.5 z-30 sm:right-2 sm:top-2">
          <div className="pointer-events-auto rounded-md bg-slate-100/95 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm dark:bg-slate-800/95 dark:ring-slate-700">
            <DataTableTextModeToggle variant="header" className="shrink-0" />
          </div>
        </div>
      ) : null}

      <DataTableScroll
        className={cn(!fillHeight && "flex-none overflow-x-auto overflow-y-visible", scrollClassName)}
      >
        <DataTable className={cn("[&_thead_th:last-child]:pr-9", className)} textWrap={wrap}>
          <DataTableHead>
            <tr>
              {columns.map((col) => (
                <DataTableTh
                  key={col.id}
                  narrow={col.narrow && col.variant !== "selection"}
                  compact={col.variant === "selection"}
                  className={columnHeaderClassName(col)}
                >
                  {col.headerSrOnly ? <span className="sr-only">{col.header}</span> : col.header}
                </DataTableTh>
              ))}
            </tr>
          </DataTableHead>
          <DataTableBody>
            {showEmptyMessage ? (
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
