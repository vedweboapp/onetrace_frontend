"use client";

import * as React from "react";
import type { ReactNode } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import { PhoneNumberInput } from "@/shared/ui/phone-number-input";
import { surfaceInputClassName } from "@/shared/ui/field-primitives";
import { normalizePhoneForPhoneInput } from "@/shared/utils/phone-input.util";

export type DetailEditableFieldKind = "text" | "email" | "tel" | "select";

/**
 * WMS / Zoho-style detail field: uppercase label above value.
 * With `onSave`, pencil/click opens an inline editor and patches that field only.
 * With only `onEdit`, click navigates (legacy full-form edit).
 */
export function DetailEditableField({
  label,
  children,
  value,
  onSave,
  onEdit,
  kind = "text",
  options,
  editAriaLabel = "Edit",
  className,
  empty = "—",
  disabled = false,
}: {
  label: ReactNode;
  children?: ReactNode;
  /** Current string value used when opening the inline editor. */
  value?: string;
  /** Persist a single-field change; enables true quick edit. */
  onSave?: (next: string) => Promise<void>;
  /** Fallback: navigate to full edit (used when `onSave` is absent). */
  onEdit?: () => void;
  kind?: DetailEditableFieldKind;
  options?: CheckmarkSelectOption[];
  editAriaLabel?: string;
  className?: string;
  empty?: ReactNode;
  disabled?: boolean;
}) {
  const hasValue = children != null && children !== "";
  const canInline = typeof onSave === "function" && !disabled;
  const canNavigate = typeof onEdit === "function" && !disabled && !canInline;
  const editable = canInline || canNavigate;

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const skipBlurCommit = React.useRef(false);

  React.useEffect(() => {
    if (!editing) return;
    if (kind === "tel" || kind === "select") return;
    const id = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [editing, kind]);

  function startEdit(e?: React.SyntheticEvent) {
    e?.stopPropagation();
    if (canInline) {
      const initial =
        kind === "tel" ? normalizePhoneForPhoneInput(value ?? "") : (value ?? "");
      setDraft(initial);
      setEditing(true);
      return;
    }
    onEdit?.();
  }

  function cancelEdit() {
    skipBlurCommit.current = true;
    setEditing(false);
    setDraft(value ?? "");
  }

  async function commit(nextValue?: string) {
    if (!canInline || saving) return;
    const next = (nextValue ?? draft).trim();
    const prev = (value ?? "").trim();
    if (next === prev) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(next);
      setEditing(false);
    } catch {
      // Caller shows toast; keep editor open.
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={cn("group/field min-w-0", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </p>

      {editing && canInline ? (
        <div className="mt-1.5 flex min-w-0 items-start gap-1.5">
          <div className="min-w-0 flex-1">
            {kind === "select" && options ? (
              <CheckmarkSelect
                listLabel={typeof label === "string" ? label : editAriaLabel}
                options={options}
                value={draft}
                disabled={saving}
                size="sm"
                portaled
                className="w-full"
                onChange={(v) => {
                  setDraft(v);
                  void commit(v);
                }}
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
            ) : (
              <input
                ref={inputRef}
                type={kind === "email" ? "email" : "text"}
                value={draft}
                disabled={saving}
                aria-label={editAriaLabel}
                className={cn(surfaceInputClassName, "h-9 min-h-9 rounded-lg px-2.5")}
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
          {kind !== "select" ? (
            <div className="flex shrink-0 items-center gap-0.5 pt-0.5">
              <button
                type="button"
                disabled={saving}
                className="inline-flex size-8 items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
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
                className="inline-flex size-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Cancel"
                onMouseDown={() => {
                  skipBlurCommit.current = true;
                }}
                onClick={cancelEdit}
              >
                <X className="size-3.5" strokeWidth={2} />
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className={cn(
            "relative mt-1.5 min-h-[1.75rem] rounded-md px-1.5 py-1 text-sm font-semibold leading-snug text-slate-900 transition",
            "dark:text-slate-100",
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
          <div className="min-w-0 pr-7">{hasValue ? children : empty}</div>
          {editable ? (
            <span
              className={cn(
                "pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 opacity-0 transition",
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
  );
}
