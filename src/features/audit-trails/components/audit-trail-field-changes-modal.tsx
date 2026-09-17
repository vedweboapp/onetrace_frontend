"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import type { AuditTrailEntry } from "@/features/audit-trails/types/audit-trail.types";
import {
  auditTrailActionLabel,
  auditTrailActorFromEntry,
  auditTrailOccurredAt,
  auditTrailUserLabel,
  parseAuditTrailFieldChanges,
} from "@/features/audit-trails/utils/audit-trail-display.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { AppButton, AppModal } from "@/shared/ui";

type Props = {
  entry: AuditTrailEntry | null;
  dateFmt: Intl.DateTimeFormat;
  open: boolean;
  onClose: () => void;
  onOpenRecord?: () => void;
};

export function AuditTrailFieldChangesModal({
  entry,
  dateFmt,
  open,
  onClose,
  onOpenRecord,
}: Props) {
  const t = useTranslations("Dashboard.auditTrails");
  const changes = React.useMemo(
    () => (entry ? parseAuditTrailFieldChanges(entry.changes) : []),
    [entry],
  );

  if (!entry) return null;

  const actor = auditTrailActorFromEntry(entry);
  const actorName = auditTrailUserLabel(actor) ?? t("unknownUser");
  const when = auditTrailOccurredAt(entry);
  const action = auditTrailActionLabel(entry) || t("actionFallback");
  const ip = entry.ip_address?.trim();

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={t("changesModal.title")}
      size="lg"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <AppButton type="button" variant="secondary" onClick={onClose}>
            {t("changesModal.cancel")}
          </AppButton>
          {onOpenRecord ? (
            <AppButton type="button" variant="primary" onClick={onOpenRecord}>
              {t("changesModal.openRecord")}
            </AppButton>
          ) : null}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-800 dark:text-slate-100">
            {action}
            {when ? ` · ${formatFlexibleApiDate(when, dateFmt)}` : ""}
          </p>
          <p>
            {t("changesModal.changedBy", { name: actorName })}
            {ip ? ` · ${t("changesModal.ip", { ip })}` : ""}
          </p>
        </div>

        {changes.length === 0 ? (
          <p className="text-sm text-slate-500">{t("changesModal.empty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2.5">{t("changesModal.colField")}</th>
                  <th className="px-3 py-2.5">{t("changesModal.colFrom")}</th>
                  <th className="px-3 py-2.5">{t("changesModal.colTo")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {changes.map((row) => (
                  <tr key={row.field}>
                    <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-slate-100">
                      {row.field}
                    </td>
                    <td className="max-w-[14rem] break-words px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {row.from}
                    </td>
                    <td className="max-w-[14rem] break-words px-3 py-2.5 text-slate-600 dark:text-slate-300">
                      {row.to}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppModal>
  );
}
