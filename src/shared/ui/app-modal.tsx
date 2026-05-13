"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/core/utils/http.util";

const closeIconButtonClass = cn(
  "absolute right-3 top-3 z-10 inline-flex size-7 items-center justify-center rounded-lg outline-none transition sm:right-4 sm:top-4",
  "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
  "focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
  "disabled:pointer-events-none disabled:opacity-40",
  "dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 dark:focus-visible:ring-slate-600 dark:focus-visible:ring-offset-slate-900",
);

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
} as const;

export type AppModalSize = keyof typeof sizeClass;

export type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  titleId?: string;
  description?: React.ReactNode;
  descriptionId?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: AppModalSize;
  closeOnBackdrop?: boolean;
  isBusy?: boolean;
  /** Small “X” in the top-right; default on for all modals. */
  showCloseButton?: boolean;
  /** Accessible name for the close control (translate in forms if needed). */
  closeButtonAriaLabel?: string;
};

/**
 * Centered overlay dialog — consistent backdrop, rounding, typography.
 */
export function AppModal({
  open,
  onClose,
  title,
  titleId: titleIdProp,
  description,
  descriptionId: descriptionIdProp,
  children,
  footer,
  size = "md",
  closeOnBackdrop = true,
  isBusy = false,
  showCloseButton = true,
  closeButtonAriaLabel = "Close",
}: AppModalProps) {
  const autoTitleId = React.useId();
  const autoDescId = React.useId();
  const titleId = titleIdProp ?? (title ? autoTitleId : undefined);
  const descriptionId = descriptionIdProp ?? (description ? autoDescId : undefined);

  React.useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isBusy) onClose();
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open, onClose, isBusy]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-[1px]"
      role="presentation"
      onClick={() => (closeOnBackdrop && !isBusy ? onClose() : undefined)}
    >
      <div
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className={cn(
          "relative max-h-[92vh] w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-7",
          sizeClass[size],
          "dark:border-slate-700 dark:bg-slate-900",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton ? (
          <button
            type="button"
            className={closeIconButtonClass}
            aria-label={closeButtonAriaLabel}
            disabled={isBusy}
            onClick={onClose}
          >
            <X className="size-3.5 shrink-0" strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        {(title || description) ? (
          <div className={cn(showCloseButton && "pr-9 sm:pr-10")}>
            {title ? (
              <h2
                id={titleId}
                className={cn("text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50")}
              >
                {title}
              </h2>
            ) : null}
            {description ? (
              <p
                id={descriptionId}
                className={cn(title ? "mt-2" : "", "text-sm text-slate-600 dark:text-slate-400")}
              >
                {description}
              </p>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            title || description || showCloseButton ? "mt-5" : "",
            showCloseButton && !title && !description ? "pt-1" : "",
          )}
        >
          {children}
        </div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
