"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchAuditTrails } from "@/features/audit-trails/api/audit-trail.api";
import type { AuditTrailEntry } from "@/features/audit-trails/types/audit-trail.types";
import {
  auditTrailActionLabel,
  auditTrailActorFromEntry,
  auditTrailHasFieldChanges,
  auditTrailOccurredAt,
  auditTrailPrimaryText,
  auditTrailUserLabel,
  parseAuditTrailFieldChanges,
  sortAuditTrailsByDateDesc,
} from "@/features/audit-trails/utils/audit-trail-display.util";
import { AuditTrailFieldChangesModal } from "@/features/audit-trails/components/audit-trail-field-changes-modal";
import { ExpandableClampText } from "@/features/audit-trails/components/expandable-clamp-text";
import { DetailPagePadding, DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { AppButton } from "@/shared/ui";

type Props = {
  module: string;
  objectId: number;
  dateFmt: Intl.DateTimeFormat;
  /** Optional panel title override. */
  title?: string;
};

export function EntityAuditTimeline({ module, objectId, dateFmt, title }: Props) {
  const t = useTranslations("Dashboard.auditTrails");
  const [entries, setEntries] = React.useState<AuditTrailEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AuditTrailEntry | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAuditTrails({ module, object_id: objectId });
        if (cancelled) return;
        setEntries(sortAuditTrailsByDateDesc(rows));
      } catch {
        if (!cancelled) setError(t("timeline.loadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [module, objectId, t]);

  return (
    <DetailPagePadding>
      <DetailPanelCard title={title ?? t("timeline.title")}>
        {loading ? (
          <p className="text-sm text-slate-500">{t("timeline.loading")}</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("timeline.empty")}</p>
        ) : (
          <ol className="relative space-y-6">
            <span
              aria-hidden
              className="pointer-events-none absolute bottom-0 left-[5px] top-0 w-px bg-slate-200 dark:bg-slate-700"
            />
            {entries.map((entry, index) => {
              const actor = auditTrailActorFromEntry(entry);
              const actorName = auditTrailUserLabel(actor);
              const actorRole = actor?.role?.trim() || "";
              const action = auditTrailActionLabel(entry);
              const when = auditTrailOccurredAt(entry);
              const description = auditTrailPrimaryText(entry);
              const hasChanges = auditTrailHasFieldChanges(entry);

              return (
                <li key={`${entry.id ?? "log"}-${index}`} className="relative pl-6">
                  <span
                    aria-hidden
                    className="absolute left-[5px] top-1.5 size-2.5 -translate-x-1/2 rounded-full bg-slate-900 ring-2 ring-white dark:bg-slate-100 dark:ring-slate-950"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    {action ? (
                      <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {action}
                      </span>
                    ) : null}
                    {when ? (
                      <time className="text-xs text-slate-500 dark:text-slate-400" dateTime={when}>
                        {formatFlexibleApiDate(when, dateFmt)}
                      </time>
                    ) : null}
                  </div>
                  <ExpandableClampText
                    clampClassName="line-clamp-3"
                    className="mt-1.5 font-semibold text-slate-900 dark:text-slate-100"
                    expandLabel={t("timeline.showMore")}
                    collapseLabel={t("timeline.showLess")}
                  >
                    {description || action || t("timeline.event")}
                  </ExpandableClampText>
                  {actorName ? (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      {actorRole
                        ? t("timeline.byActorRole", { name: actorName, role: actorRole })
                        : t("timeline.byActor", { name: actorName })}
                    </p>
                  ) : null}
                  {entry.ip_address?.trim() ? (
                    <p className="mt-0.5 text-xs text-slate-400">
                      {t("timeline.ip", { ip: entry.ip_address.trim() })}
                    </p>
                  ) : null}
                  {hasChanges ? (
                    <div className="mt-2">
                      <AppButton
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-xs font-semibold text-blue-600 hover:bg-transparent hover:underline dark:text-blue-400"
                        onClick={() => setSelected(entry)}
                      >
                        {t("timeline.viewChanges", {
                          count: parseAuditTrailFieldChanges(entry.changes).length,
                        })}
                      </AppButton>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </DetailPanelCard>

      <AuditTrailFieldChangesModal
        entry={selected}
        dateFmt={dateFmt}
        open={selected != null}
        onClose={() => setSelected(null)}
      />
    </DetailPagePadding>
  );
}
