"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import type {
  WorkflowColourStatus,
  WorkflowColourStatusCreatePayload,
  WorkflowColourStatusUpdatePayload,
} from "@/shared/types/workflow-colour-status.types";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import {
  AppButton,
  AppModal,
  CheckmarkSelect,
  type CheckmarkSelectOption,
  FieldGroup,
  surfaceInputClassName,
} from "@/shared/ui";
export type WorkflowColourStatusMessagesNamespace =
  | "Dashboard.pinStatus"
  | "Dashboard.projectStatus"
  | "Dashboard.jobStatus"
  | "Dashboard.materialStatus";

const DEFAULT_BG = "#E5E7EB";
const DEFAULT_TEXT = "#374151";

function normalizeHex(raw: string, fallback: string): string {
  const t = raw.trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) {
    return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  }
  return h.slice(0, 7).toLowerCase();
}

export type WorkflowColourStatusFormModalProps = {
  open: boolean;
  onClose: () => void;
  translationNamespace: WorkflowColourStatusMessagesNamespace;
  formTitleId: string;
  showCategory?: boolean;
  create: (body: WorkflowColourStatusCreatePayload) => Promise<WorkflowColourStatus>;
  update?: (id: number, body: WorkflowColourStatusUpdatePayload) => Promise<WorkflowColourStatus>;
  editing?: WorkflowColourStatus | null;
  onSaved?: (row: WorkflowColourStatus) => void;
};

export function WorkflowColourStatusFormModal({
  open,
  onClose,
  translationNamespace,
  formTitleId,
  showCategory = false,
  create,
  update,
  editing = null,
  onSaved,
}: WorkflowColourStatusFormModalProps) {
  const t = useTranslations(translationNamespace);
  const isEdit = editing != null;

  const [statusName, setStatusName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [category, setCategory] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    status_name?: string;
    bg_colour?: string;
    text_colour?: string;
    category?: string;
  }>({});

  const categoryOptions = React.useMemo<CheckmarkSelectOption[]>(
    () =>
      showCategory
        ? [
            { value: "open", label: t("modal.categoryOptions.open") },
            { value: "closed", label: t("modal.categoryOptions.closed") },
          ]
        : [],
    [showCategory, t],
  );

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setStatusName(editing.status_name?.trim() || "");
      setBgColour(normalizeHex(editing.bg_colour ?? "", DEFAULT_BG));
      setTextColour(normalizeHex(editing.text_colour ?? "", DEFAULT_TEXT));
      setCategory((editing.category ?? "").trim());
    } else {
      setStatusName("");
      setBgColour(DEFAULT_BG);
      setTextColour(DEFAULT_TEXT);
      setCategory("");
    }
    setErrors({});
  }, [open, editing]);

  async function submitForm() {
    const formSchema = z.object({
      status_name: zTrimmedNonEmpty(t("validationName")),
      bg_colour: zHexColour6(t("validationHex")),
      text_colour: zHexColour6(t("validationHex")),
      category: z.string().trim().optional(),
    });
    const parsed = formSchema.safeParse({
      status_name: statusName,
      bg_colour: bgColour,
      text_colour: textColour,
      category,
    });
    if (!parsed.success) {
      const nextErrors: {
        status_name?: string;
        bg_colour?: string;
        text_colour?: string;
        category?: string;
      } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "status_name") nextErrors.status_name = String(issue.message);
        if (field === "bg_colour") nextErrors.bg_colour = String(issue.message);
        if (field === "text_colour") nextErrors.text_colour = String(issue.message);
        if (field === "category") nextErrors.category = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { status_name: name, bg_colour: bg, text_colour: fg, category: rawCategory } = parsed.data;
    const trimmedCategory = rawCategory?.trim() ?? "";

    setSaving(true);
    try {
      const saved =
        isEdit && update
          ? await update(editing.id, {
              status_name: name,
              bg_colour: bg,
              text_colour: fg,
              category: trimmedCategory,
            })
          : await create({
              status_name: name,
              bg_colour: bg,
              text_colour: fg,
              ...(trimmedCategory ? { category: trimmedCategory } : {}),
            });
      toastSuccess(isEdit ? t("saved") : t("created"));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        t("loadError"),
        {
          fieldMap: {
            bg_color: "bg_colour",
            text_color: "text_colour",
            name: "status_name",
          },
        },
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
      titleId={formTitleId}
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
      <div className="space-y-4">
        <FieldGroup
          label={
            <span>
              {t("modal.statusName")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor={`${formTitleId}-name`}
        >
          <input
            id={`${formTitleId}-name`}
            value={statusName}
            onChange={(e) => {
              setStatusName(sanitizeTitleInput(e.target.value));
              if (errors.status_name) setErrors((prev) => ({ ...prev, status_name: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.status_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.status_name ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.status_name}</p>
          ) : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.bgColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor={`${formTitleId}-bg`}
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeHex(bgColour, DEFAULT_BG).slice(0, 7)}
              onChange={(e) => setBgColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.bgColour")}
            />
            <input
              id={`${formTitleId}-bg`}
              value={bgColour}
              onChange={(e) => {
                setBgColour(e.target.value);
                if (errors.bg_colour) setErrors((prev) => ({ ...prev, bg_colour: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                "px-3 font-mono",
                errors.bg_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              placeholder={t("hexPlaceholder")}
              spellCheck={false}
            />
          </div>
          {errors.bg_colour ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.bg_colour}</p>
          ) : null}
        </FieldGroup>
        {showCategory ? (
          <FieldGroup label={t("modal.category")} htmlFor={`${formTitleId}-category`}>
            <CheckmarkSelect
              id={`${formTitleId}-category`}
              options={categoryOptions}
              value={category}
              onChange={(next) => {
                setCategory(next);
                if (errors.category) setErrors((prev) => ({ ...prev, category: undefined }));
              }}
              emptyLabel={t("modal.categoryPlaceholder")}
              fallbackLabel={t("modal.categoryPlaceholder")}
              className={cn(errors.category && "ring-1 ring-red-500 focus:ring-red-500/20")}
              disabled={saving}
              onBlur={() => undefined}
            />
            {errors.category ? (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.category}</p>
            ) : null}
          </FieldGroup>
        ) : null}
        <FieldGroup
          label={
            <span>
              {t("modal.textColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor={`${formTitleId}-text`}
        >
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={normalizeHex(textColour, DEFAULT_TEXT).slice(0, 7)}
              onChange={(e) => setTextColour(e.target.value)}
              className="size-11 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 dark:border-slate-600"
              aria-label={t("modal.textColour")}
            />
            <input
              id={`${formTitleId}-text`}
              value={textColour}
              onChange={(e) => {
                setTextColour(e.target.value);
                if (errors.text_colour) setErrors((prev) => ({ ...prev, text_colour: undefined }));
              }}
              className={cn(
                surfaceInputClassName,
                "px-3 font-mono",
                errors.text_colour && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
              )}
              placeholder={t("hexPlaceholder")}
              spellCheck={false}
            />
          </div>
          {errors.text_colour ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.text_colour}</p>
          ) : null}
        </FieldGroup>
      </div>
    </AppModal>
  );
}
