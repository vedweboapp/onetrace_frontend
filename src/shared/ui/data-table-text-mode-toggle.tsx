"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Check, WrapText } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  useDataTableTextModeStore,
  type DataTableTextMode,
} from "./data-table-text-mode.store";

type Props = {
  className?: string;
  /** Controlled mode; defaults to shared store. */
  mode?: DataTableTextMode;
  onModeChange?: (mode: DataTableTextMode) => void;
  /**
   * `toolbar` — segmented control (legacy).
   * `header` — compact icon in the table header corner; menu opens on click (Zoho-style).
   */
  variant?: "toolbar" | "header";
};

/** Clip / Wrap cell text. Prefer `variant="header"` (icon + popover in column corner). */
export function DataTableTextModeToggle({
  className,
  mode,
  onModeChange,
  variant = "header",
}: Props) {
  const t = useTranslations("Dashboard.list");
  const storeMode = useDataTableTextModeStore((s) => s.textMode);
  const setStoreMode = useDataTableTextModeStore((s) => s.setTextMode);
  const active = mode ?? storeMode;

  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);

  function setMode(next: DataTableTextMode) {
    if (onModeChange) onModeChange(next);
    else setStoreMode(next);
    setOpen(false);
  }

  React.useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 148;
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
    });
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
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

  if (variant === "toolbar") {
    const btn = (value: DataTableTextMode, label: string) => {
      const selected = active === value;
      return (
        <button
          type="button"
          aria-pressed={selected}
          onClick={() => setMode(value)}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-semibold transition",
            selected
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
          )}
        >
          {label}
        </button>
      );
    };

    return (
      <div
        className={cn(
          "inline-flex items-center gap-0.5 rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 dark:border-slate-700 dark:bg-slate-900/80",
          className,
        )}
        role="group"
        aria-label={t("textModeAria")}
      >
        <WrapText className="ml-1.5 size-3.5 shrink-0 text-slate-400" strokeWidth={1.75} aria-hidden />
        {btn("clip", t("textModeClip"))}
        {btn("wrap", t("textModeWrap"))}
      </div>
    );
  }

  const menu =
    open && pos && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={t("textModeAria")}
            className="fixed z-[80] min-w-[9.25rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10"
            style={{ top: pos.top, left: pos.left }}
          >
            {(
              [
                ["clip", t("textModeClip"), t("textModeClipHint")],
                ["wrap", t("textModeWrap"), t("textModeWrapHint")],
              ] as const
            ).map(([value, label, hint]) => {
              const selected = active === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={selected}
                  title={hint}
                  onClick={() => setMode(value)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs font-medium transition",
                    selected
                      ? "bg-slate-50 text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                      : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  <span className="flex size-3.5 shrink-0 items-center justify-center">
                    {selected ? <Check className="size-3.5" strokeWidth={2.25} aria-hidden /> : null}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn("relative inline-flex", className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("textModeAria")}
        title={t("textModeAria")}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={cn(
          "inline-flex size-6 items-center justify-center rounded text-slate-400 transition",
          "hover:bg-slate-200/80 hover:text-slate-700",
          "dark:hover:bg-slate-700 dark:hover:text-slate-100",
          open && "bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
        )}
      >
        <WrapText className="size-3.5" strokeWidth={1.75} aria-hidden />
      </button>
      {menu}
    </div>
  );
}
