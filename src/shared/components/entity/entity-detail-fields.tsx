"use client";

import type { ReactNode } from "react";
import { Calendar, RefreshCw, User } from "lucide-react";
import {
  DetailMetricCard,
  DetailMetricsGrid,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { ActiveStatusBadge } from "@/shared/ui";

const linkClassName =
  "break-all font-semibold text-[color:var(--dash-accent)] underline-offset-2 hover:underline";

export function DetailEmailLink({ email }: { email: string }) {
  return (
    <a href={`mailto:${email}`} className={linkClassName}>
      {email}
    </a>
  );
}

export function DetailPhoneLink({
  phone,
  empty,
}: {
  phone?: string | null;
  empty?: ReactNode;
}) {
  const raw = typeof phone === "string" ? phone.trim() : "";
  if (!raw) {
    return empty ?? <span className="font-normal text-slate-500 dark:text-slate-400">—</span>;
  }
  const telHref = `tel:${raw.replace(/\s/g, "")}`;
  return (
    <a href={telHref} className={linkClassName}>
      {raw}
    </a>
  );
}

export type DetailAuditUser = {
  id?: number;
  username?: string | null;
  email?: string | null;
  phone?: string | null;
};

export function normalizeDetailAuditUser(user: unknown): DetailAuditUser | null {
  if (user == null) return null;
  if (typeof user === "number" && Number.isFinite(user)) {
    return { id: user };
  }
  if (typeof user !== "object") return null;
  const row = user as Record<string, unknown>;
  const id = typeof row.id === "number" ? row.id : undefined;
  const username = typeof row.username === "string" ? row.username : null;
  const email = typeof row.email === "string" ? row.email : null;
  const phone = typeof row.phone === "string" ? row.phone : null;
  const name = typeof row.name === "string" ? row.name : null;
  if (!id && !username?.trim() && !email?.trim() && !phone?.trim() && !name?.trim()) return null;
  return { id, username: username?.trim() ? username : name, email, phone };
}

function detailUserDisplayName(user: DetailAuditUser): string {
  const username = user.username?.trim();
  const email = user.email?.trim();
  const phone = user.phone?.trim();
  if (username) return username;
  if (email) return email;
  if (phone) return phone;
  return "—";
}

/** Avatar + name/email/phone block for detail metric grids. */
export function DetailUserAttribution({
  user,
  emptyLabel = "—",
}: {
  user: DetailAuditUser | null;
  emptyLabel?: ReactNode;
}) {
  if (!user) {
    return (
      <div className="flex items-start gap-3 text-slate-500 dark:text-slate-400">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <User className="size-4 opacity-60" aria-hidden />
        </span>
        <p className="pt-1.5 text-sm font-normal">{emptyLabel}</p>
      </div>
    );
  }

  const primary = detailUserDisplayName(user);
  const email = user.email?.trim();
  const phone = user.phone?.trim();
  const showEmail = Boolean(email && email !== primary);
  const showPhone = Boolean(phone && phone !== primary && phone !== email);

  return (
    <div className="flex min-w-0 items-start gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
        <User className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{primary}</p>
        {showEmail ? (
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            <DetailEmailLink email={email!} />
          </p>
        ) : null}
        {showPhone ? (
          <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
            <DetailPhoneLink phone={phone} />
          </p>
        ) : null}
      </div>
    </div>
  );
}

function DetailTimestampValue({
  icon: Icon,
  value,
}: {
  icon: typeof Calendar;
  value: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
      <span className="min-w-0 break-words tabular-nums">{value}</span>
    </div>
  );
}

export type DetailSystemMetadataLabels = {
  sectionTitle: ReactNode;
  createdAt: ReactNode;
  updatedAt: ReactNode;
  createdBy: ReactNode;
  modifiedBy: ReactNode;
  notModifiedYet: ReactNode;
};

export type DetailSystemMetadataSectionProps = {
  createdAt: string;
  modifiedAt?: string | null;
  dateFmt: Intl.DateTimeFormat;
  createdBy?: unknown;
  modifiedBy?: unknown;
  labels: DetailSystemMetadataLabels;
  /** Optional status row in the metadata grid (e.g. active/inactive). */
  status?: {
    isActive: boolean;
    activeLabel: string;
    inactiveLabel: string;
    statusLabel: ReactNode;
  };
  extra?: ReactNode;
};

/** Standard audit block — timestamps and created/modified by — shown last on detail pages. */
export function DetailSystemMetadataSection({
  createdAt,
  modifiedAt,
  dateFmt,
  createdBy,
  modifiedBy,
  labels,
  status,
  extra,
}: DetailSystemMetadataSectionProps) {
  const createdByUser = normalizeDetailAuditUser(createdBy);
  const modifiedByUser = normalizeDetailAuditUser(modifiedBy);

  return (
    <DetailPanelCard title={labels.sectionTitle} defaultOpen={false}>
      <DetailMetricsGrid className="sm:grid-cols-2">
        {status ? (
          <DetailMetricCard label={status.statusLabel}>
            <ActiveStatusBadge
              active={status.isActive}
              label={status.isActive ? status.activeLabel : status.inactiveLabel}
            />
          </DetailMetricCard>
        ) : null}
        <DetailMetricCard label={labels.createdAt}>
          <DetailTimestampValue
            icon={Calendar}
            value={dateFmt.format(new Date(createdAt))}
          />
        </DetailMetricCard>
        <DetailMetricCard label={labels.updatedAt}>
          {modifiedAt?.trim() ? (
            <DetailTimestampValue
              icon={RefreshCw}
              value={dateFmt.format(new Date(modifiedAt))}
            />
          ) : (
            <span className="text-sm text-slate-600 dark:text-slate-400">—</span>
          )}
        </DetailMetricCard>
        {extra}
        <DetailMetricCard label={labels.createdBy} className="sm:col-span-1">
          <DetailUserAttribution user={createdByUser} emptyLabel="—" />
        </DetailMetricCard>
        <DetailMetricCard label={labels.modifiedBy} className="sm:col-span-1">
          <DetailUserAttribution user={modifiedByUser} emptyLabel={labels.notModifiedYet} />
        </DetailMetricCard>
      </DetailMetricsGrid>
    </DetailPanelCard>
  );
}

type DetailCreatedBySectionProps = {
  title: ReactNode;
  user: DetailAuditUser;
  usernameLabel: ReactNode;
  emailLabel: ReactNode;
};

/** @deprecated Prefer {@link DetailSystemMetadataSection} at the bottom of detail pages. */
export function DetailCreatedBySection({ title, user, usernameLabel, emailLabel }: DetailCreatedBySectionProps) {
  const username = user.username?.trim() || "—";
  const email = user.email?.trim();
  return (
    <DetailPanelCard title={title}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DetailMetricCard label={usernameLabel}>{username}</DetailMetricCard>
        <DetailMetricCard label={emailLabel}>
          {email ? <DetailEmailLink email={email} /> : "—"}
        </DetailMetricCard>
      </div>
    </DetailPanelCard>
  );
}

type DetailRecordMetaProps = {
  isActive: boolean;
  activeLabel: string;
  inactiveLabel: string;
  statusLabel: ReactNode;
  createdAtLabel: ReactNode;
  updatedAtLabel: ReactNode;
  createdAt: string;
  modifiedAt: string;
  dateFmt: Intl.DateTimeFormat;
  extra?: ReactNode;
  gridClassName?: string;
};

/** @deprecated Prefer {@link DetailSystemMetadataSection}. */
export function DetailRecordMetaSection({
  isActive,
  activeLabel,
  inactiveLabel,
  statusLabel,
  createdAtLabel,
  updatedAtLabel,
  createdAt,
  modifiedAt,
  dateFmt,
  extra,
  gridClassName,
}: DetailRecordMetaProps) {
  return (
    <DetailMetricsGrid className={gridClassName ?? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"}>
      <DetailMetricCard label={statusLabel}>
        <ActiveStatusBadge active={isActive} label={isActive ? activeLabel : inactiveLabel} />
      </DetailMetricCard>
      <DetailMetricCard label={createdAtLabel}>
        <DetailTimestampValue icon={Calendar} value={dateFmt.format(new Date(createdAt))} />
      </DetailMetricCard>
      <DetailMetricCard label={updatedAtLabel}>
        <DetailTimestampValue icon={RefreshCw} value={dateFmt.format(new Date(modifiedAt))} />
      </DetailMetricCard>
      {extra}
    </DetailMetricsGrid>
  );
}
