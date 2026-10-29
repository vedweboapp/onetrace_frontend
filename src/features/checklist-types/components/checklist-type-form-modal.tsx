"use client";

import * as React from "react";
import { Paperclip, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createChecklistType } from "@/features/checklist-types/api/checklist-type.api";
import type { ChecklistType } from "@/features/checklist-types/types/checklist-type.types";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import { formatProjectTypeLabel } from "@/features/project-types/utils/project-type-display.util";
import { reportLocalFormSubmitApiError, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  FieldGroup,
  surfaceInputClassName,
} from "@/shared/ui";

export type ChecklistTypeFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** Prefills and optionally locks project type (e.g. from Create Job dialog). */
  defaultProjectTypeId?: number | null;
  lockProjectType?: boolean;
  onSaved?: (row: ChecklistType) => void;
};

export function ChecklistTypeFormModal({
  open,
  onClose,
  defaultProjectTypeId = null,
  lockProjectType = false,
  onSaved,
}: ChecklistTypeFormModalProps) {
  const t = useTranslations("Dashboard.checklistTypes");

  const [title, setTitle] = React.useState("");
  const [projectTypeId, setProjectTypeId] = React.useState("");
  const [isRequired, setIsRequired] = React.useState(true);
  const [file, setFile] = React.useState<File | null>(null);
  const [projectTypeOptions, setProjectTypeOptions] = React.useState<
    { value: string; label: string }[]
  >([]);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    title?: string;
    project_type?: string;
    file?: string;
  }>({});

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setProjectTypeId(
      defaultProjectTypeId != null && defaultProjectTypeId > 0
        ? String(defaultProjectTypeId)
        : "",
    );
    setIsRequired(true);
    setFile(null);
    setErrors({});
  }, [open, defaultProjectTypeId]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectTypesPage(1, 20, { is_active: true, dropdown: true });
        if (cancelled) return;
        setProjectTypeOptions(
          items.map((row) => ({ value: String(row.id), label: formatProjectTypeLabel(row) })),
        );
      } catch {
        if (!cancelled) setProjectTypeOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function submitForm() {
    const formSchema = z.object({
      title: zTrimmedNonEmpty(t("validationTitle")),
      project_type: z
        .string()
        .trim()
        .min(1, { message: t("validationProjectType") })
        .refine((v) => /^\d+$/.test(v) && Number.parseInt(v, 10) > 0, {
          message: t("validationProjectType"),
        }),
    });
    const parsed = formSchema.safeParse({ title, project_type: projectTypeId });
    const nextErrors: { title?: string; project_type?: string; file?: string } = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "title") nextErrors.title = String(issue.message);
        if (field === "project_type") nextErrors.project_type = String(issue.message);
      }
    }
    if (!file) {
      nextErrors.file = t("modal.validationFile");
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    if (!parsed.success || !file) return;

    setErrors({});
    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("title", parsed.data.title);
      payload.append("project_type", parsed.data.project_type);
      payload.append("is_required", String(isRequired));
      payload.append("concentric_point", "false");
      payload.append("file", file);
      const saved = await createChecklistType(payload);
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
      titleId="checklist-type-quick-create-form"
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
              {t("modal.title")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="checklist-type-quick-title"
        >
          <input
            id="checklist-type-quick-title"
            value={title}
            onChange={(e) => {
              setTitle(sanitizeTitleInput(e.target.value));
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
        <FieldGroup
          label={
            <span>
              {t("modal.projectType")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="checklist-type-quick-project-type"
        >
          <CheckmarkSelect
            id="checklist-type-quick-project-type"
            options={projectTypeOptions}
            value={projectTypeId}
            onChange={(next) => {
              setProjectTypeId(next);
              if (errors.project_type) setErrors((prev) => ({ ...prev, project_type: undefined }));
            }}
            emptyLabel={t("filterProjectTypePlaceholder")}
            disabled={saving || lockProjectType}
            locked={lockProjectType}
            invalid={Boolean(errors.project_type)}
            portaled
            searchable
          />
          {errors.project_type ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.project_type}</p>
          ) : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.file")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="checklist-type-quick-file"
        >
          <div className="flex items-center gap-3">
            <label
              htmlFor="checklist-type-quick-file"
              className={cn(
                "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
                "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800",
                errors.file && "border-red-500",
              )}
            >
              <Paperclip className="size-4" aria-hidden />
              {file ? t("modal.replaceFile") : t("modal.chooseFile")}
            </label>
            <input
              id="checklist-type-quick-file"
              type="file"
              className="sr-only"
              disabled={saving}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                if (errors.file) setErrors((prev) => ({ ...prev, file: undefined }));
              }}
            />
            {file ? (
              <span className="flex min-w-0 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="min-w-0 max-w-[10rem] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label={t("modal.removeFile")}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="size-3.5" />
                </button>
              </span>
            ) : null}
          </div>
          {errors.file ? <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.file}</p> : null}
        </FieldGroup>
        <FieldGroup label={t("modal.requiredLabel")} htmlFor="checklist-type-quick-required">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              id="checklist-type-quick-required"
              type="checkbox"
              className="size-4 rounded border-slate-300"
              checked={isRequired}
              disabled={saving}
              onChange={(e) => setIsRequired(e.target.checked)}
            />
            {isRequired ? t("required.yes") : t("required.no")}
          </label>
        </FieldGroup>
      </div>
    </AppModal>
  );
}
