"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { DetailEntityLink } from "@/shared/components/entity/detail-entity-link";

/** Soft chip chrome for multiple related values on detail pages (not rounded-full pills). */
export const detailMultiValueItemClassName = cn(
  "inline-flex max-w-full min-w-0 items-center rounded-md border border-slate-200/90 bg-slate-50 px-2 py-0.5",
  "text-sm font-medium leading-snug text-slate-800",
  "dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100",
);

export const detailMultiValueLinkClassName = cn(
  detailMultiValueItemClassName,
  "text-blue-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800",
  "dark:text-blue-300 dark:hover:border-blue-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-200",
);

/**
 * Horizontal wrap list for multiple detail values (sites, managers, contacts, tags).
 * Avoids stacked grids with dividers that misalign next to left/right field labels.
 */
export function DetailMultiValue({
  children,
  empty = "—",
  className,
}: {
  children?: ReactNode;
  empty?: ReactNode;
  className?: string;
}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) {
    return <span className="font-normal text-slate-400 dark:text-slate-500">{empty}</span>;
  }
  return (
    <ul className={cn("m-0 flex list-none flex-wrap items-center gap-1.5 p-0", className)}>
      {items.map((child, index) => (
        <li key={index} className="min-w-0 max-w-full">
          {child}
        </li>
      ))}
    </ul>
  );
}

export function DetailMultiValueItem({
  children,
  href,
  title,
  className,
}: {
  children: ReactNode;
  href?: string | null;
  title?: string;
  className?: string;
}) {
  const label = (
    <span className="min-w-0 truncate" title={title}>
      {children}
    </span>
  );

  if (href?.trim()) {
    return (
      <DetailEntityLink
        href={href.trim()}
        title={title}
        className={cn(detailMultiValueLinkClassName, className)}
        onClick={(e) => e.stopPropagation()}
      >
        {label}
      </DetailEntityLink>
    );
  }

  return <span className={cn(detailMultiValueItemClassName, className)}>{label}</span>;
}
