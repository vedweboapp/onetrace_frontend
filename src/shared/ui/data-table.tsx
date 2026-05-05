import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Outer scroll boundary for responsive tables */
export function DataTableScroll({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("overflow-x-auto", className)} {...props} />;
}

export type DataTableProps = ComponentPropsWithoutRef<"table">;

/** Full-width semantic table aligned with SurfaceShell */
export function DataTable({ className, ...props }: DataTableProps) {
  return (
    <table className={cn("w-full min-w-[min(100%,640px)] table-auto text-left text-sm", className)} {...props} />
  );
}

/** Table section headers (muted bar) */
export function DataTableHead({ className, ...props }: ComponentPropsWithoutRef<"thead">) {
  return (
    <thead
      className={cn(
        "border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500",
        "dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableBody({ className, ...props }: ComponentPropsWithoutRef<"tbody">) {
  return <tbody className={cn("divide-y divide-slate-100 dark:divide-slate-800", className)} {...props} />;
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
        clickable && "cursor-pointer transition hover:bg-slate-50/90 dark:hover:bg-slate-900/70",
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

export type DataTableThProps = ComponentPropsWithoutRef<"th">;

export function DataTableTh({
  narrow,
  className,
  children,
  ...props
}: DataTableThProps & { narrow?: boolean }) {
  return (
    <th
      className={cn(
        narrow ? "w-28 px-2 py-3" : "px-4 py-3 sm:px-6",
        className,
      )}
      {...props}
    >
      {children}
    </th>
  );
}

export type DataTableTdProps = ComponentPropsWithoutRef<"td">;

export function DataTableTd({
  narrow,
  className,
  ...props
}: DataTableTdProps & { narrow?: boolean }) {
  return (
    <td
      className={cn(narrow ? "w-28 px-2 py-3" : "px-4 py-3 sm:px-6", className)}
      {...props}
    />
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
        <p className="p-10 text-center text-sm text-slate-500 dark:text-slate-400">{message}</p>
      </td>
    </tr>
  );
}
