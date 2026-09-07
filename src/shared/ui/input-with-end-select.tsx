"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { OrgMoneyPlainInput } from "@/shared/ui/money-input";
import { NumericInput } from "@/shared/ui/numeric-input";
import { useOrgCurrency } from "@/shared/money/use-org-currency";

export type InputWithEndSelectOption = {
  value: string;
  label: string;
};

type Props = {
  startSlot?: React.ReactNode;
  inputId?: string;
  inputValue?: string;
  onInputChange?: (value: string) => void;
  inputType?: React.HTMLInputTypeAttribute;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  min?: number;
  step?: string | number;
  placeholder?: string;
  disabled?: boolean;
  invalid?: boolean;
  selectValue: string;
  onSelectChange: (value: string) => void;
  selectOptions: InputWithEndSelectOption[];
  selectAriaLabel: string;
  selectPlaceholder?: string;
  selectDisabled?: boolean;
  className?: string;
  /** Format the amount using Company Settings currency grouping/decimals. */
  orgMoney?: boolean;
  /** Show org currency symbol/code before the amount (with `orgMoney`). */
  showCurrencyAffix?: boolean;
};

const frameClassName = cn(
  "flex h-11 w-full min-w-0 items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm transition",
  "focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/20",
  "dark:border-slate-700 dark:bg-slate-950",
);

const inputClassName = cn(
  "min-w-0 flex-1 border-0 bg-transparent px-3.5 text-sm text-slate-900 outline-none",
  "placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500",
  "disabled:cursor-not-allowed disabled:text-slate-400",
);

const selectWrapClassName =
  "relative flex h-full shrink-0 items-stretch border-l border-slate-200 dark:border-slate-700";

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

export function InputWithEndSelect({
  startSlot,
  inputId,
  inputValue = "",
  onInputChange,
  inputType = "text",
  inputMode,
  min,
  step,
  placeholder,
  disabled = false,
  invalid = false,
  selectValue,
  onSelectChange,
  selectOptions,
  selectAriaLabel,
  selectPlaceholder,
  selectDisabled = false,
  className,
  orgMoney = false,
  showCurrencyAffix = false,
}: Props) {
  const { settings, affix } = useOrgCurrency();
  const currencyBefore = settings.symbolPosition === "before";
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  const [accent, setAccent] = React.useState("#111111");
  const [onAccent, setOnAccent] = React.useState("#ffffff");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  const selected = selectOptions.find((o) => o.value === selectValue);
  const displayLabel = selected?.label || selectPlaceholder || selectValue || "—";
  const selectLocked = disabled || selectDisabled;

  const updatePos = React.useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 112);
    const left = Math.min(rect.left, window.innerWidth - width - 8);
    const below = rect.bottom + 4;
    const estimated = Math.min(selectOptions.length, 6) * 36 + 8;
    const top =
      below + estimated > window.innerHeight - 8
        ? Math.max(8, rect.top - estimated - 4)
        : below;
    setPos({ top, left, width });
  }, [selectOptions.length]);

  React.useEffect(() => {
    if (!open) return;
    updatePos();
    setAccent(readDashAccent(triggerRef.current));
    setOnAccent(readDashOnAccent(triggerRef.current));
    const onScrollOrResize = () => updatePos();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updatePos]);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target) || listRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={cn(
        frameClassName,
        invalid && "border-red-500 focus-within:border-red-500 focus-within:ring-red-500/20 dark:border-red-500",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      {startSlot ?? (
        <>
          {orgMoney && showCurrencyAffix && currencyBefore ? (
            <span className="flex h-full shrink-0 items-center pl-3.5 text-sm font-medium leading-none text-slate-500 dark:text-slate-400" aria-hidden>
              {affix}
            </span>
          ) : null}
          {orgMoney ? (
            <OrgMoneyPlainInput
              id={inputId}
              value={inputValue}
              onChange={(next) => onInputChange?.(next)}
              placeholder={placeholder}
              disabled={disabled}
              invalid={invalid}
              className={cn(inputClassName, "h-full", showCurrencyAffix && currencyBefore && "pl-1.5")}
            />
          ) : inputType === "number" ? (
            <NumericInput
              id={inputId}
              variant="plain"
              value={inputValue}
              onChange={(next) => onInputChange?.(next)}
              placeholder={placeholder}
              disabled={disabled}
              invalid={invalid}
              className={inputClassName}
            />
          ) : (
            <input
              id={inputId}
              type={inputType}
              inputMode={inputMode}
              min={min}
              step={step}
              value={inputValue}
              onChange={(e) => onInputChange?.(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              className={inputClassName}
            />
          )}
          {orgMoney && showCurrencyAffix && !currencyBefore ? (
            <span className="flex h-full shrink-0 items-center pr-2 text-sm font-medium leading-none text-slate-500 dark:text-slate-400" aria-hidden>
              {affix}
            </span>
          ) : null}
        </>
      )}
      <div className={selectWrapClassName}>
        <button
          ref={triggerRef}
          type="button"
          aria-label={selectAriaLabel}
          aria-haspopup="listbox"
          aria-expanded={open}
          disabled={selectLocked}
          onClick={() => {
            if (selectLocked) return;
            setOpen((v) => !v);
          }}
          className={cn(
            "flex h-full min-w-[6.5rem] max-w-[9.5rem] items-center gap-1 border-0 bg-transparent py-0 pl-2.5 pr-7 text-left text-sm text-slate-900 outline-none",
            "disabled:cursor-not-allowed disabled:text-slate-400",
            "dark:text-slate-100",
          )}
        >
          <span className="block truncate">{displayLabel}</span>
        </button>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-slate-500 dark:text-slate-400"
          aria-hidden
        />
      </div>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listRef}
              role="listbox"
              aria-label={selectAriaLabel}
              className={cn(
                "fixed z-[90] overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl",
                "ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
              )}
              style={{ top: pos.top, left: pos.left, width: pos.width, maxHeight: 240 }}
            >
              <div className="flex max-h-[232px] flex-col gap-0.5 overflow-y-auto">
                {selectOptions.map((opt) => {
                  const isActive = opt.value === selectValue;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onSelectChange(opt.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition",
                        isActive
                          ? "text-[color:var(--dash-on-accent,#ffffff)]"
                          : "text-slate-800 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800",
                      )}
                      style={
                        isActive
                          ? {
                              backgroundColor: accent,
                              color: onAccent,
                            }
                          : undefined
                      }
                    >
                      <span className="truncate">{opt.label}</span>
                      {isActive ? <Check className="size-3.5 shrink-0 opacity-90" aria-hidden /> : null}
                    </button>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
