"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { AppButton, type AppButtonVariant } from "@/shared/ui/app-button";
import { cn } from "@/core/utils/http.util";

const MENU_Z = 150;
const GAP = 4;
const MIN_MENU_W = 200;

export type DetailActionMenuItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  disabled?: boolean;
  onSelect: () => void | Promise<void>;
};

export type DetailActionMenuDropdownProps = {
  buttonLabel: string;
  buttonAriaLabel: string;
  menuAriaLabel: string;
  loadingLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  items: DetailActionMenuItem[];
  buttonVariant?: AppButtonVariant;
};

export function DetailActionMenuDropdown({
  buttonLabel,
  buttonAriaLabel,
  menuAriaLabel,
  loadingLabel,
  loading = false,
  disabled = false,
  items,
  buttonVariant = "secondary",
}: DetailActionMenuDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  const isDisabled = disabled || loading || busy;

  const updatePosition = React.useCallback(() => {
    const trig = wrapRef.current;
    if (!trig || !open) return;
    const rect = trig.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuH = menuEl?.offsetHeight ?? 200;
    const menuW = menuEl?.offsetWidth ?? MIN_MENU_W;
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const spaceBelow = vh - rect.bottom - GAP;
    const spaceAbove = rect.top - GAP;
    let top = rect.bottom + GAP;
    if (spaceBelow < menuH && spaceAbove >= spaceBelow) {
      top = rect.top - menuH - GAP;
    }
    top = Math.max(GAP, Math.min(top, vh - menuH - GAP));
    const left = Math.max(GAP, Math.min(rect.right - menuW, vw - menuW - GAP));
    setCoords({ top, left });
  }, [open]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const id = requestAnimationFrame(() => updatePosition());
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const node = e.target as Node;
      if (wrapRef.current?.contains(node) || menuRef.current?.contains(node)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSelect(item: DetailActionMenuItem) {
    if (isDisabled || item.disabled) return;
    setOpen(false);
    setBusy(true);
    try {
      await item.onSelect();
    } finally {
      setBusy(false);
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={menuAriaLabel}
      style={
        coords
          ? { position: "fixed", top: coords.top, left: coords.left, zIndex: MENU_Z, minWidth: MIN_MENU_W }
          : { position: "fixed", left: -9999, top: -9999, zIndex: MENU_Z, minWidth: MIN_MENU_W, visibility: "hidden" }
      }
      className={cn(
        "rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
        "dark:border-slate-700 dark:bg-slate-900",
        coords ? "opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={isDisabled || item.disabled}
            onClick={() => void handleSelect(item)}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition",
              "text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80",
              (isDisabled || item.disabled) && "pointer-events-none opacity-50",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden /> : null}
            <span className="min-w-0 flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  const buttonText = loading || busy ? (loadingLabel ?? buttonLabel) : buttonLabel;

  return (
    <>
      <div ref={wrapRef} className="relative inline-flex">
        <AppButton
          type="button"
          variant={buttonVariant}
          size="sm"
          disabled={isDisabled}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={buttonAriaLabel}
          onClick={() => setOpen((v) => !v)}
        >
          {buttonText}
        </AppButton>
      </div>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
