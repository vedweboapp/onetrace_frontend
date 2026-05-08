"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export type DataTableRowMenuItem = {
  id: string;
  label: string;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
  icon?: LucideIcon;
};

type DataTableRowActionsMenuProps = {
  items: DataTableRowMenuItem[];
  menuAriaLabel: string;
  align?: "left" | "right";
  className?: string;
};

const MENU_Z = 150;
const GAP = 4;
const MIN_MENU_W = 176; // matches min-w-[11rem]

export function DataTableRowActionsMenu({
  items,
  menuAriaLabel,
  align = "right",
  className,
}: DataTableRowActionsMenuProps) {
  const [open, setOpen] = React.useState(false);
  const triggerWrapRef = React.useRef<HTMLDivElement>(null);
  const triggerBtnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  const updatePosition = React.useCallback(() => {
    const trig = triggerBtnRef.current;
    if (!trig || !open) return;

    const rect = trig.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuH = menuEl?.offsetHeight ?? Math.min(items.length * 40 + 12, 320);
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

    let left = align === "right" ? rect.right - menuW : rect.left;
    left = Math.max(GAP, Math.min(left, vw - menuW - GAP));

    setCoords({ top, left });
  }, [open, align, items.length]);

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
      const t = e.target as Node;
      if (triggerWrapRef.current?.contains(t) || menuRef.current?.contains(t)) return;
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

  const menu = open ? (
    <div
      ref={menuRef}
      role="menu"
      aria-label={menuAriaLabel}
      style={
        coords
          ? {
              position: "fixed",
              top: coords.top,
              left: coords.left,
              zIndex: MENU_Z,
              minWidth: MIN_MENU_W,
            }
          : { position: "fixed", left: -9999, top: -9999, zIndex: MENU_Z, minWidth: MIN_MENU_W, visibility: "hidden" as const }
      }
      className={cn(
        "rounded-lg border border-slate-200 bg-white py-1 shadow-lg",
        "dark:border-slate-700 dark:bg-slate-900",
        coords ? "opacity-100" : "opacity-0 pointer-events-none",
      )}
    >
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              setOpen(false);
              item.onSelect();
            }}
            className={cn(
              "flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium transition",
              item.tone === "danger"
                ? "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                : "text-slate-800 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800/80",
              item.disabled && "pointer-events-none opacity-50",
            )}
          >
            {Icon ? (
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} aria-hidden />
            ) : null}
            <span className="min-w-0 flex-1">{item.label}</span>
          </button>
        );
      })}
    </div>
  ) : null;

  return (
    <>
      <div
        ref={triggerWrapRef}
        className={cn("relative flex justify-end", className)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          ref={triggerBtnRef}
          type="button"
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={menuAriaLabel}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition outline-none",
            "hover:bg-slate-100 hover:text-slate-800",
            "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
            "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-950",
            open && "bg-slate-100 dark:bg-slate-800",
          )}
        >
          <MoreVertical className="size-4" strokeWidth={1.75} aria-hidden />
        </button>
      </div>
      {menu && typeof document !== "undefined" ? createPortal(menu, document.body) : null}
    </>
  );
}
