"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AppButton, type AppButtonProps } from "@/shared/ui/app-button";

export function useDashboardActions() {
  return useTranslations("Dashboard.common.actions");
}

type ActionButtonProps = Omit<AppButtonProps, "variant" | "size" | "children"> & {
  children?: React.ReactNode;
};

export function AddButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="primary" size="sm" {...props}>
      {children ?? t("add")}
    </AppButton>
  );
}

export function SaveButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="primary" size="sm" {...props}>
      {children ?? t("save")}
    </AppButton>
  );
}

export function CancelButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="secondary" size="sm" {...props}>
      {children ?? t("cancel")}
    </AppButton>
  );
}

export function EditButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="primary" size="sm" {...props}>
      {children ?? t("edit")}
    </AppButton>
  );
}

export function DeleteButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="secondary" size="sm" {...props}>
      {children ?? t("delete")}
    </AppButton>
  );
}

export function ExportButton({ children, ...props }: ActionButtonProps) {
  const t = useDashboardActions();
  return (
    <AppButton type="button" variant="secondary" size="sm" {...props}>
      {children ?? t("export")}
    </AppButton>
  );
}

type FormDialogFooterProps = {
  onCancel: () => void;
  onSave?: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  saveType?: "button" | "submit";
  formId?: string;
};

/** Standard modal / form footer: Cancel + Save (text only). */
export function FormDialogFooter({
  onCancel,
  onSave,
  saving = false,
  saveLabel,
  cancelLabel,
  saveType = "button",
  formId,
}: FormDialogFooterProps) {
  const t = useDashboardActions();
  return (
    <>
      <CancelButton disabled={saving} onClick={onCancel}>
        {cancelLabel}
      </CancelButton>
      <SaveButton
        type={saveType}
        form={formId}
        loading={saving}
        disabled={saving}
        onClick={saveType === "button" ? onSave : undefined}
      >
        {saveLabel}
      </SaveButton>
    </>
  );
}
