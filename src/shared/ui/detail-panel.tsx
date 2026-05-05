"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "./app-button";

export type DetailPanelProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;

  widthClassName?: string;

  isBusy?: boolean;
  showCloseButton?: boolean;
};


export function DetailPanel({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClassName = "sm:max-w-xl",
  isBusy = false,
  showCloseButton = true,
}: DetailPanelProps) {
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
    <>
      <div
        className="fixed inset-0 z-[90] bg-slate-950/40 backdrop-blur-[1px] transition-opacity"
        role="presentation"
        aria-hidden
        onClick={() => (!isBusy ? onClose() : undefined)}
      />
      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-[100] flex max-h-dvh min-h-0 w-full flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl",
          widthClassName,
          "transition-[transform,opacity] duration-200 motion-reduce:transition-none dark:border-slate-800 dark:bg-slate-950",
        )}
      >
        <header className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 py-4 sm:px-6 dark:border-slate-800">
          <div className="min-w-0 flex-1 space-y-1">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50">{title}</h2>
            {subtitle ? (
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitle}</p>
            ) : null}
          </div>
          {showCloseButton ? (
            <AppButton
              type="button"
              variant="ghost"
              size="sm"
              className="size-9 shrink-0 p-0 text-slate-500"
              aria-label="Close panel"
              disabled={isBusy}
              onClick={onClose}
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
            </AppButton>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-5 sm:px-6">{children}</div>
        {footer ? (
          <footer className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-slate-200 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-900/70 sm:px-6">
            {footer}
          </footer>
        ) : null}
      </aside>
    </>
  );
}
