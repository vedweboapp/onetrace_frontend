"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatchReturnRequests } from "@/features/dispatches/api/dispatch.api";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { dispatchReturnWorkerLabel } from "@/features/dispatches/utils/dispatch-return.util";
import { ReturnRequestStatusBadge } from "@/features/dispatches/components/return-request-status-badge";
import type { Job } from "@/features/jobs/types/job.types";
import { DetailEntityLink } from "@/shared/components/entity";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import {
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: Job;
};

export function JobReturnsTab({ detail }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const tDispatches = useTranslations("Dashboard.dispatches");
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const [returnRequests, setReturnRequests] = React.useState<DispatchReturnRequest[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const items = await fetchDispatchReturnRequests({ job: detail.id });
        if (!cancelled) {
          setReturnRequests(items);
        }
      } catch {
        if (!cancelled) {
          setReturnRequests([]);
          setLoadError(t("detail.returnsLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, t]);

  return (
    <DetailPagePadding>
      <div className={detailPageStackClassName}>
        <DetailPanelCard title={t("detail.returnsTitle")}>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {tDispatches("loadingTitle")}
            </p>
          ) : loadError ? (
            <p className="mt-3 text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : returnRequests.length > 0 ? (
            <div className="mt-3">
              <DetailLinkedTable
                columns={[
                  { id: "request_number", header: tDispatches("return.detail.requestNumber"), widthClass: "w-[28%]" },
                  { id: "status", header: tDispatches("table.status"), widthClass: "w-[22%]" },
                  { id: "worker", header: tDispatches("table.workerName"), widthClass: "w-[28%]" },
                  {
                    id: "requested_at",
                    header: tDispatches("return.detail.requestedAt"),
                    narrow: true,
                    widthClass: "w-[22%]",
                  },
                ]}
                showRowNumbers={false}
              >
                {returnRequests.map((row) => (
                  <DetailLinkedTableRow key={row.id} index={row.id} showRowNumber={false}>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                      })}
                    >
                      <DetailEntityLink
                        href={`${routes.dashboard.returnToStock}/${row.id}`}
                        className="text-blue-600 underline-offset-2 hover:underline"
                      >
                        {row.request_number || `#${row.id}`}
                      </DetailEntityLink>
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                      <ReturnRequestStatusBadge status={row.status} />
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                      {dispatchReturnWorkerLabel(row.worker_name) || "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {formatFlexibleApiDate(row.requested_at, dateFmt)}
                    </DetailLinkedTableTd>
                  </DetailLinkedTableRow>
                ))}
              </DetailLinkedTable>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {t("detail.returnsEmpty")}
            </p>
          )}
        </DetailPanelCard>
      </div>
    </DetailPagePadding>
  );
}
