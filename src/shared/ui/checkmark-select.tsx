"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type CheckmarkSelectOption = {
  value: string;
  label: string;
};

type Props = {
  id?: string;
  label: string;
  options: CheckmarkSelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  listLabel?: string;
};

export function CheckmarkSelect({
  id,
  label,
  options,
  value,
  onChange,
  className,
  listLabel = "Options",
}: Props) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-[color:var(--dash-accent,#4f46e5)]">
        {label}
      </span>
      <button
        id={id}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-11 w-full max-w-md items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-left text-sm font-medium text-slate-900 shadow-sm outline-none transition",
          "hover:border-[color:var(--dash-accent,#4f46e5)] hover:bg-slate-50",
          "focus-visible:border-[color:var(--dash-accent,#4f46e5)] focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#4f46e5)]/25",
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800/90",
        )}
      >
        <span className="truncate">{selected?.label ?? "—"}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[color:var(--dash-accent,#4f46e5)] opacity-80 transition dark:opacity-90",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label={listLabel}
          className={cn(
            "absolute left-0 right-0 z-50 mt-1 max-h-60 max-w-md overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
          )}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition",
                    isSelected
                      ? "border-l-2 border-l-[color:var(--dash-accent,#4f46e5)] bg-slate-50 font-semibold text-[color:var(--dash-accent,#4f46e5)] dark:bg-slate-800/80 dark:text-[color:var(--dash-accent,#4f46e5)]"
                      : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-5 shrink-0 items-center justify-center rounded-md border",
                      isSelected
                        ? "border-transparent bg-[color:var(--dash-accent,#4f46e5)] text-white shadow-sm"
                        : "border-transparent bg-transparent text-transparent",
                    )}
                    aria-hidden
                  >
                    <Check className="size-3.5" strokeWidth={2.5} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
