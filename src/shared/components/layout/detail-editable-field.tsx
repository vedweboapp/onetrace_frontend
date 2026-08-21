"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { MultiCheckSelect } from "@/shared/ui/multi-check-select";
import { PhoneNumberInput } from "@/shared/ui/phone-number-input";
import { MoneyInput } from "@/shared/ui/money-input";
import { FieldErrorText, RequiredMark, fieldLabelClassName } from "@/shared/ui/field-primitives";
import { isAppValidPhoneNumber, normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";
import {
  claimDetailInlineEdit,
  isDetailInlineEditBlocked,
  releaseDetailInlineEdit,
  subscribeDetailInlineEditLock,
} from "@/shared/components/layout/detail-inline-edit-lock";

export type DetailEditableFieldKind = "text" | "email" | "tel" | "select" | "multiselect" | "money";

type DetailEditableFieldEditorProps = {
  draft: string;
  setDraft: React.Dispatch<React.SetStateAction<string>>;
  saving: boolean;
  editAriaLabel: string;
  editorClassName: string;
};

/** Soft box shared by display + edit so height/width feel the same. */
export const detailValueSurfaceClassName = cn(
  "w-full min-w-0 rounded-md px-1.5 py-1 text-sm font-semibold leading-normal text-slate-900",
  "dark:text-slate-100",
);

export const detailInlineEditorClassName = cn(
  detailValueSurfaceClassName,
  "box-border w-full min-w-0 border border-slate-200/90 bg-white outline-none transition",
  "focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900/10",
  "dark:border-slate-700 dark:bg-slate-900/80",
);

const detailInlineActionBtnClassName = cn(
  "inline-flex size-7 shrink-0 items-center justify-center rounded-full border transition",
  "disabled:pointer-50 disabled:pointer-events-none",
);

/**
 * Zoho-style detail field: uppercase label above value.
 * Click opens an inline editor; tick saves that field only, cross cancels.
 * Only one field can be in edit mode at a time (global lock).
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
  /** Marks field required (asterisk / red line from Appearance). */
  required = false,
  /** Message when required and user tries to save empty. */
  requiredMessage = "This field is required.",
  /** Use textarea editor and preserve line breaks (descriptions, notes). */
  multiline = false,
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
  required?: boolean;
  requiredMessage?: string;
  multiline?: boolean;
  span?: "full";
  renderEditor?: (props: DetailEditableFieldEditorProps) => ReactNode;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}) {
  const fieldId = React.useId();
  const hasValue = children != null && children !== "";
  const canInline =
    !disabled &&
    (kind === "multiselect"
      ? typeof onSaveValues === "function"
      : typeof onSave === "function");
  const canNavigate = typeof onEdit === "function" && !disabled && !canInline;
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

  React.useEffect(() => subscribeDetailInlineEditLock(() => setLockTick((n) => n + 1)), []);

  React.useEffect(() => {
    return () => {
      releaseDetailInlineEdit(fieldId);
    };
  }, [fieldId]);

  const editBlocked = isDetailInlineEditBlocked(fieldId);
  const canStartEdit = editable && !editBlocked;

  const useGrowingEditor =
    multiline ||
    (kind === "text" &&
      (Boolean(value?.includes("\n")) || (value?.trim().length ?? 0) > 36));

  React.useEffect(() => {
    if (!editing) return;
    if (kind === "tel" || kind === "select" || kind === "multiselect" || kind === "money") return;
    const id = window.requestAnimationFrame(() => {
      if (useGrowingEditor) textareaRef.current?.focus();
      else inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing, kind, useGrowingEditor]);

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

  return (
    <div
      className={cn(
        "field-group detail-field group/field min-w-0",
        required && "field-group--required",
        span === "full" && "col-span-full",
        className,
      )}
      data-required={required ? "true" : undefined}
    >
      <p
        className={cn(
          fieldLabelClassName,
          "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400",
        )}
      >
        {label}
        {required ? <RequiredMark /> : null}
      </p>

      <div className="field-control-wrap min-w-0 w-full flex-1 overflow-visible">
        {editing && canInline ? (
          <div className="flex w-full min-w-0 flex-col gap-1">
            <div className="flex w-full min-w-0 items-center gap-1.5">
            <div className="min-w-0 flex-1 overflow-visible">
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
                    "h-auto min-h-[1.75rem]",
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
            <div className="flex shrink-0 items-center gap-1 self-center">
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
        ) : (
          <div
            className={cn(
              "relative w-full",
              detailValueSurfaceClassName,
              "break-words [overflow-wrap:anywhere]",
              canStartEdit &&
                "cursor-pointer group-hover/field:bg-slate-100/90 dark:group-hover/field:bg-slate-800/80",
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
            role={canStartEdit ? "button" : undefined}
            tabIndex={canStartEdit ? 0 : undefined}
            title={editBlocked ? "Finish editing the current field first" : undefined}
          >
            <div
              className={cn(
                "min-w-0 pr-7",
                multiline && "whitespace-pre-wrap",
              )}
            >
              {hasValue ? children : empty}
            </div>
            {canStartEdit ? (
              <span
                className={cn(
                  "pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition",
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
