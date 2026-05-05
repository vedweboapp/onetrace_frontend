import type { ReactNode } from "react";
import { toast as sonnerToast } from "sonner";
import type { ExternalToast } from "sonner";

/** Use these instead of importing `toast` directly so UX stays centralized. */
export function toastSuccess(message: ReactNode, data?: ExternalToast) {
  return sonnerToast.success(message, data);
}

export function toastError(message: ReactNode, data?: ExternalToast) {
  return sonnerToast.error(message, data);
}
