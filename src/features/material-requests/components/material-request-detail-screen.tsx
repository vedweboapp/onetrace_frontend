"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchMaterialRequest } from "@/features/material-requests/api/material-request.api";
import { MaterialRequestDetailBody } from "@/features/material-requests/components/material-request-detail-body";
import { MaterialRequestDetailTimeline } from "@/features/material-requests/components/material-request-detail-timeline";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { useMaterialStatusCatalog } from "@/features/material-status/hooks/use-material-status-catalog";
import {
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, AppTabs } from "@/shared/ui";

type Props = {
  materialRequestId: number;
};

export function MaterialRequestDetailScreen({ materialRequestId }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = React.useState("overview");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const [workerNames, setWorkerNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const options = await loadTechnicianOptions();
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of options) {
            const id = Number.parseInt(row.value, 10);
            if (Number.isFinite(id)) mapped[id] = row.label;
          }
          setWorkerNames(mapped);
        }
      } catch {
        if (!cancelled) setWorkerNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { labelFor: statusLabel, rowFor: statusRowFor, options: statusOptions } = useMaterialStatusCatalog();

  const detailTabs = React.useMemo(
    () => [
      { id: "overview", label: t("detail.tabOverview") },
      { id: "logs", label: t("detail.tabActivityTimeline") },
    ],
    [t],
  );

  return (
    <EntityDetailScreen<MaterialRequestDetail>
      entityId={materialRequestId}
      listSection="material-requests"
      listRoute={routes.dashboard.materialRequests}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchMaterialRequest}
      getTitle={(detail) => detail.request_number}
      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="material-request-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
      actions={({ listBack }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            onClick={() =>
              router.push(buildPathWithStoredBack(`${pathname}/dispatch`, listBack))
            }
          >
            {t("actions.dispatch")}
          </AppButton>
        </div>
      )}
      renderSurface={({ detail, loading, error, retry, dateFmt }) => (
        <div
          role="tabpanel"
          id={`material-request-detail-tab-${activeTab}`}
          aria-labelledby={`material-request-detail-tab-trigger-${activeTab}`}
        >
          {loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "overview" ? (
            (() => {
              const workerId =
                typeof detail.worker_name === "number"
                  ? detail.worker_name
                  : detail.worker_name && typeof detail.worker_name === "object"
                    ? detail.worker_name.id
                    : undefined;
              return (
                <MaterialRequestDetailBody
                  detail={detail}
                  workerName={workerId != null ? workerNames[workerId] : undefined}
                  dateFmt={dateFmt}
                  dueFmt={dueFmt}
                  statusLabel={statusLabel(detail.status)}
                  statusRow={statusRowFor(detail.status)}
                  statusOptions={statusOptions}
                  onSaved={retry}
                />
              );
            })()
          ) : detail && activeTab === "logs" ? (
            <MaterialRequestDetailTimeline materialRequestId={detail.id} dateFmt={dateFmt} />
          ) : null}
        </div>
      )}
    />
  );
}
