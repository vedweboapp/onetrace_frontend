"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatchReturnRequest } from "@/features/dispatches/api/dispatch.api";
import { ReturnToStockDetailBody } from "@/features/dispatches/components/return-to-stock-detail-body";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

type Props = {
  requestId: number;
};

export function ReturnToStockDetailScreen({ requestId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  return (
    <EntityDetailScreen<DispatchReturnRequest>
      entityId={requestId}
      listSection="return-to-stock"
      listRoute={routes.dashboard.returnToStock}
      labels={{
        metaTitle: t("return.detail.metaTitle"),
        backAria: t("return.detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("return.loadListError")}
      fetch={fetchDispatchReturnRequest}
      getTitle={(detail) => detail.request_number}
      subtitle={(detail) => dispatchReturnWorkerSubtitle(detail)}
    >
      {({ detail }) => <ReturnToStockDetailBody detail={detail} dueFmt={dueFmt} />}
    </EntityDetailScreen>
  );
}

function dispatchReturnWorkerSubtitle(detail: DispatchReturnRequest): string {
  const worker = detail.worker_name;
  if (typeof worker === "object" && worker?.name?.trim()) return worker.name.trim();
  return "";
}
