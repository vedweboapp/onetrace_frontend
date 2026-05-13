"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useSnackbarStore, type SnackbarItem } from "@/shared/feedback/snackbar-store";
import { cn } from "@/core/utils/http.util";

function useIsClient(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

function SnackbarCard({ item }: { item: SnackbarItem }) {
  const dismiss = useSnackbarStore((s) => s.dismiss);

  React.useEffect(() => {
    const t = window.setTimeout(() => dismiss(item.id), item.durationMs);
    return () => window.clearTimeout(t);
  }, [item.id, item.durationMs, dismiss]);

  const isSuccess = item.variant === "success";

  return (
    <div
      role="status"
      className={cn(
        "flex max-w-[min(100vw-2rem,24rem)] items-start gap-3 border border-slate-200 bg-white px-3.5 py-3 shadow-[0_10px_40px_-12px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950 dark:shadow-[0_10px_40px_-12px_rgba(0,0,0,0.65)]",
        "rounded-none motion-safe:animate-[snackbar-enter_0.22s_ease-out]",
        isSuccess
          ? "border-l-[3px] border-l-emerald-600 dark:border-l-emerald-500"
          : "border-l-[3px] border-l-red-600 dark:border-l-red-500",
      )}
    >
      {isSuccess ? (
        <CheckCircle2
          className="mt-0.5 size-[1.125rem] shrink-0 text-emerald-600 dark:text-emerald-400"
          strokeWidth={2}
          aria-hidden
        />
      ) : (
        <AlertCircle
          className="mt-0.5 size-[1.125rem] shrink-0 text-red-600 dark:text-red-400"
          strokeWidth={2}
          aria-hidden
        />
      )}
      <div className="min-w-0 flex-1 pt-px text-sm font-medium leading-snug tracking-tight text-slate-900 dark:text-slate-100">
        {item.message}
      </div>
      <button
        type="button"
        onClick={() => dismiss(item.id)}
        className={cn(
          "shrink-0 rounded-none border border-transparent p-1 text-slate-500 transition-colors",
          "hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900",
          "dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-900 dark:hover:text-slate-100",
        )}
        aria-label="Dismiss notification"
      >
        <X className="size-4" strokeWidth={2} aria-hidden />
      </button>
    </div>
  );
}

export function SnackbarHost() {
  const items = useSnackbarStore((s) => s.items);
  const isClient = useIsClient();

  if (!isClient || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] flex flex-col items-stretch gap-2 p-4 sm:items-end sm:p-5"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {items.map((item) => (
        <div key={item.id} className="pointer-events-auto flex justify-center sm:justify-end">
          <SnackbarCard item={item} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
