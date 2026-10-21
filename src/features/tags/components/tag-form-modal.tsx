"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { cn } from "@/core/utils/http.util";
import { createTag, updateTag } from "@/features/tags/api/tag.api";
import type { Tag } from "@/features/tags/types/tag.types";
import { reportLocalFormSubmitApiError, zHexColour6, zTrimmedNonEmpty } from "@/shared/form";
import { sanitizeTitleInput } from "@/shared/form/field-input.util";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppModal, FieldGroup, surfaceInputClassName } from "@/shared/ui";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

function normalizeHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.slice(0, 7).toLowerCase();
}

function tagLabel(row: Tag): string {
  return row.name?.trim() || row.tag_name?.trim() || `Tag #${row.id}`;
}

function bgHex(row: Tag): string {
  const value =
    (row as Tag & { bg_color?: string | null }).bg_colour ??
    (row as Tag & { bg_color?: string | null }).bg_color;
  return normalizeHex(value, DEFAULT_BG);
}

function textHex(row: Tag): string {
  const value =
    (row as Tag & { text_color?: string | null }).text_colour ??
    (row as Tag & { text_color?: string | null }).text_color;
  return normalizeHex(value, DEFAULT_TEXT);
}

export type TagFormModalProps = {
  open: boolean;
  onClose: () => void;
  /** When set, modal opens in edit mode. Omit for create. */
  editing?: Tag | null;
  onSaved?: (row: Tag) => void;
};

export function TagFormModal({ open, onClose, editing = null, onSaved }: TagFormModalProps) {
  const t = useTranslations("Dashboard.tags");
  const isEdit = editing != null;

  const [tagName, setTagName] = React.useState("");
  const [bgColour, setBgColour] = React.useState(DEFAULT_BG);
  const [textColour, setTextColour] = React.useState(DEFAULT_TEXT);
  const [saving, setSaving] = React.useState(false);
  const [errors, setErrors] = React.useState<{
    tag_name?: string;
    bg_colour?: string;
    text_colour?: string;
  }>({});

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setTagName(tagLabel(editing));
      setBgColour(bgHex(editing));
      setTextColour(textHex(editing));
    } else {
      setTagName("");
      setBgColour(DEFAULT_BG);
      setTextColour(DEFAULT_TEXT);
    }
    setErrors({});
  }, [open, editing]);

  async function submitForm() {
    const formSchema = z.object({
      tag_name: zTrimmedNonEmpty(t("validationName")),
      bg_colour: zHexColour6(t("validationHex")),
      text_colour: zHexColour6(t("validationHex")),
    });
    const parsed = formSchema.safeParse({
      tag_name: tagName,
      bg_colour: bgColour,
      text_colour: textColour,
    });
    if (!parsed.success) {
      const nextErrors: { tag_name?: string; bg_colour?: string; text_colour?: string } = {};
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0] ?? "");
        if (field === "tag_name") nextErrors.tag_name = String(issue.message);
        if (field === "bg_colour") nextErrors.bg_colour = String(issue.message);
        if (field === "text_colour") nextErrors.text_colour = String(issue.message);
      }
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    const { tag_name: name, bg_colour: bg, text_colour: fg } = parsed.data;
    setSaving(true);
    try {
      const saved = isEdit
        ? await updateTag(editing.id, { name, bg_colour: bg, text_colour: fg })
        : await createTag({ name, bg_colour: bg, text_colour: fg });
      toastSuccess(isEdit ? t("saved") : t("created"));
      onSaved?.(saved);
      onClose();
    } catch (error) {
      reportLocalFormSubmitApiError(
        error,
        (fieldErrors) => setErrors((prev) => ({ ...prev, ...fieldErrors })),
        undefined,
        {
          fieldMap: {
            name: "tag_name",
            bg_color: "bg_colour",
            text_color: "text_colour",
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
      titleId="tag-quick-create-form"
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
              {t("modal.tagName")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="tag-quick-name"
        >
          <input
            id="tag-quick-name"
            value={tagName}
            onChange={(e) => {
              setTagName(sanitizeTitleInput(e.target.value));
              if (errors.tag_name) setErrors((prev) => ({ ...prev, tag_name: undefined }));
            }}
            className={cn(
              surfaceInputClassName,
              errors.tag_name && "border-red-500 focus:border-red-500 focus:ring-red-500/20",
            )}
            autoComplete="off"
          />
          {errors.tag_name ? (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.tag_name}</p>
          ) : null}
        </FieldGroup>
        <FieldGroup
          label={
            <span>
              {t("modal.bgColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="tag-quick-bg"
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
              id="tag-quick-bg"
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
        <FieldGroup
          label={
            <span>
              {t("modal.textColour")} <span className="text-red-500">*</span>
            </span>
          }
          htmlFor="tag-quick-text"
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
              id="tag-quick-text"
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
