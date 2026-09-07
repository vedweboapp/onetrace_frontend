"use client";

import type { ReactNode } from "react";
import {
  DetailMetricsGrid,
  DetailPanelCard,
} from "@/shared/components/layout/detail-metric-card";
import { detailFieldLabelClassName, detailValueSurfaceClassName } from "@/shared/components/layout/detail-editable-field";
import { ActiveStatusBadge } from "@/shared/ui";
import { formatSettingsDetailDate } from "@/shared/components/settings/settings-detail-view";
import { cn } from "@/core/utils/http.util";
import { entityNameLinkClassName } from "@/shared/components/entity/detail-entity-link";

const linkClassName = cn("break-all font-normal", entityNameLinkClassName);

const detailMetadataEmptyClassName =
  "text-sm font-normal text-slate-400 dark:text-slate-500";

/** Metadata fields follow the same CRM label | value alignment as overview fields. */
function DetailMetadataField({
  label,
  children,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("field-group detail-field min-w-0", className)}>
      <p className={detailFieldLabelClassName}>{label}</p>
      <div className={cn("field-control-wrap min-w-0 flex-1", detailValueSurfaceClassName)}>
        {children}
      </div>
    </div>
  );
}

function DetailMetadataEmpty({ children }: { children: ReactNode }) {
  return <span className={detailMetadataEmptyClassName}>{children}</span>;
}

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

/** Name (and optional secondary lines) for system metadata rows. */
export function DetailUserAttribution({
  user,
  emptyLabel = "—",
}: {
  user: DetailAuditUser | null;
  emptyLabel?: ReactNode;
}) {
  if (!user) {
    return <DetailMetadataEmpty>{emptyLabel}</DetailMetadataEmpty>;
  }

  const primary = detailUserDisplayName(user);
  const email = user.email?.trim();
  const phone = user.phone?.trim();
  const showEmail = Boolean(email && email !== primary);
  const showPhone = Boolean(phone && phone !== primary && phone !== email);

  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-normal leading-normal text-slate-700 dark:text-slate-300">
        {primary}
      </p>
      {showEmail ? (
        <p className="mt-0.5 truncate text-xs leading-normal text-slate-500 dark:text-slate-400">
          <DetailEmailLink email={email!} />
        </p>
      ) : null}
      {showPhone ? (
        <p className="mt-0.5 truncate text-xs leading-normal text-slate-500 dark:text-slate-400">
          <DetailPhoneLink phone={phone} />
        </p>
      ) : null}
    </div>
  );
}

function DetailTimestampValue({
  value,
  emptyLabel = "—",
  isEmpty = false,
}: {
  value: ReactNode;
  emptyLabel?: ReactNode;
  isEmpty?: boolean;
}) {
  if (isEmpty) {
    return <DetailMetadataEmpty>{emptyLabel}</DetailMetadataEmpty>;
  }
  return (
    <span className="min-w-0 break-words text-sm font-normal leading-normal tabular-nums text-slate-700 dark:text-slate-300">
      {value}
    </span>
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
  /** Flat section for single-surface detail pages (no nested card). */
  variant?: "card" | "flat";
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
  variant = "flat",
}: DetailSystemMetadataSectionProps) {
  const createdByUser = normalizeDetailAuditUser(createdBy);
  const modifiedByUser = normalizeDetailAuditUser(modifiedBy);
  const formattedModifiedAt = modifiedAt?.trim()
    ? formatSettingsDetailDate(dateFmt, modifiedAt)
    : "—";
  const hasModifiedAt = formattedModifiedAt !== "—";

  return (
    <DetailPanelCard title={labels.sectionTitle} defaultOpen={false} variant={variant}>
      <DetailMetricsGrid>
        {status ? (
          <DetailMetadataField label={status.statusLabel}>
            <ActiveStatusBadge
              active={status.isActive}
              label={status.isActive ? status.activeLabel : status.inactiveLabel}
            />
          </DetailMetadataField>
        ) : null}
        <DetailMetadataField label={labels.createdAt}>
          <DetailTimestampValue value={formatSettingsDetailDate(dateFmt, createdAt)} />
        </DetailMetadataField>
        <DetailMetadataField label={labels.updatedAt}>
          <DetailTimestampValue
            value={hasModifiedAt ? formattedModifiedAt : null}
            emptyLabel={labels.notModifiedYet}
            isEmpty={!hasModifiedAt}
          />
        </DetailMetadataField>
        {extra}
        <DetailMetadataField label={labels.createdBy}>
          <DetailUserAttribution user={createdByUser} emptyLabel="—" />
        </DetailMetadataField>
        <DetailMetadataField label={labels.modifiedBy}>
          <DetailUserAttribution user={modifiedByUser} emptyLabel={labels.notModifiedYet} />
        </DetailMetadataField>
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
      <DetailMetricsGrid>
        <DetailMetadataField label={usernameLabel}>{username}</DetailMetadataField>
        <DetailMetadataField label={emailLabel}>
          {email ? <DetailEmailLink email={email} /> : "—"}
        </DetailMetadataField>
      </DetailMetricsGrid>
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
    <DetailMetricsGrid className={gridClassName}>
      <DetailMetadataField label={statusLabel}>
        <ActiveStatusBadge active={isActive} label={isActive ? activeLabel : inactiveLabel} />
      </DetailMetadataField>
      <DetailMetadataField label={createdAtLabel}>
        <DetailTimestampValue value={formatSettingsDetailDate(dateFmt, createdAt)} />
      </DetailMetadataField>
      <DetailMetadataField label={updatedAtLabel}>
        <DetailTimestampValue value={formatSettingsDetailDate(dateFmt, modifiedAt)} />
      </DetailMetadataField>
      {extra}
    </DetailMetricsGrid>
  );
}
