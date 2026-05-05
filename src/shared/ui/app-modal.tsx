"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "./app-button";

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
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
  showCloseButton?: boolean;
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
  showCloseButton = false,
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
        {(title || showCloseButton) ? (
          <div className="flex items-start gap-3">
            {title ? (
              <h2
                id={titleId}
                className={cn(
                  "min-w-0 flex-1 text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50",
                )}
              >
                {title}
              </h2>
            ) : null}
            {showCloseButton ? (
              <AppButton
                type="button"
                variant="ghost"
                size="sm"
                className="size-9 shrink-0 p-0 text-slate-500"
                aria-label="Close"
                disabled={isBusy}
                onClick={onClose}
              >
                <X className="size-4" strokeWidth={2} aria-hidden />
              </AppButton>
            ) : null}
          </div>
        ) : null}
        {description ? (
          <p
            id={descriptionId}
            className={cn(title || showCloseButton ? "mt-2" : "", "text-sm text-slate-600 dark:text-slate-400")}
          >
            {description}
          </p>
        ) : null}
        <div className={cn(title || showCloseButton || description ? "mt-5" : "")}>{children}</div>
        {footer ? <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}
