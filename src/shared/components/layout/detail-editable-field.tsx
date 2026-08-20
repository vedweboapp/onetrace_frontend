"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { MultiCheckSelect } from "@/shared/ui/multi-check-select";
import { PhoneNumberInput } from "@/shared/ui/phone-number-input";
import { MoneyInput } from "@/shared/ui/money-input";
import {
  fieldLabelClassName,
} from "@/shared/ui/field-primitives";
import { normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";

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
  "border border-slate-200/90 bg-slate-50 outline-none transition",
  "focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900/10",
  "dark:border-slate-700 dark:bg-slate-900/80",
);

/**
 * Zoho-style detail field: uppercase label above value.
 * Click opens an inline editor; tick saves that field only, cross cancels.
 * With only `onEdit`, click navigates (legacy full-form edit).
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
  multiline?: boolean;
  span?: "full";
  renderEditor?: (props: DetailEditableFieldEditorProps) => ReactNode;
  onEditStart?: () => void;
  onEditCancel?: () => void;
}) {
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
  const inputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const skipBlurCommit = React.useRef(false);

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
    onEdit?.();
  }

  function cancelEdit() {
    onEditCancel?.();
    skipBlurCommit.current = true;
    setEditing(false);
    setDraft(value ?? "");
    setDraftValues(multiValues ?? []);
  }

  async function commit(nextValue?: string) {
    if (!canInline || saving) return;
    if (kind === "multiselect") {
      const next = draftValues;
      const prev = multiValues ?? [];
      if (next.length === prev.length && next.every((v, i) => v === prev[i])) {
        setEditing(false);
        return;
      }
      setSaving(true);
      try {
        await onSaveValues?.(next);
        setEditing(false);
      } catch {
        // Caller shows toast; keep editor open.
      } finally {
        setSaving(false);
      }
      return;
    }
    const next = (nextValue ?? draft).trim();
    const prev = (value ?? "").trim();
    if (next === prev) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave?.(next);
      setEditing(false);
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
        span === "full" && "col-span-full",
        className,
      )}
    >
      <p
        className={cn(
          fieldLabelClassName,
          "text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400",
        )}
      >
        {label}
      </p>

      <div className="field-control-wrap min-w-0 flex-1 overflow-visible">
        {editing && canInline ? (
          <div className="flex min-w-0 items-start gap-1">
            <div className="min-w-0 flex-1 overflow-visible">
              {renderEditor ? (
                renderEditor({
                  draft,
                  setDraft,
                  saving,
                  editAriaLabel,
                  editorClassName: detailInlineEditorClassName,
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
                  onChange={(v) => {
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
                  className="w-full min-w-0"
                  onChange={setDraftValues}
                />
              ) : kind === "tel" ? (
                <div className="surface-phone-root">
                  <PhoneNumberInput
                    value={draft}
                    onChange={setDraft}
                    disabled={saving}
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
                  onChange={(e) => setDraft(e.target.value)}
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
                  className={cn(
                    detailInlineEditorClassName,
                    "resize-none break-words [field-sizing:content] [overflow-wrap:anywhere]",
                  )}
                  onChange={(e) => setDraft(e.target.value)}
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
                  className={cn(detailInlineEditorClassName, "h-auto min-h-[1.75rem]")}
                  onChange={(e) => setDraft(e.target.value)}
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
            <div className="flex shrink-0 items-center gap-0 pt-0.5">
              <button
                type="button"
                disabled={saving}
                className="inline-flex size-6 items-center justify-center rounded text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                aria-label="Save"
                onMouseDown={() => {
                  skipBlurCommit.current = true;
                }}
                onClick={() => void commit()}
              >
                {saving ? (
                  <Loader2 className="size-3.5 animate-spin" strokeWidth={2} />
                ) : (
                  <Check className="size-3.5" strokeWidth={2} />
                )}
              </button>
              <button
                type="button"
                disabled={saving}
                className="inline-flex size-6 items-center justify-center rounded text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cancel"
                onMouseDown={() => {
                  skipBlurCommit.current = true;
                }}
                onClick={cancelEdit}
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cn(
              "relative",
              detailValueSurfaceClassName,
              "break-words [overflow-wrap:anywhere]",
              editable &&
                "cursor-pointer group-hover/field:bg-slate-100/90 dark:group-hover/field:bg-slate-800/80",
            )}
            onClick={editable ? startEdit : undefined}
            onKeyDown={
              editable
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      startEdit();
                    }
                  }
                : undefined
            }
            role={editable ? "button" : undefined}
            tabIndex={editable ? 0 : undefined}
          >
            <div
              className={cn(
                "min-w-0 pr-7",
                multiline && "whitespace-pre-wrap",
              )}
            >
              {hasValue ? children : empty}
            </div>
            {editable ? (
              <span
                className={cn(
                  "pointer-events-none absolute right-1 top-1 opacity-0 transition",
                  "text-slate-500 group-hover/field:opacity-100 group-focus-within/field:opacity-100 dark:text-slate-400",
                )}
                aria-hidden
              >
                <Pencil className="size-3.5" strokeWidth={1.75} />
              </span>
            ) : null}
            {editable ? <span className="sr-only">{editAriaLabel}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}
