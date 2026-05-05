"use client";

import type { ReactNode } from "react";
import { AppButton } from "./app-button";
import { AppModal } from "./app-modal";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  body: ReactNode;
  /** Highlight (e.g. entity name) shown in a subdued box under the body */
  highlight?: string;
  confirmLabel: string;
  cancelLabel: string;
  isBusy?: boolean;
  confirmVariant?: "danger" | "primary";
};

/**
 * Opinionated confirm/delete pattern wrapping {@link AppModal}.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  body,
  highlight,
  confirmLabel,
  cancelLabel,
  isBusy = false,
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      closeOnBackdrop={!isBusy}
      isBusy={isBusy}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={isBusy} onClick={onClose}>
            {cancelLabel}
          </AppButton>
          <AppButton
            type="button"
            variant={confirmVariant === "danger" ? "danger" : "primary"}
            size="md"
            loading={isBusy}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </AppButton>
        </>
      }
    >
      <>
        <p className="text-sm text-slate-600 dark:text-slate-400">{body}</p>
        {highlight ? (
          <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            {highlight}
          </p>
        ) : null}
      </>
    </AppModal>
  );
}
