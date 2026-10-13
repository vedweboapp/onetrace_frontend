"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createProjectType, updateProjectType } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import {
  formatProjectTypeLabel,
  normalizeProjectTypeHex,
  projectTypeBgHex,
  projectTypeTextHex,
} from "@/features/project-types/utils/project-type-display.util";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldGroup, surfaceInputClassName } from "@/shared/ui";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export type ProjectTypeFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** When set, modal opens in edit mode. Omit for create. */
  editing?: ProjectType | null;
  onSaved?: (row: ProjectType) => void;
};

export function ProjectTypeFormModal({
  open,
  onClose,
  editing = null,
  onSaved,
}: ProjectTypeFormModalProps) {
  const t = useTranslations("Dashboard.projectTypes");
  const isEdit = editing != null;

  const [typeName, setTypeName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [isActive, setIsActive] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    project_type?: string;
    bg_color?: string;
    text_color?: string;
  }>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTypeName(formatProjectTypeLabel(editing));
      setBgColour(projectTypeBgHex(editing));
      setTextColour(projectTypeTextHex(editing));
      setIsActive(editing.is_active !== false);
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
      project_type: zTrimmedNonEmpty(t("validationName")),
      bg_color: zHexColour6(t("validationHex")),
      text_color: zHexColour6(t("validationHex")),
    });
    const parsed = formSchema.safeParse({
      project_type: typeName,
      bg_color: bgColour,
      text_color: textColour,
    });
    if (!parsed.success) {
      const nextErrors: { project_type?: string; bg_color?: string; text_color?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "project_type") nextErrors.project_type = String(issue.message);
        if (field === "bg_color") nextErrors.bg_color = String(issue.message);
        if (field === "text_color") nextErrors.text_color = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { project_type, bg_color: bg, text_color: fg } = parsed.data;
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateProjectType(editing.id, {
            project_type,
            bg_color: bg,
            text_color: fg,
            is_active: isActive,
          })
        : await createProjectType({ project_type, bg_color: bg, text_color: fg });
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
      titleId="project-type-quick-create-form"
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
          htmlFor="project-type-quick-name"
        >
          <input
            id="project-type-quick-name"
            value={typeName}
            onChange={(e) => {
              setTypeName(sanitizeTitleInput(e.target.value));
              if (errors.project_type) setErrors((prev) => ({ ...prev, project_type: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.project_type && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.project_type ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.project_type}</p>
          ) : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.bgColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="project-type-quick-bg"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeProjectTypeHex(bgColour, DEFAULT_BG).slice(0, 7)}
              onChange={(e) => setBgColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.bgColour")}
            />
            <input
              id="project-type-quick-bg"
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
          htmlFor="project-type-quick-text"
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeProjectTypeHex(textColour, DEFAULT_TEXT).slice(0, 7)}
              onChange={(e) => setTextColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.textColour")}
            />
            <input
              id="project-type-quick-text"
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
          <FieldGroup label={t("modal.activeLabel")} htmlFor="project-type-quick-active">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
              <input
                id="project-type-quick-active"
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
