"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createVendorType, updateVendorType } from "@/features/vendor-types/api/vendor-type.api";
import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import {
  formatVendorTypeLabel,
  normalizeVendorTypeHex,
} from "@/features/vendor-types/utils/vendor-type-display.util";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldGroup, surfaceInputClassName } from "@/shared/ui";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export type VendorTypeFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** When set, modal opens in edit mode. Omit for create. */
  editing?: VendorType | null;
  onSaved?: (row: VendorType) => void;
};

export function VendorTypeFormModal({ open, onClose, editing = null, onSaved }: VendorTypeFormModalProps) {
  const t = useTranslations("Dashboard.vendorTypes");
  const isEdit = editing != null;

  const [typeName, setTypeName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; bg_color?: string; text_color?: string }>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTypeName(formatVendorTypeLabel(editing));
      setBgColour(normalizeVendorTypeHex(editing.bg_color, DEFAULT_BG));
      setTextColour(normalizeVendorTypeHex(editing.text_color, DEFAULT_TEXT));
      setIsActive(editing.is_active);
    } else {
      setTypeName("");
      setBgColour(DEFAULT_BG);
      setTextColour(DEFAULT_TEXT);
      setIsActive(true);
    }
    setErrors({});
  }, [open, editing]);

  async function submitForm() {
    const formSchema = z.object({
      name: zTrimmedNonEmpty(t("validationName")),
      bg_color: zHexColour6(t("validationHex")),
      text_color: zHexColour6(t("validationHex")),
    });
    const parsed = formSchema.safeParse({ name: typeName, bg_color: bgColour, text_color: textColour });
    if (!parsed.success) {
      const nextErrors: { name?: string; bg_color?: string; text_color?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "name") nextErrors.name = String(issue.message);
        if (field === "bg_color") nextErrors.bg_color = String(issue.message);
        if (field === "text_color") nextErrors.text_color = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { name, bg_color: bg, text_color: fg } = parsed.data;
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateVendorType(editing.id, { name, bg_color: bg, text_color: fg, is_active: isActive })
        : await createVendorType({ name, bg_color: bg, text_color: fg });
      toastSuccess(isEdit ? t("saved") : t("created"));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        t("loadError"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      open={open}
      onClose={() => (!saving ? onClose() : undefined)}
      title={isEdit ? t("modal.editTitle") : t("modal.createTitle")}
      titleId="vendor-type-form-title"
      closeOnBackdrop={!saving}
      isBusy={saving}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="sm" disabled={saving} onClick={onClose}>
            {t("modal.cancel")}
          </AppButton>
          <AppButton type="button" variant="primary" size="sm" loading={saving} onClick={() => void submitForm()}>
            {t("modal.save")}
          </AppButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FieldGroup
          label={
            <span>
              {t("modal.typeName")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="vendor-type-name"
        >
          <input
            id="vendor-type-name"
            value={typeName}
            onChange={(e) => {
              setTypeName(sanitizeTitleInput(e.target.value));
              if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.name ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.name}</p> : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.bgColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="vendor-type-modal-bg"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeVendorTypeHex(bgColour, DEFAULT_BG).slice(0, 7)}
              onChange={(e) => setBgColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.bgColour")}
            />
            <input
              id="vendor-type-modal-bg"
              value={bgColour}
              onChange={(e) => {
                setBgColour(e.target.value);
                if (errors.bg_color) setErrors((prev) => ({ ...prev, bg_color: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                "px-3 font-mono",
                errors.bg_color && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              placeholder={t("hexPlaceholder")}
              spellCheck={false}
            />
          </div>
          {errors.bg_color ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bg_color}</p> : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.textColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="vendor-type-modal-text"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeVendorTypeHex(textColour, DEFAULT_TEXT).slice(0, 7)}
              onChange={(e) => setTextColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.textColour")}
            />
            <input
              id="vendor-type-modal-text"
              value={textColour}
              onChange={(e) => {
                setTextColour(e.target.value);
                if (errors.text_color) setErrors((prev) => ({ ...prev, text_color: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                "px-3 font-mono",
                errors.text_color && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              placeholder={t("hexPlaceholder")}
              spellCheck={false}
            />
          </div>
          {errors.text_color ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.text_color}</p>
          ) : null}
        </FieldGroup>
        {isEdit ? (
          <FieldGroup label={t("modal.activeLabel")} htmlFor="vendor-type-active">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                id="vendor-type-active"
                type="checkbox"
                className="size-4 rounded border-slate-300"
                checked={isActive}
                disabled={saving}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              {isActive ? t("status.active") : t("status.inactive")}
            </label>
          </FieldGroup>
        ) : null}
      </div>
    </AppModal>
  );
}
