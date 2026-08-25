"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import { popoverPanelClassName } from "@/shared/config/design-tokens";
import { cn } from "@/core/utils/http.util";

const MENU_GAP = 6;
const VIEWPORT_PAD = 8;

export type TopNavGroupItem = {
  href: string;
  label: string;
  active: boolean;
};

type AccentResolved = ReturnType<typeof resolveDashboardAccent>;

function navInactive() {
  return cn(
    "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800",
  );
}

/** Compact top-bar link (Hydrogen / mobile strip). */
export function TopNavLink({
  href,
  label,
  icon: Icon,
  active,
  resolved,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  resolved: AccentResolved;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
        active ? resolved.navActiveClassName : navInactive(),
      )}
      style={active ? resolved.navActiveStyle : undefined}
    >
      <Icon className="size-3.5" strokeWidth={1.75} aria-hidden />
      {label}
    </Link>
  );
}

/**
 * Parent item with hover/click dropdown (Quotes, Jobs, Contacts, Products).
 * Menu is portaled with fixed positioning so it is not clipped by the nav scroll strip.
 */
export function TopNavGroup({
  label,
  icon: Icon,
  active,
  resolved,
  items,
}: {
  label: string;
  icon: LucideIcon;
  active: boolean;
  resolved: AccentResolved;
  items: TopNavGroupItem[];
}) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{
    top: number;
    left: number;
    width: number;
    openAbove: boolean;
  } | null>(null);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const updateCoords = React.useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuHeight = menuEl?.offsetHeight ?? Math.min(items.length * 40 + 12, 320);
    const menuWidth = Math.max(rect.width, 176);

    let left = rect.left;
    if (left + menuWidth > window.innerWidth - VIEWPORT_PAD) {
      left = Math.max(VIEWPORT_PAD, window.innerWidth - menuWidth - VIEWPORT_PAD);
    }

    const spaceBelow = window.innerHeight - rect.bottom - MENU_GAP;
    const spaceAbove = rect.top - MENU_GAP;
    const openAbove = spaceBelow < menuHeight && spaceAbove > spaceBelow;
    const top = openAbove ? rect.top - MENU_GAP : rect.bottom + MENU_GAP;

    setCoords({
      top,
      left,
      width: menuWidth,
      openAbove,
    });
  }, [items.length]);

  const openMenu = React.useCallback(() => {
    clearCloseTimer();
    updateCoords();
    setOpen(true);
  }, [clearCloseTimer, updateCoords]);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updateCoords();
    const id = requestAnimationFrame(() => updateCoords());
    return () => cancelAnimationFrame(id);
  }, [open, updateCoords]);

  React.useEffect(() => () => clearCloseTimer(), [clearCloseTimer]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onScrollOrResize = () => updateCoords();
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, updateCoords]);

  const menu =
    open && coords && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            role="menu"
            aria-label={label}
            className={cn(
              "fixed z-[120] min-w-[11rem] p-1",
              popoverPanelClassName,
              coords.openAbove && "-translate-y-full",
            )}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onMouseEnter={openMenu}
            onMouseLeave={scheduleClose}
          >
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "block rounded-md px-2.5 py-2 text-[13px] font-medium tracking-tight transition",
                  item.active
                    ? resolved.navActiveClassName
                    : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-white",
                )}
                style={item.active ? resolved.navActiveStyle : undefined}
              >
                <span className="block truncate">{item.label}</span>
              </Link>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={openMenu}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (open) {
            setOpen(false);
            return;
          }
          openMenu();
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition",
          active ? resolved.navActiveClassName : navInactive(),
        )}
        style={active ? resolved.navActiveStyle : undefined}
      >
        <Icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        <span>{label}</span>
        <ChevronDown
          className={cn(
            "size-3 shrink-0 opacity-70 transition-transform duration-150",
            open && "rotate-180",
          )}
          strokeWidth={2}
          aria-hidden
        />
      </button>
      {menu}
    </div>
  );
}
