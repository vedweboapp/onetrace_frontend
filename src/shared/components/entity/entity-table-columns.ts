import type { ReactNode } from "react";

/** Built-in cell layout variants — styling lives here, not in features. */
export type EntityTableCellVariant =
  | "primary"
  | "text"
  | "truncate"
  | "link"
  | "phone"
  | "mono"
  | "tabular"
  | "muted"
  | "date"
  | "status"
  | "actions"
  | "selection"
  | "custom";

export type ColumnLayoutOpts = {
  narrow?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  headerSrOnly?: boolean;
  /** Applies `hidden {bp}:table-cell` on header and body cells. */
  responsive?: "sm" | "md" | "lg" | "xl";
};

type EntityTableColumnBase<T> = ColumnLayoutOpts & {
  id: string;
  header: ReactNode;
};

export type EntityTableColumn<T> = EntityTableColumnBase<T> &
  (
    | { variant: "primary"; value: (row: T) => ReactNode }
    | { variant: "text"; value: (row: T) => ReactNode }
    | {
        variant: "truncate";
        value: (row: T) => ReactNode;
        maxWidth?: "sm" | "md" | "lg";
        title?: (row: T) => string | undefined;
      }
    | {
        /** Related entity name styled as a blue link (optional href for navigation). */
        variant: "link";
        label: (row: T) => string;
        href?: (row: T) => string | null | undefined;
        maxWidth?: "sm" | "md" | "lg";
        title?: (row: T) => string | undefined;
      }
    | { variant: "phone"; value: (row: T) => string | null | undefined }
    | { variant: "mono"; value: (row: T) => ReactNode }
    | { variant: "tabular"; value: (row: T) => ReactNode }
    | { variant: "muted"; value: (row: T) => ReactNode }
    | { variant: "date"; value: (row: T) => string | Date | number | null | undefined; dateFmt: Intl.DateTimeFormat }
    | {
        variant: "status";
        isActive: (row: T) => boolean;
        activeLabel: string;
        inactiveLabel: string;
      }
    | { variant: "actions"; render: (row: T) => ReactNode }
    | { variant: "selection"; render: (row: T) => ReactNode }
    | { variant: "custom"; render: (row: T) => ReactNode }
  );

function applyOpts<T>(col: EntityTableColumn<T>, opts?: ColumnLayoutOpts): EntityTableColumn<T> {
  if (!opts) return col;
  return { ...col, ...opts };
}

/** Fluent helpers so features only declare columns + data accessors. */
export function entityCol<T>() {
  return {
    primary: (id: string, header: ReactNode, value: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "primary", value }, opts),
    text: (id: string, header: ReactNode, value: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "text", value }, opts),
    truncate: (
      id: string,
      header: ReactNode,
      value: (row: T) => ReactNode,
      config?: ColumnLayoutOpts & { maxWidth?: "sm" | "md" | "lg"; title?: (row: T) => string | undefined },
    ) => {
      const { maxWidth, title, ...opts } = config ?? {};
      return applyOpts({ id, header, variant: "truncate", value, maxWidth, title }, opts);
    },
    link: (
      id: string,
      header: ReactNode,
      label: (row: T) => string,
      href?: (row: T) => string | null | undefined,
      config?: ColumnLayoutOpts & { maxWidth?: "sm" | "md" | "lg"; title?: (row: T) => string | undefined },
    ) => {
      const { maxWidth, title, ...opts } = config ?? {};
      return applyOpts({ id, header, variant: "link", label, href, maxWidth, title }, opts);
    },
    phone: (id: string, header: ReactNode, value: (row: T) => string | null | undefined, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "phone", value }, opts),
    mono: (id: string, header: ReactNode, value: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "mono", value }, opts),
    tabular: (id: string, header: ReactNode, value: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "tabular", value }, opts),
    muted: (id: string, header: ReactNode, value: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "muted", value }, opts),
    date: (
      id: string,
      header: ReactNode,
      value: (row: T) => string | Date | number | null | undefined,
      dateFmt: Intl.DateTimeFormat,
      opts?: ColumnLayoutOpts,
    ) => applyOpts({ id, header, variant: "date", value, dateFmt }, opts),
    status: (
      id: string,
      header: ReactNode,
      isActive: (row: T) => boolean,
      activeLabel: string,
      inactiveLabel: string,
      opts?: ColumnLayoutOpts,
    ) => applyOpts({ id, header, variant: "status", isActive, activeLabel, inactiveLabel }, opts),
    actions: (id: string, header: ReactNode, render: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts(
        {
          id,
          header,
          variant: "actions",
          render,
          narrow: true,
          headerSrOnly: opts?.headerSrOnly ?? true,
        },
        opts,
      ),
    selection: (id: string, header: ReactNode, render: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts(
        {
          id,
          header,
          variant: "selection",
          render,
          narrow: true,
          headerSrOnly: opts?.headerSrOnly,
        },
        opts,
      ),
    custom: (id: string, header: ReactNode, render: (row: T) => ReactNode, opts?: ColumnLayoutOpts) =>
      applyOpts({ id, header, variant: "custom", render }, opts),
  };
}

export function entityResponsiveClass(breakpoint: NonNullable<ColumnLayoutOpts["responsive"]>) {
  return `hidden ${breakpoint}:table-cell`;
}
