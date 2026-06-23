"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { DetailEntityLink } from "@/shared/components/entity";
import { fetchMaterialRequestLogs } from "@/features/material-requests/api/material-request.api";
import type { MaterialRequestLogEntry } from "@/features/material-requests/types/material-request.types";
import { DetailPagePadding, DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  materialRequestId: number;
  dateFmt: Intl.DateTimeFormat;
};

export function MaterialRequestDetailTimeline({ materialRequestId, dateFmt }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const [logs, setLogs] = React.useState<MaterialRequestLogEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchMaterialRequestLogs(materialRequestId);
        if (!cancelled) setLogs(rows);
      } catch {
        if (!cancelled) setError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [materialRequestId, t]);

  return (
    <DetailPagePadding>
      <DetailPanelCard title={t("detail.sectionActivityTimeline")}>
        {loading ? (
          <p className="text-sm text-slate-500">{t("detail.loadingTitle")}</p>
        ) : error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("timeline.empty")}</p>
        ) : (
          <ol className="relative space-y-6 border-l border-slate-200 pl-6 dark:border-slate-700">
            {logs.map((entry, index) => (
              <li key={`${entry.id ?? "log"}-${index}`} className="relative">
                <span className="absolute -left-[1.625rem] top-1.5 size-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    {entry.title?.trim() || t("timeline.event")}
                  </p>
                  {entry.occurred_at ? (
                    <p className="text-xs text-slate-500">
                      {formatFlexibleApiDate(entry.occurred_at, dateFmt)}
                    </p>
                  ) : null}
                </div>
                {entry.description?.trim() ? (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{entry.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {entry.tag?.trim() ? (
                    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {entry.tag}
                    </span>
                  ) : null}
                  {entry.dispatch_id != null && entry.dispatch_id > 0 ? (
                    <DetailEntityLink
                      href={`${routes.dashboard.dispatches}/${entry.dispatch_id}`}
                      className="text-xs font-semibold text-slate-900 underline-offset-2 hover:underline dark:text-slate-100"
                    >
                      {t("logs.viewDispatch")}
                    </DetailEntityLink>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </DetailPanelCard>
    </DetailPagePadding>
  );
}
