"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Lock, Pencil, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { MultiCheckSelect } from "@/shared/ui/multi-check-select";
import { PhoneNumberInput } from "@/shared/ui/phone-number-input";
import { MoneyInput } from "@/shared/ui/money-input";
import { openNativeDatePicker, SurfaceDateInput } from "@/shared/ui/surface-date-input";
import { FieldErrorText, RequiredMark, fieldLabelClassName } from "@/shared/ui/field-primitives";
import { isAppValidPhoneNumber, normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";
import {
  claimDetailInlineEdit,
  isDetailInlineEditBlocked,
  releaseDetailInlineEdit,
  subscribeDetailInlineEditLock,
} from "@/shared/components/layout/detail-inline-edit-lock";
import { FIELD_MAX_LENGTH, clampFieldLength } from "@/shared/form/field-max-length.util";

export type DetailEditableFieldKind = "text" | "email" | "tel" | "date" | "select" | "multiselect" | "money";

type DetailEditableFieldEditorProps = {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  saving: boolean;
  editAriaLabel: string;
  editorClassName: string;
};

/** Detail label — muted; placement follows Appearance (left/right/top). */
export const detailFieldLabelClassName = cn(
  fieldLabelClassName,
  "font-normal text-slate-500 dark:text-slate-400",
);

/** Soft box shared by display + edit — weight/color match list table cells. */
export const detailValueSurfaceClassName = cn(
  "flex w-full min-w-0 min-h-[var(--detail-value-height,1.875rem)] items-center rounded-md px-1.5",
  "text-[length:var(--dash-body-size,0.875rem)] font-normal leading-normal text-slate-700",
  "dark:text-slate-300",
);

export const detailInlineEditorClassName = cn(
  detailValueSurfaceClassName,
  "box-border w-full min-w-0 border border-slate-200/90 bg-white outline-none transition",
  "focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900/10",
  "dark:border-slate-700 dark:bg-slate-900/80",
);

/** Zoho-style description box: min height, inner scroll, user can drag to grow. */
export const detailTextareaBoxClassName = cn(
  "field-control",
  detailInlineEditorClassName,
  "min-h-[100px] resize-y overflow-y-auto py-2.5 leading-5 font-normal [field-sizing:fixed]",
);

const detailInlineActionBtnClassName = cn(
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition",
  "disabled:pointer-50 disabled:pointer-events-none",
);

/**
 * Enterprise CRM detail field: label + value; placement follows Appearance
 * (left / right / top). Click opens an inline editor; tick saves that field
 * only, cross cancels. Only one field can be in edit mode at a time (global lock).
 */
export function DetailEditableField({
  label,
  children,
  value,
  onSave,
  onSaveValues,
  onEdit,
  kind = "text",
  options,
  selectSearchable = false,
  values: multiValues,
  editAriaLabel = "Edit",
  className,
  empty = "—",
  disabled = false,
  /** Read-only with lock icon and tooltip (e.g. contact type on client/vendor contacts). */
  locked = false,
  lockedHint,
  /** Marks field required (asterisk / red line from Appearance). */
  required = false,
  /** Message when required and user tries to save empty. */
  requiredMessage = "This field is required.",
  /** Use textarea editor and preserve line breaks (descriptions, notes). */
  multiline = false,
  /** Resizable description box with inner scroll (same as add/edit project). */
  textareaBox = false,
  /** Span both columns inside `DetailMetricsGrid`. */
  span,
  renderEditor,
  onEditStart,
  onEditCancel,
}: {
  label: ReactNode;
  children?: ReactNode;
  /** Current string value used when opening the inline editor. */
  value?: string;
  /** Selected values for `kind="multiselect"`. */
  values?: string[];
  /** Persist a single-field change; enables true quick edit. */
  onSave?: (next: string) => Promise<void>;
  /** Persist multi-select change when `kind="multiselect"`. */
  onSaveValues?: (next: string[]) => Promise<void>;
  /** Fallback: navigate to full edit (used when `onSave` is absent). */
  onEdit?: () => void;
  kind?: DetailEditableFieldKind;
  options?: CheckmarkSelectOption[];
  /** Enable search in select dropdown (useful for long lists like countries). */
  selectSearchable?: boolean;
  editAriaLabel?: string;
  className?: string;
  empty?: ReactNode;
  disabled?: boolean;
  locked?: boolean;
  lockedHint?: string;
  required?: boolean;
  requiredMessage?: string;
  multiline?: boolean;
  textareaBox?: boolean;
  span?: "full";
  renderEditor?: (props: DetailEditableFieldEditorProps) => ReactNode;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}) {
  const tLocked = useTranslations("Dashboard.common.lockedField");
  const fieldId = React.useId();
  const hasValue = children != null && children !== "";
  const readOnly = disabled || locked;
  const canInline =
    !readOnly &&
    (kind === "multiselect"
      ? typeof onSaveValues === "function"
      : typeof onSave === "function");
  const canNavigate = typeof onEdit === "function" && !readOnly && !canInline;
  const editable = canInline || canNavigate;

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [draftValues, setDraftValues] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [, setLockTick] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const skipBlurCommit = React.useRef(false);
  const textareaBoxHeightRef = React.useRef<number | null>(null);
  const textareaResizeStartHeight = React.useRef(0);

  React.useEffect(() => subscribeDetailInlineEditLock(() => setLockTick((n) => n + 1)), []);

  React.useEffect(() => {
    return () => {
      releaseDetailInlineEdit(fieldId);
    };
  }, [fieldId]);

  const editBlocked = isDetailInlineEditBlocked(fieldId);
  const canStartEdit = editable && !editBlocked;
  const lockedTooltip = lockedHint?.trim() || tLocked("hint");

  const useTextareaBox = textareaBox;
  const useGrowingEditor =
    !useTextareaBox &&
    (multiline ||
      (kind === "text" &&
        (Boolean(value?.includes("\n")) || (value?.trim().length ?? 0) > 36)));

  React.useEffect(() => {
    if (!editing) return;
    if (kind === "tel" || kind === "select" || kind === "multiselect" || kind === "money") return;
    const id = window.requestAnimationFrame(() => {
      if (kind === "date") {
        inputRef.current?.focus();
        openNativeDatePicker(inputRef.current);
        return;
      }
      if (useTextareaBox || useGrowingEditor) textareaRef.current?.focus();
      else inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing, kind, useGrowingEditor, useTextareaBox]);

  function startEdit(e?: React.SyntheticEvent) {
    e?.stopPropagation();
    if (canInline) {
      if (!claimDetailInlineEdit(fieldId)) return;
      setError(null);
      onEditStart?.();
      if (kind === "multiselect") {
        setDraftValues(multiValues ?? []);
        setEditing(true);
        return;
      }
      const initial =
        kind === "tel" ? normalizePhoneForPhoneInput(value ?? "") : (value ?? "");
      setDraft(initial);
      setEditing(true);
      return;
    }
    if (editBlocked) return;
    onEdit?.();
  }

  function cancelEdit() {
    onEditCancel?.();
    skipBlurCommit.current = true;
    setError(null);
    setEditing(false);
    setDraft(value ?? "");
    setDraftValues(multiValues ?? []);
    releaseDetailInlineEdit(fieldId);
  }

  function isEmptyDraft(next: string, nextValues: string[]): boolean {
    if (kind === "multiselect") return nextValues.length === 0;
    if (kind === "tel") return !isAppValidPhoneNumber(next);
    return !next.trim();
  }

  async function commit(nextValue?: string) {
    if (!canInline || saving) return;
    if (kind === "multiselect") {
      const next = draftValues;
      if (required && isEmptyDraft("", next)) {
        setError(requiredMessage);
        return;
      }
      setError(null);
      const prev = multiValues ?? [];
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) {
        setEditing(false);
        releaseDetailInlineEdit(fieldId);
        return;
      }
      setSaving(true);
      try {
        await onSaveValues?.(next);
        setEditing(false);
        releaseDetailInlineEdit(fieldId);
      } catch {
        // Caller shows toast; keep editor open.
      } finally {
        setSaving(false);
      }
      return;
    }
    const next = (nextValue ?? draft).trim();
    if (required && isEmptyDraft(next, [])) {
      setError(requiredMessage);
      return;
    }
    setError(null);
    const prev = (value ?? "").trim();
    if (next === prev) {
      setEditing(false);
      releaseDetailInlineEdit(fieldId);
      return;
    }
    setSaving(true);
    try {
      await onSave?.(next);
      setEditing(false);
      releaseDetailInlineEdit(fieldId);
    } catch {
      // Caller shows toast; keep editor open.
    } finally {
      setSaving(false);
    }
  }

  const textareaRows = Math.min(
    8,
    Math.max(2, draft.split("\n").length, Math.ceil(Math.max(draft.length, 1) / 42)),
  );
  const textareaBoxStyle =
    useTextareaBox && textareaBoxHeightRef.current != null
      ? { height: textareaBoxHeightRef.current }
      : undefined;
  const emptyPlaceholder = typeof empty === "string" ? empty : "—";

  function persistTextareaBoxHeight(el: HTMLTextAreaElement | null) {
    if (!el) return;
    textareaBoxHeightRef.current = el.offsetHeight;
  }

  return (
    <div
      className={cn(
        "field-group detail-field group/field min-w-0",
        required && "field-group--required",
        (span === "full" || useTextareaBox) && "col-span-full",
        (useTextareaBox || multiline) && "detail-field--block",
        className,
      )}
      data-required={required ? "true" : undefined}
    >
      <p className={detailFieldLabelClassName}>
        {label}
        {required ? <RequiredMark /> : null}
      </p>

      <div className="field-control-wrap min-w-0 w-full flex-1 overflow-visible">
        {editing && canInline ? (
          <div className="flex w-full min-w-0 flex-col gap-1">
            <div className={cn("flex w-full min-w-0 gap-1.5", useTextareaBox || useGrowingEditor ? "items-start" : "items-center")}>
            <div className="min-w-0 flex-1 overflow-visible" onMouseDown={(e) => e.stopPropagation()}>
              {renderEditor ? (
                renderEditor({
                  draft,
                  setDraft,
                  saving,
                  editAriaLabel,
                  editorClassName: cn(
                    detailInlineEditorClassName,
                    error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
                  ),
                })
              ) : kind === "select" && options ? (
                <CheckmarkSelect
                  listLabel={typeof label === "string" ? label : editAriaLabel}
                  options={options}
                  value={draft}
                  disabled={saving}
                  size="sm"
                  portaled
                  menuMinWidth={240}
                  searchable={selectSearchable}
                  className="w-full min-w-0"
                  invalid={Boolean(error)}
                  onChange={(v) => {
                    setError(null);
                    setDraft(v);
                  }}
                />
              ) : kind === "multiselect" && options ? (
                <MultiCheckSelect
                  listLabel={typeof label === "string" ? label : editAriaLabel}
                  options={options}
                  values={draftValues}
                  disabled={saving}
                  portaled
                  searchable={selectSearchable}
                  className="w-full min-w-0"
                  invalid={Boolean(error)}
                  onChange={(next) => {
                    setError(null);
                    setDraftValues(next);
                  }}
                />
              ) : kind === "tel" ? (
                <div className={cn("surface-phone-root w-full min-w-0", error && "surface-phone-invalid")}>
                  <PhoneNumberInput
                    value={draft}
                    onChange={(next) => {
                      setError(null);
                      setDraft(next);
                    }}
                    disabled={saving}
                    className="w-full"
                    numberInputProps={{
                      onKeyDown: (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commit();
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancelEdit();
                        }
                      },
                    }}
                  />
                </div>
              ) : kind === "money" ? (
                <MoneyInput
                  size="sm"
                  value={draft}
                  disabled={saving}
                  aria-label={editAriaLabel}
                  className={cn("w-full", error && "border-red-500")}
                  onChange={(e) => {
                    setError(null);
                    setDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  onBlur={() => {
                    if (skipBlurCommit.current) {
                      skipBlurCommit.current = false;
                      return;
                    }
                    void commit();
                  }}
                />
              ) : kind === "date" ? (
                <SurfaceDateInput
                  ref={inputRef}
                  type="date"
                  value={draft}
                  disabled={saving}
                  aria-label={editAriaLabel}
                  invalid={Boolean(error)}
                  className={cn(
                    detailInlineEditorClassName,
                    "h-auto",
                    error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
                  )}
                  onChange={(e) => {
                    setError(null);
                    const next = e.target.value;
                    setDraft(next);
                    // Native picker closes after a pick — save without waiting for blur
                    // (blur often fires when the calendar opens and would cancel the edit).
                    void commit(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              ) : useTextareaBox ? (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  disabled={saving}
                  rows={4}
                  maxLength={FIELD_MAX_LENGTH.DESCRIPTION}
                  aria-label={editAriaLabel}
                  aria-invalid={Boolean(error)}
                  style={textareaBoxStyle}
                  className={cn(
                    detailTextareaBoxClassName,
                    error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
                  )}
                  onChange={(e) => {
                    setError(null);
                    setDraft(clampFieldLength(e.target.value, FIELD_MAX_LENGTH.DESCRIPTION));
                  }}
                  onMouseUp={(e) => persistTextareaBoxHeight(e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              ) : useGrowingEditor ? (
                <textarea
                  ref={textareaRef}
                  value={draft}
                  disabled={saving}
                  rows={textareaRows}
                  aria-label={editAriaLabel}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    detailInlineEditorClassName,
                    "resize-none break-words [overflow-wrap:anywhere]",
                    error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
                  )}
                  onChange={(e) => {
                    setError(null);
                    setDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                />
              ) : (
                <input
                  ref={inputRef}
                  type={kind === "email" ? "email" : "text"}
                  value={draft}
                  disabled={saving}
                  aria-label={editAriaLabel}
                  aria-invalid={Boolean(error)}
                  className={cn(
                    detailInlineEditorClassName,
                    "h-auto",
                    error && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20",
                  )}
                  onChange={(e) => {
                    setError(null);
                    setDraft(e.target.value);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void commit();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      cancelEdit();
                    }
                  }}
                  onBlur={() => {
                    if (skipBlurCommit.current) {
                      skipBlurCommit.current = false;
                      return;
                    }
                    void commit();
                  }}
                />
              )}
            </div>
            <div className={cn("flex shrink-0 items-center gap-1", useTextareaBox || useGrowingEditor ? "self-start pt-1" : "self-center")}>
              <button
                type="button"
                disabled={saving}
                className={cn(
                  detailInlineActionBtnClassName,
                  "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
                  "dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 dark:hover:bg-emerald-950",
                )}
                aria-label="Save"
                onMouseDown={() => {
                  skipBlurCommit.current = true;
                }}
                onClick={() => void commit()}
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={2.25} />
                ) : (
                  <Check className="size-3.5" strokeWidth={2.25} />
                )}
              </button>
              <button
                type="button"
                disabled={saving}
                className={cn(
                  detailInlineActionBtnClassName,
                  "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700",
                  "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800",
                )}
                aria-label="Cancel"
                onMouseDown={() => {
                  skipBlurCommit.current = true;
                }}
                onClick={cancelEdit}
              >
                <X className="size-3.5" strokeWidth={2.25} />
              </button>
            </div>
            </div>
            {error ? <FieldErrorText>{error}</FieldErrorText> : null}
          </div>
        ) : useTextareaBox ? (
          <div className="relative w-full min-w-0">
            <textarea
              readOnly
              rows={4}
              value={value ?? ""}
              placeholder={emptyPlaceholder}
              tabIndex={canStartEdit || locked ? 0 : -1}
              aria-label={typeof label === "string" ? label : editAriaLabel}
              aria-readonly={locked || !canStartEdit ? true : undefined}
              title={locked ? lockedTooltip : editBlocked ? "Finish editing the current field first" : undefined}
              style={textareaBoxStyle}
              className={cn(
                detailTextareaBoxClassName,
                "pr-8",
                canStartEdit && "cursor-pointer",
                locked && "cursor-not-allowed bg-slate-50/90 dark:bg-slate-900/60",
                editBlocked && editable && "cursor-not-allowed opacity-70",
              )}
              onMouseDown={(e) => {
                textareaResizeStartHeight.current = e.currentTarget.offsetHeight;
              }}
              onMouseUp={(e) => persistTextareaBoxHeight(e.currentTarget)}
              onClick={(e) => {
                e.stopPropagation();
                if (!canStartEdit) return;
                if (Math.abs(e.currentTarget.offsetHeight - textareaResizeStartHeight.current) > 2) return;
                startEdit();
              }}
              onKeyDown={
                canStartEdit
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        startEdit();
                      }
                    }
                  : undefined
              }
            />
            {locked ? (
              <span
                className="pointer-events-none absolute right-2 top-2 text-slate-400 dark:text-slate-500"
                aria-hidden
              >
                <Lock className="size-3.5" strokeWidth={1.75} />
              </span>
            ) : canStartEdit ? (
              <span
                className={cn(
                  "pointer-events-none absolute right-2 top-2 opacity-0 transition",
                  "text-slate-500 group-hover/field:opacity-100 group-focus-within/field:opacity-100 dark:text-slate-400",
                )}
                aria-hidden
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </span>
            ) : null}
            {canStartEdit ? <span className="sr-only">{editAriaLabel}</span> : null}
          </div>
        ) : (
          <div
            className={cn(
              "relative flex w-full",
              multiline ? "items-start" : "items-center",
              detailValueSurfaceClassName,
              "break-words [overflow-wrap:anywhere]",
              canStartEdit &&
                "cursor-pointer group-hover/field:bg-slate-100/90 dark:group-hover/field:bg-slate-800/80",
              locked &&
                "cursor-not-allowed bg-slate-50/90 dark:bg-slate-900/60",
              editBlocked && editable && "cursor-not-allowed opacity-70",
            )}
            onClick={canStartEdit ? startEdit : undefined}
            onKeyDown={
              canStartEdit
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEdit();
                    }
                  }
                : undefined
            }
            role={canStartEdit ? "button" : locked ? "textbox" : undefined}
            tabIndex={canStartEdit ? 0 : locked ? 0 : undefined}
            aria-readonly={locked ? true : undefined}
            title={locked ? lockedTooltip : editBlocked ? "Finish editing the current field first" : undefined}
          >
            <div
              className={cn(
                "min-w-0 pr-7",
                multiline && "whitespace-pre-wrap",
              )}
            >
              {hasValue ? children : empty}
            </div>
            {locked ? (
              <span
                className={cn(
                  "pointer-events-none absolute right-1.5 text-slate-400 dark:text-slate-500",
                  multiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
                )}
                aria-hidden
              >
                <Lock className="size-3.5" strokeWidth={1.75} />
              </span>
            ) : canStartEdit ? (
              <span
                className={cn(
                  "pointer-events-none absolute right-1.5 opacity-0 transition",
                  multiline ? "top-1.5" : "top-1/2 -translate-y-1/2",
                  "text-slate-500 group-hover/field:opacity-100 group-focus-within/field:opacity-100 dark:text-slate-400",
                )}
                aria-hidden
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </span>
            ) : null}
            {canStartEdit ? <span className="sr-only">{editAriaLabel}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
