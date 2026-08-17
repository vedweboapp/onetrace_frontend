"use client";

import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { ActiveStatusBadge, AppButton } from "@/shared/ui";

/** Treat missing / invalid / Unix-epoch timestamps as empty. */
export function formatSettingsDetailDate(
  dateFmt: Intl.DateTimeFormat,
  value: string | number | null | undefined,
  empty = "—",
): string {
  if (value == null || value === "") return empty;
  const d = typeof value === "number" ? new Date(value) : new Date(value);
  if (Number.isNaN(d.getTime())) return empty;
  // Backend sometimes returns 0 / 1970-01-01 for unset modified_at
  if (d.getFullYear() < 1980) return empty;
  return dateFmt.format(d);
}

export function settingsDetailUserLabel(
  user: { id?: number; username?: string | null; email?: string | null } | null | undefined,
): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return user.id != null ? `#${user.id}` : "—";
}

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

/** Header title: colour avatar + name, optional ID badge under the name (aligned with text). */
export function SettingsDetailTitle({
  name,
  bgColour,
  textColour,
  idLabel,
  idExtra,
  className,
}: {
  name: string;
  bgColour?: string | null;
  textColour?: string | null;
  idLabel?: ReactNode;
  idExtra?: ReactNode;
  className?: string;
}) {
  const bg = (bgColour ?? "").trim() || "#e2e8f0";
  const fg = (textColour ?? "").trim() || "#0f172a";
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-black/10 text-xs font-bold tracking-wide shadow-sm"
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden
      >
        {initialsFromLabel(name)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold leading-tight text-slate-900 dark:text-slate-50">{name}</p>
        {idLabel != null && idLabel !== "" ? (
          <div className="mt-1">
            <SettingsDetailIdSubtitle idLabel={idLabel} extra={idExtra} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SettingsDetailIdSubtitle({
  idLabel,
  extra,
}: {
  idLabel: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <span className="inline-flex max-w-full flex-wrap items-center gap-1.5">
      <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-medium tracking-wide text-slate-600 ring-1 ring-inset ring-slate-200/80 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700">
        {idLabel}
      </span>
      {extra ? (
        <span className="truncate font-mono text-[11px] text-slate-400 dark:text-slate-500">{extra}</span>
      ) : null}
    </span>
  );
}

/** Read-only detail body — fixed label column so values align (ignores form FieldGroup layout). */
export function SettingsDetailList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function SettingsDetailRow({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-1 border-b border-slate-100 px-3.5 py-3 last:border-b-0 sm:grid-cols-[9.5rem_minmax(0,1fr)] sm:items-start sm:gap-x-4 dark:border-slate-800/80",
        className,
      )}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 text-sm font-medium leading-snug text-slate-900 dark:text-slate-100">
        {children}
      </dd>
    </div>
  );
}

export function SettingsDetailTextValue({
  children,
  muted,
  mono,
}: {
  children: ReactNode;
  muted?: boolean;
  mono?: boolean;
}) {
  return (
    <p
      className={cn(
        "break-words",
        muted && "font-normal text-slate-500 dark:text-slate-400",
        mono && "font-mono text-[13px] tracking-tight",
      )}
    >
      {children}
    </p>
  );
}

export function SettingsDetailStatusValue({
  active,
  activeLabel,
  inactiveLabel,
}: {
  active: boolean;
  activeLabel: string;
  inactiveLabel: string;
}) {
  return <ActiveStatusBadge active={active} label={active ? activeLabel : inactiveLabel} />;
}

export function SettingsDetailColourValue({
  hex,
  previewBg,
  previewText,
  sample = false,
}: {
  hex: string;
  /** Swatch fill; defaults to `hex`. */
  previewBg?: string;
  /** Text colour when `sample` (Aa preview). */
  previewText?: string;
  sample?: boolean;
}) {
  const bg = previewBg ?? hex;
  const display = hex.toUpperCase();
  return (
    <div className="flex items-center gap-2.5">
      {sample ? (
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded border border-slate-200 text-[10px] font-bold dark:border-slate-600"
          style={{ backgroundColor: bg, color: previewText ?? "#0f172a" }}
          aria-hidden
        >
          Aa
        </span>
      ) : (
        <span
          className="size-7 shrink-0 rounded border border-slate-200 dark:border-slate-600"
          style={{ backgroundColor: bg }}
          aria-hidden
        />
      )}
      <span className="font-mono text-[13px] tracking-tight text-slate-700 dark:text-slate-200">{display}</span>
    </div>
  );
}

export function SettingsDetailTimestampValue({
  dateFmt,
  value,
  byUser,
  byUserTemplate,
}: {
  dateFmt: Intl.DateTimeFormat;
  value: string | number | null | undefined;
  byUser?: string | null;
  /** e.g. `By {user}` — pass already-translated string with user substituted, or null. */
  byUserTemplate?: string | null;
}) {
  const formatted = formatSettingsDetailDate(dateFmt, value);
  const showBy = Boolean(byUserTemplate && byUser && byUser !== "—");
  return (
    <div className="min-w-0">
      <p>{formatted}</p>
      {showBy ? (
        <p className="mt-0.5 text-xs font-normal text-slate-500 dark:text-slate-400">{byUserTemplate}</p>
      ) : null}
    </div>
  );
}

export function SettingsDetailActions({
  cancelLabel,
  editLabel,
  deleteLabel,
  onCancel,
  onEdit,
  onDelete,
  toggleLabel,
  onToggle,
  toggleLoading,
  toggleDisabled,
}: {
  cancelLabel: string;
  editLabel: string;
  deleteLabel?: string;
  onCancel: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  toggleLabel?: string;
  onToggle?: () => void;
  toggleLoading?: boolean;
  toggleDisabled?: boolean;
}) {
  return (
    <>
      <AppButton type="button" variant="secondary" size="sm" onClick={onCancel}>
        {cancelLabel}
      </AppButton>
      <AppButton type="button" variant="secondary" size="sm" onClick={onEdit}>
        {editLabel}
      </AppButton>
      {toggleLabel && onToggle ? (
        <AppButton
          type="button"
          variant="secondary"
          size="sm"
          loading={toggleLoading}
          disabled={toggleDisabled}
          onClick={onToggle}
        >
          {toggleLabel}
        </AppButton>
      ) : null}
      {deleteLabel && onDelete ? (
        <AppButton type="button" variant="danger" size="sm" onClick={onDelete}>
          {deleteLabel}
        </AppButton>
      ) : null}
    </>
  );
}
