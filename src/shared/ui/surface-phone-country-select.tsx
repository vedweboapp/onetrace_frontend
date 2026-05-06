"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import type { Country } from "react-phone-number-input";
import { cn } from "@/core/utils/http.util";

type LibraryCountryOption = {
  value?: string;
  label: string;
  divider?: boolean;
};

type IconComponentProps = {
  country?: Country;
  label: string;
  aspectRatio?: number;
};

export type SurfacePhoneCountrySelectProps = {
  value?: Country;
  options: LibraryCountryOption[];
  onChange: (country?: Country) => void;
  onFocus?: (e: React.FocusEvent<HTMLElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLElement>) => void;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  iconComponent: React.ComponentType<IconComponentProps>;
  name?: string;
  "aria-label"?: string;
};

export function SurfacePhoneCountrySelect({
  value,
  options,
  onChange,
  onFocus,
  onBlur,
  disabled,
  readOnly,
  className,
  iconComponent: Icon,
  name,
  "aria-label": ariaLabel,
}: SurfacePhoneCountrySelectProps) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLUListElement>(null);
  const [open, setOpen] = React.useState(false);
  const [portalAccent, setPortalAccent] = React.useState("#111111");
  const [portalOnAccent, setPortalOnAccent] = React.useState("#ffffff");
  const [popover, setPopover] = React.useState({ top: 0, left: 0, width: 220 });

  const selectOptions = React.useMemo(() => {
    const out: Array<{ value: string; label: string }> = [];
    for (const opt of options) {
      if (opt.divider) continue;
      const v = opt.value === undefined || opt.value === "" ? "ZZ" : opt.value;
      out.push({ value: v, label: opt.label });
    }
    return out;
  }, [options]);

  const selectedRow = React.useMemo(() => {
    const current = value ?? "ZZ";
    for (const opt of options) {
      if (opt.divider) continue;
      const optVal = opt.value === undefined || opt.value === "" ? "ZZ" : opt.value;
      if (optVal === current) return opt;
    }
    return undefined;
  }, [options, value]);

  const selectValue = value ?? "ZZ";
  const iconLabel = selectedRow?.label ?? selectOptions[0]?.label ?? "";

  const effectiveDisabled = Boolean(disabled || readOnly);

  React.useEffect(() => {
    if (!open) return;
    const button = triggerRef.current;
    if (!button) return;

    const update = () => {
      const rect = button.getBoundingClientRect();
      setPopover({ top: rect.bottom + 4, left: rect.left, width: Math.max(220, rect.width) });
    };
    const style = getComputedStyle(button);
    setPortalAccent(style.getPropertyValue("--dash-accent").trim() || "#111111");
    setPortalOnAccent(style.getPropertyValue("--dash-on-accent").trim() || "#ffffff");
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  return (
    <div className={cn("PhoneInputCountry flex min-w-0 shrink-0 items-center gap-1.5 self-stretch", className)}>
      <button
        ref={triggerRef}
        id={name}
        type="button"
        aria-label={ariaLabel ?? "Country"}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={effectiveDisabled}
        onFocus={(e) => onFocus?.(e)}
        onBlur={(e) => onBlur?.(e)}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 w-[40px] shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 text-slate-900 transition",
          "hover:bg-transparent",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dash-accent,#111111)]/25",
          "dark:bg-transparent dark:text-slate-100",
          effectiveDisabled && "cursor-not-allowed opacity-60",
        )}
      >
        <span className="pointer-events-none flex shrink-0 items-center" aria-hidden>
          <Icon country={value} label={iconLabel} />
        </span>
      </button>

      {open && !effectiveDisabled && typeof document !== "undefined"
        ? createPortal(
            <ul
              ref={listRef}
              role="listbox"
              aria-label={ariaLabel ?? "Country"}
              className="max-h-72 overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
              style={
                {
                  position: "fixed",
                  top: popover.top,
                  left: popover.left,
                  width: popover.width,
                  zIndex: 220,
                  ["--dash-accent" as string]: portalAccent,
                  ["--dash-on-accent" as string]: portalOnAccent,
                } as React.CSSProperties
              }
            >
              {selectOptions.map((opt) => {
                const isSelected = opt.value === selectValue;
                return (
                  <li key={opt.value} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        onChange(opt.value === "ZZ" ? undefined : (opt.value as Country));
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition",
                        isSelected
                          ? "bg-[color:color-mix(in_srgb,var(--dash-accent,#111111)_10%,transparent)] text-[color:var(--dash-accent,#111111)]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800",
                      )}
                    >
                      <span className="inline-flex w-6 items-center justify-center" aria-hidden>
                        <Icon country={opt.value === "ZZ" ? undefined : (opt.value as Country)} label={opt.label} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                      <span
                        className={cn(
                          "inline-flex size-4 items-center justify-center rounded-sm",
                          isSelected ? "text-[color:var(--dash-accent,#111111)]" : "text-transparent",
                        )}
                      >
                        <Check className="size-3.5" strokeWidth={2.5} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>,
            document.body,
          )
        : null}
    </div>
  );
}
