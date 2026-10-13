"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createUnitType, updateUnitType } from "@/features/unit-types/api/unit-type.api";
import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import { formatUnitTypeLabel } from "@/features/unit-types/utils/unit-type-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldGroup, surfaceInputClassName } from "@/shared/ui";

export type UnitTypeFormModalProps = {
  open: boolean;
  onClose: () => void;
  editing?: UnitType | null;
  onSaved?: (row: UnitType) => void;
};

export function UnitTypeFormModal({
  open,
  onClose,
  editing = null,
  onSaved,
}: UnitTypeFormModalProps) {
  const t = useTranslations("Dashboard.unitTypes");
  const isEdit = editing != null;

  const [unitName, setUnitName] = React.useState("");
  const [unitShortForm, setUnitShortForm] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ name?: string; shortForm?: string }>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setUnitName(formatUnitTypeLabel(editing));
      setUnitShortForm(editing.short_form?.trim() || "");
    } else {
      setUnitName("");
      setUnitShortForm("");
    }
    setErrors({});
  }, [open, editing]);

  async function submitForm() {
    const formSchema = z.object({
      name: zTrimmedNonEmpty(t("validationName")),
      shortForm: zTrimmedNonEmpty(t("validationShortForm")),
    });
    const parsed = formSchema.safeParse({ name: unitName, shortForm: unitShortForm });
    if (!parsed.success) {
      const nextErrors: { name?: string; shortForm?: string } = {};
      for (const issue of parsed.error.issues) {
        if (String(issue.path[0] ?? "") === "name") nextErrors.name = String(issue.message);
        if (String(issue.path[0] ?? "") === "shortForm") nextErrors.shortForm = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { name, shortForm } = parsed.data;
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateUnitType(editing.id, { name, short_form: shortForm })
        : await createUnitType({ name, short_form: shortForm });
      toastSuccess(isEdit ? t("saved") : t("created"));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        t("loadError"),
        { fieldMap: { short_form: "shortForm" } },
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
      titleId="unit-type-quick-create-form"
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
              {t("modal.unitName")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="unit-type-quick-name"
        >
          <input
            id="unit-type-quick-name"
            value={unitName}
            placeholder={t("modal.unitNamePlaceholder")}
            onChange={(e) => {
              setUnitName(sanitizeTitleInput(e.target.value));
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
              {t("modal.unitShortForm")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="unit-type-quick-short"
        >
          <input
            id="unit-type-quick-short"
            value={unitShortForm}
            placeholder={t("modal.unitShortFormPlaceholder")}
            onChange={(e) => {
              setUnitShortForm(sanitizeTitleInput(e.target.value));
              if (errors.shortForm) setErrors((prev) => ({ ...prev, shortForm: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.shortForm && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.shortForm ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.shortForm}</p>
          ) : null}
        </FieldGroup>
      </div>
    </AppModal>
  );
}
