"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatchesPage } from "@/features/dispatches/api/dispatch.api";
import type { DispatchListItem } from "@/features/dispatches/types/dispatch.types";
import { dispatchWorkerLabel } from "@/features/dispatches/utils/dispatch-display.util";
import type { Job } from "@/features/jobs/types/job.types";
import { DetailEntityLink, EntityDetailErrorState, EntityDetailTabLoadingState } from "@/shared/components/entity";
import {
  DetailLinkedTable,
  DetailLinkedTableRow,
  DetailLinkedTableTd,
  detailLinkedTableCellClassName,
} from "@/shared/components/layout/detail-linked-table";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import {
  DetailPagePadding,
  DetailPanelCard,
  detailPageStackClassName,
} from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { DashboardEmptyState } from "@/shared/ui";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  detail: Job;
};

export function JobDispatchTab({ detail }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const tDispatches = useTranslations("Dashboard.dispatches");
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const [dispatches, setDispatches] = React.useState<DispatchListItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const reload = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items } = await fetchDispatchesPage(1, 50, { job: detail.id });
        if (!cancelled) {
          setDispatches(items);
        }
      } catch {
        if (!cancelled) {
          setDispatches([]);
          setLoadError(t("detail.dispatchesLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, t, refreshNonce]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={dispatches.length === 0}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <DashboardEmptyState
          fill
          iconName="items"
          title={tDispatches("emptyTitle")}
          description={t("detail.dispatchesEmpty")}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? t("detail.dispatchesLoadError")}
          retryLabel={t("detail.retry")}
          onRetry={reload}
        />
      }
    >
      <DetailPagePadding>
        <div className={detailPageStackClassName}>
          <DetailPanelCard title={t("detail.dispatchesTitle")}>
            <div className="mt-3">
              <DetailLinkedTable
                columns={[
                  { id: "dispatch_id", header: tDispatches("table.dispatchId"), widthClass: "w-[34%]" },
                  { id: "date", header: tDispatches("table.dispatchDate"), widthClass: "w-[22%]", narrow: true },
                  { id: "worker", header: tDispatches("table.workerName"), widthClass: "w-[28%]" },
                  {
                    id: "qty",
                    header: tDispatches("table.qty"),
                    narrow: true,
                    align: "right",
                    widthClass: "w-[16%]",
                  },
                ]}
                showRowNumbers={false}
              >
                {dispatches.map((row) => (
                  <DetailLinkedTableRow key={row.id} index={row.id} showRowNumber={false}>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                      })}
                    >
                      <DetailEntityLink
                        href={`${routes.dashboard.dispatches}/${row.id}`}
                        className="text-blue-600 underline-offset-2 hover:underline"
                      >
                        {row.dispatch_order_number || `#${row.id}`}
                      </DetailEntityLink>
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {formatFlexibleApiDate(row.dispatch_date, dateFmt)}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                      {dispatchWorkerLabel(row.worker_name) || "—"}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({
                        align: "right",
                        narrow: true,
                        cellClassName: "tabular-nums",
                      })}
                    >
                      {row.total_qty} {tDispatches("units")}
                    </DetailLinkedTableTd>
                  </DetailLinkedTableRow>
                ))}
              </DetailLinkedTable>
            </div>
          </DetailPanelCard>
        </div>
      </DetailPagePadding>
    </DetailTabListShell>
  );
}
