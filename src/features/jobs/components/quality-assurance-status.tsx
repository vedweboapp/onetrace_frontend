"use client";

import { useTranslations } from "next-intl";
import {
  hasQualityAssuranceStatus,
  isQualityAssuranceApproved,
  isQualityAssuranceRejected,
  type QualityAssuranceRecord,
} from "@/features/jobs/types/quality-assurance.types";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";

export function QualityAssuranceStatusBadge({
  record,
  className,
}: {
  record: QualityAssuranceRecord | null | undefined;
  className?: string;
}) {
  const t = useTranslations("Dashboard.jobs.qualityAssurance");
  if (!hasQualityAssuranceStatus(record)) {
    return <span className={cn("text-xs text-slate-400", className)}>—</span>;
  }

  const approved = isQualityAssuranceApproved(record);
  const rejected = isQualityAssuranceRejected(record);
  const pending = (record?.status ?? "").toLowerCase() === "pending";
  const label = approved
    ? t("statusApproved")
    : rejected
      ? t("statusRejected")
      : pending
        ? t("statusPending")
        : String(record?.status);

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        approved
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
          : rejected
            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
        className,
      )}
    >
      {label}
    </span>
  );
}

export function QualityAssuranceDetailGrid({
  record,
  dateFmt,
}: {
  record: QualityAssuranceRecord;
  dateFmt: Intl.DateTimeFormat;
}) {
  const t = useTranslations("Dashboard.jobs.qualityAssurance");
  const approvedAt =
    record.approved_at != null && String(record.approved_at).trim() !== ""
      ? formatFlexibleApiDate(record.approved_at, dateFmt)
      : "—";

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("status")}
        </dt>
        <dd className="mt-1">
          <QualityAssuranceStatusBadge record={record} />
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("remarks")}
        </dt>
        <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {record.remarks?.trim() || "—"}
        </dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("approvedAt")}
        </dt>
        <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">{approvedAt}</dd>
      </div>
      <div>
        <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {t("approvedBy")}
        </dt>
        <dd className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
          {record.approved_by?.name?.trim() || "—"}
        </dd>
      </div>
    </dl>
  );
}
