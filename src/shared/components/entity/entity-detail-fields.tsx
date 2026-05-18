"use client";

import type { ReactNode } from "react";
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
  /** Shown when phone is empty; defaults to em dash. */
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

type CreatedByUser = {
  username?: string | null;
  email?: string | null;
};

type DetailCreatedBySectionProps = {
  title: ReactNode;
  user: CreatedByUser;
  usernameLabel: ReactNode;
  emailLabel: ReactNode;
};

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
  /** Extra fields rendered after timestamps (e.g. entity id). */
  extra?: ReactNode;
  gridClassName?: string;
};

/** Active status + created/updated timestamps in a standard meta panel. */
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
        <span className="tabular-nums">{dateFmt.format(new Date(createdAt))}</span>
      </DetailMetricCard>
      <DetailMetricCard label={updatedAtLabel}>
        <span className="tabular-nums">{dateFmt.format(new Date(modifiedAt))}</span>
      </DetailMetricCard>
      {extra}
    </DetailMetricsGrid>
  );
}
