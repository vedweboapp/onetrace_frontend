"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createDrawing } from "@/features/projects/api/drawing.api";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  FieldLabel,
  fieldErrorTextClassName,
  surfaceInputClassName,
} from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  projectId: number;
  suggestedOrder: number;
  onCreated: () => void;
};

export function DrawingUploadModal({
  open,
  onClose,
  projectId,
  suggestedOrder,
  onCreated,
}: Props) {
  const t = useTranslations("Dashboard.projects.drawings.modal");

  const nameId = React.useId();
  const fileId = React.useId();

  const [name, setName] = React.useState("");
  const [file, setFile] = React.useState<File | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [fileTouched, setFileTouched] = React.useState(false);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const fileInvalid = fileTouched && !file;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    setFileTouched(true);
    if (!file || name.trim().length === 0) return;

    setSubmitting(true);
    try {
      await createDrawing(projectId, {
        name: name.trim(),
        order: suggestedOrder,
        file,
      });
      toastSuccess(t("createdToast"));
      onCreated();
      onClose();
    } catch {
      /* errors surfaced by axios interceptor toast */
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAttempt() {
    if (!submitting) onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={t("title")}
      size="lg"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton
            type="submit"
            form="drawing-upload-form"
            variant="primary"
            size="md"
            loading={submitting}
          >
            {t("submit")}
          </AppButton>
        </>
      }
    >
      <form id="drawing-upload-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        <div>
          <FieldLabel htmlFor={nameId} required>
            {t("name")}
          </FieldLabel>
          <input
            id={nameId}
            type="text"
            autoComplete="off"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
            disabled={submitting}
            placeholder={t("namePlaceholder")}
            className={surfaceInputClassName}
          />
          {nameInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor={fileId} required>
            {t("file")}
          </FieldLabel>
          <input
            id={fileId}
            type="file"
            disabled={submitting}
            accept=".pdf,application/pdf,image/*"
            onBlur={() => setFileTouched(true)}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className={surfaceInputClassName}
          />
          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{t("fileHint")}</p>
          {fileInvalid ? <p className={fieldErrorTextClassName}>{t("fileError")}</p> : null}
        </div>
      </form>
    </AppModal>
  );
}
