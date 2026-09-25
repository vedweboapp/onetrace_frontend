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
  /** Highlight (e.g. entity name / structured summary) shown in a subdued box under the body */
  highlight?: ReactNode;
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
          <AppButton type="button" variant="secondary" size="sm" disabled={isBusy} onClick={onClose}>
            {cancelLabel}
          </AppButton>
          <AppButton
            type="button"
            variant={confirmVariant === "danger" ? "danger" : "primary"}
            size="sm"
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
          <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100">
            {typeof highlight === "string" ? (
              <p className="font-medium">{highlight}</p>
            ) : (
              highlight
            )}
          </div>
        ) : null}
      </>
    </AppModal>
  );
}
