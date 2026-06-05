"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatch } from "@/features/dispatches/api/dispatch.api";
import {
  DispatchDetailBody,
  dispatchStatusLabel,
} from "@/features/dispatches/components/dispatch-detail-body";
import type { DispatchDetail } from "@/features/dispatches/types/dispatch.types";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

type Props = {
  dispatchId: number;
};

export function DispatchDetailScreen({ dispatchId }: Props) {
  const t = useTranslations("Dashboard.dispatches");
  const [liveDetail, setLiveDetail] = React.useState<DispatchDetail | null>(null);
  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [],
  );

  React.useEffect(() => {
    setLiveDetail(null);
  }, [dispatchId]);

  return (
    <EntityDetailScreen<DispatchDetail>
      entityId={dispatchId}
      listSection="dispatches"
      listRoute={routes.dashboard.dispatches}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      loadError={t("detailLoadError")}
      fetch={fetchDispatch}
      getTitle={(detail) => detail.dispatch_number}
    >
      {({ detail, dateFmt }) => {
        const active = liveDetail?.id === detail.id ? liveDetail : detail;
        return (
          <DispatchDetailBody
            detail={active}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
            statusLabel={dispatchStatusLabel(t, active.status)}
            onDetailChange={setLiveDetail}
          />
        );
      }}
    </EntityDetailScreen>
  );
}
