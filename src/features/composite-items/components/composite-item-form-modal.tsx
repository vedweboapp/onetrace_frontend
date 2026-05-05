"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  createCompositeItem,
  updateCompositeItem,
} from "@/features/composite-items/api/composite-item.api";
import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldLabel, fieldErrorTextClassName, surfaceInputClassName, surfaceSelectClassName } from "@/shared/ui";

type Props = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  item: CompositeItem | null;
  groupOptions: { value: string; label: string }[];
  onSaved: () => void;
};

export function CompositeItemFormModal({ open, onClose, mode, item, groupOptions, onSaved }: Props) {
  const t = useTranslations("Dashboard.compositeItems.modal");

  const nameId = React.useId();
  const groupId = React.useId();

  const [name, setName] = React.useState(() => (mode === "edit" && item ? item.name : ""));
  const [groupIdVal, setGroupIdVal] = React.useState(() =>
    mode === "edit" && item ? String(item.group) : "",
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [nameTouched, setNameTouched] = React.useState(false);
  const [groupTouched, setGroupTouched] = React.useState(false);

  const nameInvalid = nameTouched && name.trim().length === 0;
  const groupInvalid = groupTouched && groupIdVal.trim().length === 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setNameTouched(true);
    setGroupTouched(true);
    const gid = Number.parseInt(groupIdVal, 10);
    if (!name.trim() || !Number.isFinite(gid) || gid <= 0) return;

    setSubmitting(true);
    try {
      if (mode === "edit" && item) {
        await updateCompositeItem(item.id, { name: name.trim(), group: gid });
        toastSuccess(t("updatedToast"));
      } else {
        await createCompositeItem({ name: name.trim(), group: gid });
        toastSuccess(t("createdToast"));
      }
      onSaved();
      onClose();
    } catch {
      /* axios interceptor toast */
    } finally {
      setSubmitting(false);
    }
  }

  function handleCloseAttempt() {
    if (!submitting) onClose();
  }

  const noGroups = groupOptions.length === 0;

  return (
    <AppModal
      open={open}
      onClose={handleCloseAttempt}
      title={mode === "edit" ? t("editTitle") : t("createTitle")}
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
            form="composite-item-form"
            variant="primary"
            size="md"
            loading={submitting}
            disabled={noGroups}
          >
            {mode === "edit" ? t("saveChanges") : t("save")}
          </AppButton>
        </>
      }
    >
      <form id="composite-item-form" className="space-y-5" onSubmit={(e) => void submit(e)}>
        {noGroups ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            {t("noGroupsHint")}
          </p>
        ) : null}

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
            disabled={submitting || noGroups}
            placeholder={t("namePlaceholder")}
            className={surfaceInputClassName}
          />
          {nameInvalid ? <p className={fieldErrorTextClassName}>{t("nameError")}</p> : null}
        </div>

        <div>
          <FieldLabel htmlFor={groupId} required>
            {t("group")}
          </FieldLabel>
          <select
            id={groupId}
            value={groupIdVal}
            onChange={(e) => setGroupIdVal(e.target.value)}
            onBlur={() => setGroupTouched(true)}
            disabled={submitting || noGroups}
            className={surfaceSelectClassName}
          >
            <option value="">{t("groupPlaceholder")}</option>
            {groupOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {groupInvalid ? <p className={fieldErrorTextClassName}>{t("groupError")}</p> : null}
        </div>
      </form>
    </AppModal>
  );
}
