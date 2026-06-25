"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import {
  completeDispatchReturnRequest,
  fetchDispatchReturnRequest,
} from "@/features/dispatches/api/dispatch.api";
import { ReturnToStockDetailBody } from "@/features/dispatches/components/return-to-stock-detail-body";
import type { DispatchReturnRequest } from "@/features/dispatches/types/dispatch.types";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { EntityDetailScreen } from "@/shared/components/entity";
import { AppButton } from "@/shared/ui";
import { routes } from "@/shared/config/routes";

type Props = {
  requestId: number;
};

export function ReturnToStockDetailScreen({ requestId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const [completing, setCompleting] = React.useState(false);
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  async function handleReturnToStock(detail: DispatchReturnRequest, retry: () => void) {
    setCompleting(true);
    try {
      await completeDispatchReturnRequest(detail.id);
      toastSuccess(t("return.completeSuccessToast"));
      retry();
    } finally {
      setCompleting(false);
    }
  }

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
      actions={({ detail, retry }) =>
        detail.status === "pending" ? (
          <AppButton
            type="button"
            variant="primary"
            size="sm"
            loading={completing}
            disabled={completing}
            onClick={() => void handleReturnToStock(detail, retry)}
          >
            {t("return.completeToStock")}
          </AppButton>
        ) : null
      }
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
