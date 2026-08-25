import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Outer scroll boundary for responsive tables (single scroll region inside list shell). */
export function DataTableScroll({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto overscroll-contain",
        "rounded-none",
        className,
      )}
      {...props}
    />
  );
}

export type DataTableProps = ComponentPropsWithoutRef<"table"> & {
  /** When true, long text wraps; otherwise cells truncate (clip). */
  textWrap?: boolean;
};

/** Full-width bordered table (Zoho / WMS style). */
export function DataTable({ className, textWrap, ...props }: DataTableProps) {
  return (
    <table
      data-text-mode={textWrap ? "wrap" : "clip"}
      className={cn(
        "w-full min-w-max border-collapse text-left text-sm",
        textWrap ? "table-auto" : "table-fixed",
        className,
      )}
      {...props}
    />
  );
}

/** Sticky header bar with solid column background. */
export function DataTableHead({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500",
        "dark:border-slate-700 dark:bg-slate-900/95 dark:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return (
    <tbody
      className={cn(
        "divide-y divide-slate-100 bg-white dark:divide-slate-800/80 dark:bg-slate-950",
        className,
      )}
      {...props}
    />
  );
}

export type DataTableRowProps = ComponentPropsWithoutRef<"tr"> & {
  clickable?: boolean;
};

export function DataTableRow({
  clickable,
  className,
  onClick,
  onKeyDown,
  ...props
}: DataTableRowProps) {
  return (
    <tr
      className={cn(
        "bg-white dark:bg-slate-950",
        clickable && "cursor-pointer transition-colors duration-150 hover:bg-slate-50/90 dark:hover:bg-slate-900/70",
        className,
      )}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (clickable && onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          (e.currentTarget as HTMLTableRowElement).click();
        }
      }}
      {...props}
    />
  );
}

const selectionColumnClassName = "w-10 min-w-10 max-w-10 pl-2.5 pr-1.5 py-2 align-middle";

function SelectionColumnContent({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-start">{children}</div>;
}

export type DataTableThProps = ComponentPropsWithoutRef<"th">;

export function DataTableTh({
  narrow,
  compact,
  className,
  children,
  ...props
}: DataTableThProps & { narrow?: boolean; compact?: boolean }) {
  return (
    <th
      className={cn(
        compact
          ? selectionColumnClassName
          : narrow
            ? "w-10 px-2 py-2 align-middle"
            : "px-3 py-2 align-middle sm:px-4",
        className,
      )}
      {...props}
    >
      {compact ? <SelectionColumnContent>{children}</SelectionColumnContent> : children}
    </th>
  );
}

export type DataTableTdProps = ComponentPropsWithoutRef<"td">;

export function DataTableTd({
  narrow,
  compact,
  className,
  children,
  ...props
}: DataTableTdProps & { narrow?: boolean; compact?: boolean }) {
  return (
    <td
      className={cn(
        compact
          ? selectionColumnClassName
          : narrow
            ? "w-10 px-2 py-2 align-middle"
            : "px-3 py-2 align-middle text-slate-700 dark:text-slate-300 sm:px-4",
        className,
      )}
      {...props}
    >
      {compact ? <SelectionColumnContent>{children}</SelectionColumnContent> : children}
    </td>
  );
}

/** Empty-state row spanning all columns (`colSpan`) */
export function DataTableEmptyRow({
  message,
  colSpan,
}: {
  message: ReactNode;
  colSpan: number;
}) {
  return (
    <tr>
      <td colSpan={colSpan}>
        <p className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </td>
    </tr>
  );
}
