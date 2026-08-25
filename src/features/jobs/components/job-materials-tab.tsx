"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchMaterialRequestsPage } from "@/features/material-requests/api/material-request.api";
import type { MaterialRequestListItem } from "@/features/material-requests/types/material-request.types";
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

function materialRequestStatusBadge(status: MaterialRequestListItem["status"]): React.ReactNode {
  if (!status) return "—";
  if (typeof status === "string") return <span>{status}</span>;
  if (typeof status === "object") {
    const name =
      (status as Record<string, unknown>)?.name || (status as Record<string, unknown>)?.status_name;
    const bgColor = (status as Record<string, unknown>)?.bg_colour;
    const textColor = (status as Record<string, unknown>)?.text_colour;
    if (!name) return "—";
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
        style={{
          backgroundColor: (bgColor as string) || "#E5E7EB",
          color: (textColor as string) || "#374151",
        }}
      >
        {String(name)}
      </span>
    );
  }
  return "—";
}

export function JobMaterialsTab({ detail }: Props) {
  const t = useTranslations("Dashboard.jobs");
  const tMaterialRequests = useTranslations("Dashboard.materialRequests");
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const [materialRequests, setMaterialRequests] = React.useState<MaterialRequestListItem[]>([]);
  const [loadingMaterialRequests, setLoadingMaterialRequests] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const reload = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingMaterialRequests(true);
      setLoadError(null);
      try {
        const { items } = await fetchMaterialRequestsPage(1, 50, { job: detail.id });
        if (!cancelled) {
          setMaterialRequests(items);
        }
      } catch {
        if (!cancelled) {
          setMaterialRequests([]);
          setLoadError(tMaterialRequests("loadError"));
        }
      } finally {
        if (!cancelled) setLoadingMaterialRequests(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail.id, tMaterialRequests, refreshNonce]);

  return (
    <DetailTabListShell
      loading={loadingMaterialRequests}
      loadError={loadError}
      isEmpty={materialRequests.length === 0}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <DashboardEmptyState
          fill
          iconName="materialStatus"
          title={tMaterialRequests("emptyTitle")}
          description={t("detail.materialsEmpty")}
        />
      }
      errorFallback={
        <EntityDetailErrorState
          fill
          message={loadError ?? tMaterialRequests("loadError")}
          retryLabel={t("detail.retry")}
          onRetry={reload}
        />
      }
    >
      <DetailPagePadding>
        <div className={detailPageStackClassName}>
          <DetailPanelCard title={t("detail.materialsTitle")}>
            <div className="mt-3">
              <DetailLinkedTable
                columns={[
                  { id: "request", header: tMaterialRequests("table.requestNumber"), widthClass: "w-[34%]" },
                  { id: "status", header: tMaterialRequests("table.status"), widthClass: "w-[24%]" },
                  {
                    id: "date",
                    header: tMaterialRequests("table.requestDate"),
                    narrow: true,
                    widthClass: "w-[18%]",
                  },
                  {
                    id: "items",
                    header: tMaterialRequests("table.items"),
                    narrow: true,
                    align: "right",
                    widthClass: "w-[12%]",
                  },
                ]}
                showRowNumbers={false}
              >
                {materialRequests.map((row) => (
                  <DetailLinkedTableRow key={row.id} index={row.id} showRowNumber={false}>
                    <DetailLinkedTableTd
                      className={detailLinkedTableCellClassName({
                        cellClassName: "font-medium text-slate-900 dark:text-slate-100",
                      })}
                    >
                      <DetailEntityLink
                        href={`${routes.dashboard.materialRequests}/${row.id}`}
                        className="text-blue-600 underline-offset-2 hover:underline"
                      >
                        {row.request_number || `#${row.id}`}
                      </DetailEntityLink>
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd className={detailLinkedTableCellClassName({})}>
                      {materialRequestStatusBadge(row.status)}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({ narrow: true, cellClassName: "tabular-nums" })}
                    >
                      {formatFlexibleApiDate(row.requested_date, dateFmt)}
                    </DetailLinkedTableTd>
                    <DetailLinkedTableTd
                      narrow
                      className={detailLinkedTableCellClassName({
                        align: "right",
                        narrow: true,
                        cellClassName: "tabular-nums",
                      })}
                    >
                      {row.items_count ?? row.items?.length ?? 0}
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
