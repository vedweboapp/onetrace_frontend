"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { ChevronDown } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { resolveDashboardAccent } from "@/features/dashboard/utils/accent-resolve.util";
import { cn } from "@/core/utils/http.util";

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
 * Menu is portaled below the trigger so it isn’t clipped by the top of the viewport
 * or the nav’s horizontal scroll container.
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
  const [coords, setCoords] = React.useState<{ top: number; left: number; width: number } | null>(
    null,
  );

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
    const menuWidth = Math.max(rect.width, 176);
    const pad = 8;
    let left = rect.left;
    if (left + menuWidth > window.innerWidth - pad) {
      left = Math.max(pad, window.innerWidth - menuWidth - pad);
    }
    // Open just below the trigger (portaled — not clipped by the nav strip).
    setCoords({
      top: rect.bottom + 4,
      left,
      width: menuWidth,
    });
  }, []);

  const openMenu = React.useCallback(() => {
    clearCloseTimer();
    updateCoords();
    setOpen(true);
  }, [clearCloseTimer, updateCoords]);

  const scheduleClose = React.useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 140);
  }, [clearCloseTimer]);

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
              "fixed z-[120] min-w-[11rem] rounded-lg border border-slate-200/90 bg-white p-1 shadow-lg",
              "ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-900 dark:ring-white/10",
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
