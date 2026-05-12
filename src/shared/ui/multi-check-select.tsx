"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { CheckmarkSelectOption } from "./checkmark-select";

type Props = {
  id?: string;
  options: CheckmarkSelectOption[];
  values: string[];
  onChange: (next: string[]) => void;
  onBlur?: () => void;
  listLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  portaled?: boolean;
};

export function MultiCheckSelect({
  id,
  options,
  values,
  onChange,
  onBlur,
  listLabel = "Options",
  placeholder = "Select...",
  disabled,
  invalid,
  className,
  searchable = true,
  searchPlaceholder = "Search...",
  portaled = true,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [panelRect, setPanelRect] = React.useState({ top: 0, left: 0, width: 0 });

  const selectedMap = React.useMemo(() => new Set(values), [values]);
  const selectedOptions = React.useMemo(
    () => options.filter((o) => selectedMap.has(o.value)),
    [options, selectedMap],
  );
  const filteredOptions = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query]);

  const updateRect = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el || !open || !portaled) return;
    const r = el.getBoundingClientRect();
    setPanelRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, [open, portaled]);

  React.useLayoutEffect(() => {
    updateRect();
    if (!open || !portaled) return;
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [open, portaled, updateRect]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  function toggleOne(value: string) {
    if (selectedMap.has(value)) onChange(values.filter((v) => v !== value));
    else onChange([...values, value]);
  }

  const triggerClass = cn(
    "min-h-11 w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-left text-sm text-slate-900 outline-none transition",
    "hover:border-[color:var(--dash-accent,#111111)] hover:bg-slate-50",
    "focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/20",
    "dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800/90",
    disabled && "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/80",
    invalid && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20 dark:border-red-500",
  );

  const panel = (
    <div
      ref={panelRef}
      className="z-[200] max-h-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
      style={
        portaled
          ? {
              position: "fixed",
              top: panelRect.top,
              left: panelRect.left,
              width: Math.max(panelRect.width, 220),
            }
          : undefined
      }
    >
      {searchable ? (
        <div className="border-b border-slate-100 p-2 dark:border-slate-800">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-sm outline-none focus-visible:border-[color:var(--dash-accent,#111111)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      ) : null}
      <ul role="listbox" aria-label={listLabel} className="max-h-64 overflow-auto py-1">
        {filteredOptions.map((opt) => {
          const checked = selectedMap.has(opt.value);
          return (
            <li key={opt.value || "__empty__"}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => !disabled && toggleOne(opt.value)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                  checked
                    ? "bg-slate-50 font-semibold text-[color:var(--dash-accent,#111111)] dark:bg-slate-800/80"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-md border",
                    checked
                      ? "border-transparent bg-[color:var(--dash-accent,#111111)] text-[color:var(--dash-on-accent,#ffffff)] shadow-sm"
                      : "border-slate-300 text-transparent dark:border-slate-600",
                  )}
                >
                  <Check className="size-3.5" strokeWidth={2.5} />
                </span>
                <span className="truncate">{opt.label}</span>
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

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onBlur={onBlur}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={triggerClass}
      >
        <div className="flex items-start justify-between gap-2">
          {selectedOptions.length === 0 ? (
            <span className="truncate text-slate-400 dark:text-slate-500">{placeholder}</span>
          ) : (
            <div className="flex min-h-6 flex-1 flex-wrap gap-1.5">
              {selectedOptions.map((opt) => (
                <span
                  key={opt.value}
                  className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {opt.label}
                  <span
                    role="button"
                    tabIndex={0}
                    className="rounded p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleOne(opt.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOne(opt.value);
                      }
                    }}
                  >
                    <X className="size-3" />
                  </span>
                </span>
              ))}
            </div>
          )}
          <ChevronDown className={cn("mt-0.5 size-4 shrink-0 transition", open && "rotate-180")} />
        </div>
      </button>
      {open && !disabled && (portaled && typeof document !== "undefined" ? createPortal(panel, document.body) : panel)}
    </div>
  );
}
