"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchDispatch } from "@/features/dispatches/api/dispatch.api";
import { DispatchDetailBody } from "@/features/dispatches/components/dispatch-detail-body";
import type { DispatchDetail } from "@/features/dispatches/types/dispatch.types";
import { EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

type Props = {
  dispatchId: number;
};

export function DispatchDetailScreen({ dispatchId }: Props) {
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
      getTitle={(detail) => detail.dispatch_order_number}
    >
      {({ detail, dateFmt }) => (
        <DispatchDetailBody detail={detail} dateFmt={dateFmt} dueFmt={dueFmt} />
      )}
    </EntityDetailScreen>
  );
}
