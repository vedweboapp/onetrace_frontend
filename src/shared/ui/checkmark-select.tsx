"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { CSSProperties } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";

/** Portaled lists are under `document.body` and skip inherited theme vars; copy from trigger. */
function readDashAccent(el: HTMLElement | null): string {
  if (!el) return "#111111";
  const v = getComputedStyle(el).getPropertyValue("--dash-accent").trim();
  return v || "#111111";
}

function readDashOnAccent(el: HTMLElement | null): string {
  if (!el) return "#ffffff";
  const v = getComputedStyle(el).getPropertyValue("--dash-on-accent").trim();
  return v || "#ffffff";
}

export type CheckmarkSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;

  label?: string;
  options: CheckmarkSelectOption[];
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;

  onTriggerFocus?: (e: React.FocusEvent<HTMLButtonElement>) => void;

  onTriggerBlur?: (e: React.FocusEvent<HTMLButtonElement>) => void;
  className?: string;
  listLabel?: string;
  disabled?: boolean;

  invalid?: boolean;

  emptyLabel?: string;
  portaled?: boolean;
  /** Compact trigger (e.g. pagination page size). */
  size?: "md" | "sm";
  /** When false, selected option is indicated by accent text only (no check icon). */
  showCheckmarks?: boolean;
  /** e.g. "Rows per page" when the visible label is omitted */
  buttonAriaLabel?: string;
  /** Opening direction. Defaults to "bottom". */
  side?: "top" | "bottom";
  /** Enables option search input inside dropdown. */
  searchable?: boolean;
  searchPlaceholder?: string;
  /**
   * When true, shows a compact clear control inside the trigger (when a value is set)
   * and a small clear control at the top of the dropdown list.
   */
  clearable?: boolean;
  /** Accessible label for the clear control (recommended when `clearable` is true). */
  clearAriaLabel?: string;
};

function usePopoverRect(open: boolean, anchorRef: React.RefObject<HTMLElement | null>, side: "top" | "bottom" = "bottom") {
  const [rect, setRect] = React.useState({ top: 0, left: 0, width: 0, transform: "none" });

  const update = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el || !open) return;
    const r = el.getBoundingClientRect();
    if (side === "top") {
      setRect({ top: r.top - 4, left: r.left, width: r.width, transform: "translateY(-100%)" });
    } else {
      setRect({ top: r.bottom + 4, left: r.left, width: r.width, transform: "none" });
    }
  }, [open, anchorRef, side]);

  React.useLayoutEffect(() => {
    update();
    if (!open) return;
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, update]);

  return rect;
}

export function CheckmarkSelect({
  id,
  label,
  options,
  value,
  onChange,
  onBlur,
  onTriggerFocus,
  onTriggerBlur,
  className,
  listLabel = "Options",
  disabled,
  invalid,
  emptyLabel = "—",
  portaled = true,
  size = "md",
  showCheckmarks = true,
  buttonAriaLabel,
  side = "bottom",
  searchable = true,
  searchPlaceholder = "Search...",
  clearable = false,
  clearAriaLabel,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);
  const canClear = Boolean(clearable && !disabled && value.trim() !== "");
  const popoverRect = usePopoverRect(open && portaled, anchorRef, side);
  const [portalAccent, setPortalAccent] = React.useState("#111111");
  const [portalOnAccent, setPortalOnAccent] = React.useState("#ffffff");

  React.useLayoutEffect(() => {
    if (!open || !portaled) return;
    const trig = triggerRef.current;
    setPortalAccent(readDashAccent(trig));
    setPortalOnAccent(readDashOnAccent(trig));
  }, [open, portaled]);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  React.useEffect(() => {
    if (open) setSearch("");
  }, [open]);

  const displayLabel = value && selected ? selected.label : emptyLabel;

  const listClasses = cn(
    "max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
  );

  const optionTextSize = size === "sm" ? "text-xs" : "text-sm";
  const optionY = size === "sm" ? "py-2" : "py-2.5";
  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return options;
    return options.filter((opt) => opt.label.toLowerCase().includes(q));
  }, [options, search]);

  function renderOptionList(extraStyle: CSSProperties, extraClass?: string) {
    return (
      <div
        ref={listRef}
        data-ot-checkmark-portal=""
        className={cn(listClasses, extraClass)}
        style={extraStyle}
      >
        {canClear ? (
          <div className="flex items-center justify-end border-b border-slate-200 px-2 py-1 dark:border-slate-600">
            <button
              type="button"
              className={cn(
                "flex items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800",
                size === "sm" ? "size-6" : "size-7",
                "dark:hover:bg-slate-800 dark:hover:text-slate-100",
              )}
              aria-label={clearAriaLabel ?? "Clear"}
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              <X className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}
        {searchable ? (
          <div className="p-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none",
                "focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/20",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
              )}
            />
          </div>
        ) : null}
        <ul role="listbox" aria-label={listLabel} className="max-h-52 overflow-auto py-1">
          {filteredOptions.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value === "" ? "__empty__" : opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={disabled}
                  onClick={() => {
                    if (disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center text-left transition",
                    showCheckmarks ? "gap-2 px-3" : "px-3",
                    optionY,
                    optionTextSize,
                    isSelected
                      ? showCheckmarks
                        ? "border-l-2 border-l-[color:var(--dash-accent,#111111)] bg-slate-50 font-semibold text-[color:var(--dash-accent,#111111)] dark:bg-slate-800/80"
                        : "bg-slate-50 font-semibold text-[color:var(--dash-accent,#111111)] dark:bg-slate-800/80"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                    disabled && "pointer-events-none opacity-50",
                  )}
                >
                  {showCheckmarks ? (
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center rounded-md border",
                        isSelected
                          ? "border-transparent bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)] shadow-sm"
                          : "border-transparent bg-transparent text-transparent",
                      )}
                      aria-hidden
                    >
                      <Check className="size-3.5" strokeWidth={2.5} />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
          {filteredOptions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">No results</li>
          ) : null}
        </ul>
      </div>
    );
  }

  const triggerClass = cn(
    "flex w-full items-center justify-between gap-1.5 border text-left font-medium outline-none transition",
    size === "sm"
      ? "h-8 min-h-8 rounded-md px-2 text-xs shadow-sm"
      : "h-11 gap-2 rounded-xl px-3.5 text-sm shadow-sm",
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-600"
      : cn(
          "cursor-pointer border-slate-200 bg-white text-slate-900",
          "hover:border-[color:var(--dash-accent,#111111)] hover:bg-slate-50",
          "focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800/90",
          invalid &&
            "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/25 dark:border-red-500",
        ),
  );

  const splitFrameClass = cn(
    "flex w-full min-w-0 items-stretch overflow-hidden border text-left font-medium shadow-sm outline-none transition",
    size === "sm" ? "h-8 min-h-8 rounded-md text-xs" : "h-11 min-h-11 rounded-xl text-sm",
    disabled
      ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-600"
      : cn(
          "border-slate-200 bg-white text-slate-900",
          "hover:border-[color:var(--dash-accent,#111111)]",
          "focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/25",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:focus-within:border-slate-500",
          invalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/25 dark:border-red-500",
        ),
  );

  const openSplitButtonClass = cn(
    "flex min-w-0 flex-1 items-center justify-between gap-1.5 border-0 bg-transparent text-left font-medium outline-none transition",
    size === "sm" ? "px-2 text-xs" : "gap-2 px-3.5 text-sm",
    disabled
      ? "cursor-not-allowed"
      : cn(
          "cursor-pointer hover:bg-slate-50",
          "focus-visible:z-[1] focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25 focus-visible:ring-inset",
          "dark:hover:bg-slate-800/90 dark:focus-visible:bg-slate-800/90",
        ),
  );

  const clearSplitButtonClass = cn(
    "flex shrink-0 items-center justify-center border-l border-slate-200 bg-transparent outline-none transition dark:border-slate-600",
    size === "sm" ? "w-7" : "w-8",
    disabled
      ? "cursor-not-allowed text-slate-400"
      : cn(
          "cursor-pointer text-slate-500 hover:bg-slate-50 hover:text-slate-800",
          "focus-visible:z-[1] focus-visible:bg-slate-50 focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25 focus-visible:ring-inset",
          "dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:bg-slate-800/90",
        ),
  );

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {label ? (
        <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--dash-accent,#111111)]">
          {label}
        </span>
      ) : null}
      {canClear ? (
        <div ref={anchorRef} className={splitFrameClass} data-invalid={invalid ? true : undefined}>
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-label={buttonAriaLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={disabled}
            onFocus={(e) => onTriggerFocus?.(e)}
            onBlur={(e) => {
              onTriggerBlur?.(e);
              onBlur?.();
            }}
            onClick={() => !disabled && setOpen((o) => !o)}
            className={openSplitButtonClass}
          >
            <span className={cn("min-w-0 flex-1 truncate", !value && "text-slate-400 dark:text-slate-500")}>
              {displayLabel}
            </span>
            <ChevronDown
              className={cn(
                "shrink-0 text-[color:var(--dash-accent,#111111)] opacity-80 transition dark:opacity-90",
                size === "sm" ? "size-3.5" : "size-4",
                open && !disabled && "rotate-180",
              )}
              aria-hidden
            />
          </button>
          <button
            type="button"
            aria-label={clearAriaLabel ?? "Clear"}
            disabled={disabled}
            className={clearSplitButtonClass}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (disabled) return;
              onChange("");
              setOpen(false);
            }}
          >
            <X className={size === "sm" ? "size-3" : "size-3.5"} strokeWidth={2} aria-hidden />
          </button>
        </div>
      ) : (
        <div ref={anchorRef} className="w-full min-w-0">
          <button
            ref={triggerRef}
            id={id}
            type="button"
            aria-label={buttonAriaLabel}
            aria-haspopup="listbox"
            aria-expanded={open}
            disabled={disabled}
            data-invalid={invalid ? true : undefined}
            onFocus={(e) => onTriggerFocus?.(e)}
            onBlur={(e) => {
              onTriggerBlur?.(e);
              onBlur?.();
            }}
            onClick={() => !disabled && setOpen((o) => !o)}
            className={triggerClass}
          >
            <span className={cn("truncate", !value && "text-slate-400 dark:text-slate-500")}>{displayLabel}</span>
            <ChevronDown
              className={cn(
                "shrink-0 text-[color:var(--dash-accent,#111111)] opacity-80 transition dark:opacity-90",
                size === "sm" ? "size-3.5" : "size-4",
                open && !disabled && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        </div>
      )}
      {open && !disabled && !portaled
        ? renderOptionList({}, "absolute left-0 right-0 z-50 mt-1 min-w-0")
        : null}
      {open && !disabled && portaled && typeof document !== "undefined"
        ? createPortal(
            renderOptionList(
              {
                position: "fixed",
                top: popoverRect.top,
                left: popoverRect.left,
                width: Math.max(popoverRect.width, size === "sm" ? 120 : 200),
                transform: popoverRect.transform,
                zIndex: 200,
                ["--dash-accent" as string]: portalAccent,
                ["--dash-on-accent" as string]: portalOnAccent,
              },
              "max-w-[calc(100vw-1rem)]",
            ),
            document.body,
          )
        : null}
    </div>
  );
}
