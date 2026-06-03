"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchMaterialRequest } from "@/features/material-requests/api/material-request.api";
import { MaterialRequestDetailBody } from "@/features/material-requests/components/material-request-detail-body";
import type { MaterialRequestDetail } from "@/features/material-requests/types/material-request.types";
import { loadTechnicianOptions } from "@/features/jobs/utils/load-technician-options.util";
import { normalizeMaterialRequestStatus } from "@/features/material-requests/utils/material-request-nested-fields.util";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { AppButton, AppTabs } from "@/shared/ui";

type Props = {
  materialRequestId: number;
};

export function MaterialRequestDetailScreen({ materialRequestId }: Props) {
  const t = useTranslations("Dashboard.materialRequests");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  const [activeTab, setActiveTab] = React.useState<"overview" | "dispatch" | "timeline">("overview");
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

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizeMaterialRequestStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "pending") return t("status.pending");
      if (norm === "partially_dispatched" || norm === "partial") return t("status.partiallyDispatched");
      if (norm === "dispatched") return t("status.dispatched");
      return code?.trim() || "—";
    },
    [t],
  );

  const detailTabs = React.useMemo(
    () => [
      { id: "overview", label: t("tabs.overview") },
      { id: "dispatch", label: t("tabs.dispatch") },
      { id: "timeline", label: t("tabs.timeline") },
    ],
    [t],
  );

  return (
    <EntityDetailScreen<MaterialRequestDetail>
      entityId={materialRequestId}
      listSection="material-requests"
      listRoute={routes.dashboard.materialRequests}
      labels={{
        loadingTitle: t("detail.loadingTitle"),
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
          onValueChange={(id) => setActiveTab(id as "overview" | "dispatch" | "timeline")}
        />
      }
      actions={({ detail, listBack }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton type="button" variant="primary" size="sm">
            {t("actions.dispatch")}
          </AppButton>
          <EntityDetailEditButton
            listBack={listBack}
            fallbackRoute={routes.dashboard.materialRequests}
            label={t("edit")}
          />
        </div>
      )}
    >
      {({ detail, dateFmt }) => {
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
            activeTab={activeTab}
          />
        );
      }}
    </EntityDetailScreen>
  );
}
