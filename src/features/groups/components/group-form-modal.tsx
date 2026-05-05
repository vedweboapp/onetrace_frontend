"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { createGroup, updateGroup } from "@/features/groups/api/group.api";
import type { Group } from "@/features/groups/types/group.types";
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
  mode: "create" | "edit";
  group: Group | null;
  onSaved: () => void;
};

export function GroupFormModal({ open, onClose, mode, group, onSaved }: Props) {
  const t = useTranslations("Dashboard.groups.modal");

  const nameId = React.useId();
  const [name, setName] = React.useState(() => (mode === "edit" && group ? group.name : ""));
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);

  const nameInvalid = nameTouched && name.trim().length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    if (!name.trim()) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && group) {
        await updateGroup(group.id, { name: name.trim() });
        toastSuccess(t("updatedToast"));
      } else {
        await createGroup({ name: name.trim() });
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } catch {
      
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
      title={mode === "edit" ? t("editTitle") : t("createTitle")}
      size="md"
      showCloseButton
      closeOnBackdrop={!submitting}
      isBusy={submitting}
      footer={
        <>
          <AppButton type="button" variant="secondary" size="md" disabled={submitting} onClick={handleCloseAttempt}>
            {t("cancel")}
          </AppButton>
          <AppButton type="submit" form="group-form" variant="primary" size="md" loading={submitting}>
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="group-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
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
      </form>
    </AppModal>
  );
}
