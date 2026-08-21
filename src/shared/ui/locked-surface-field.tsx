"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";

export const lockedSurfaceFieldClassName = cn(
  "field-control flex h-11 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-left shadow-sm",
  "text-[length:var(--dash-body-size,0.875rem)] font-medium text-slate-400",
  "cursor-not-allowed dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-500",
);

type Props = {
  id?: string;
  value: string;
  /** Overrides the shared locked-field tooltip. */
  hint?: string;
  className?: string;
};

/**
 * Read-only control for values that cannot be changed (e.g. client set from a detail tab).
 * Matches disabled select styling, with a lock icon and hover/focus tooltip.
 */
export function LockedSurfaceField({ id, value, hint, className }: Props) {
  const t = useTranslations("Dashboard.common.lockedField");
  const tooltip = hint?.trim() || t("hint");
  const hintId = id ? `${id}-locked-hint` : undefined;
  const wrapRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [pos, setPos] = React.useState({ top: 0, left: 0 });

  const show = React.useCallback(() => setOpen(true), []);
  const hide = React.useCallback(() => setOpen(false), []);

  React.useLayoutEffect(() => {
    if (!open || !wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 8, left: r.left });
  }, [open]);

  return (
    <div
      ref={wrapRef}
      className={cn("relative w-full min-w-0", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <div
        id={id}
        role="textbox"
        aria-readonly="true"
        aria-label={t("aria")}
        aria-describedby={hintId}
        tabIndex={0}
        className={lockedSurfaceFieldClassName}
        onFocus={show}
        onBlur={hide}
      >
        <span className="min-w-0 flex-1 truncate">{value}</span>
        <Lock className="size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
      </div>
      {open && typeof document !== "undefined"
        ? createPortal(
            <p
              id={hintId}
              role="tooltip"
              style={{ top: pos.top, left: pos.left }}
              className="pointer-events-none fixed z-[400] max-w-[14rem] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-700"
            >
              {tooltip}
            </p>,
            document.body,
          )
        : null}
    </div>
  );
}
