"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export type DetailCollapsibleSectionProps = {
  id?: string;
  title: React.ReactNode;
  badge?: React.ReactNode;
  headerRight?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  toggleAriaLabel?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function DetailCollapsibleSection({
  id,
  title,
  badge,
  headerRight,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  toggleAriaLabel = "Toggle section",
  children,
  className,
  bodyClassName,
}: DetailCollapsibleSectionProps) {
  const controlled = openProp !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const isOpen = controlled ? openProp : internalOpen;

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next);
    onOpenChange?.(next);
  }

  function toggle() {
    setOpen(!isOpen);
  }

  return (
    <section
      id={id}
      className={cn(
        "overflow-hidden rounded-md border border-slate-200/95 bg-white shadow-sm",
        "dark:border-slate-800 dark:bg-slate-900",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 px-4 py-3.5 sm:px-6 sm:py-4",
          isOpen && "border-b border-slate-200/80 dark:border-slate-800",
        )}
      >
        <button
          type="button"
          className="-m-1 inline-flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/60"
          aria-expanded={isOpen}
          aria-label={toggleAriaLabel}
          onClick={toggle}
        >
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-slate-400 transition-transform duration-200",
              isOpen && "rotate-180",
            )}
            aria-hidden
          />
          <span className="min-w-0 truncate text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </span>
        </button>

        {badge ? <div className="shrink-0">{badge}</div> : null}

        {headerRight ? (
          <div
            data-collapsible-action=""
            className="ml-auto flex shrink-0 flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {headerRight}
          </div>
        ) : null}
      </div>

      {isOpen ? (
        <div className={cn("px-4 pb-5 sm:px-6 sm:pb-6", bodyClassName)}>{children}</div>
      ) : null}
    </section>
  );
}
