import type { ReactNode } from "react";
import { useSnackbarStore } from "@/shared/feedback/snackbar-store";

export type AppToastOptions = {
  /** Defaults: success 4000ms, error 5500ms */
  duration?: number;
};

/** Centralized notifications — renders via `SnackbarHost` in the locale layout. */
export function toastSuccess(message: ReactNode, options?: AppToastOptions) {
  if (typeof window === "undefined") return "";
  const durationMs = options?.duration ?? 4000;
  return useSnackbarStore.getState().push({ variant: "success", message, durationMs });
}

export function toastError(message: ReactNode, options?: AppToastOptions) {
  if (typeof window === "undefined") return "";
  const durationMs = options?.duration ?? 5500;
  return useSnackbarStore.getState().push({ variant: "error", message, durationMs });
}
