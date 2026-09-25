"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createTitle } from "@/features/titles/api/title.api";
import type { Title } from "@/features/titles/types/title.types";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldGroup, surfaceInputClassName } from "@/shared/ui";

export type TitleFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (row: Title) => void;
};

export function TitleFormModal({ open, onClose, onSaved }: TitleFormModalProps) {
  const t = useTranslations("Dashboard.titleSettings");
  const [titleName, setTitleName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{ title?: string }>({});

  React.useEffect(() => {
    if (!open) return;
    setTitleName("");
    setErrors({});
  }, [open]);

  async function submitForm() {
    const formSchema = z.object({
      title: zTrimmedNonEmpty(t("validationName")),
    });
    const parsed = formSchema.safeParse({ title: titleName });
    if (!parsed.success) {
      const nextErrors: { title?: string } = {};
      for (const issue of parsed.error.issues) {
        if (String(issue.path[0] ?? "") === "title") {
          nextErrors.title = String(issue.message);
        }
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    try {
      const saved = await createTitle({ title: parsed.data.title });
      toastSuccess(t("created"));
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
      title={t("modal.createTitle")}
      titleId="title-quick-create-form"
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
      <FieldGroup
        label={
          <span>
            {t("modal.titleName")} <span className="text-red-500">*</span>
          </span>
        }
        htmlFor="quick-title-name"
      >
        <input
          id="quick-title-name"
          value={titleName}
          placeholder={t("modal.titleNamePlaceholder")}
          onChange={(e) => {
            setTitleName(sanitizeTitleInput(e.target.value));
            if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
          }}
          className={cn(
            surfaceInputClassName,
            errors.title && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
          )}
          autoComplete="off"
        />
        {errors.title ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.title}</p> : null}
      </FieldGroup>
    </AppModal>
  );
}
