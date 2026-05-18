"use client";

import { useTranslations } from "next-intl";
import { fetchClient } from "@/features/clients/api/client.api";
import { ClientDetailBody } from "@/features/clients/components/client-detail-body";
import {
  EntityDetailEditButton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

type Props = {
  clientId: number;
};

export function ClientDetailScreen({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");

  return (
    <EntityDetailScreen
      entityId={clientId}
      listSection="clients"
      listRoute={routes.dashboard.clients}
      loadError={t("detailLoadError")}
      fetch={fetchClient}
      getTitle={(detail) => detail.name}
      labels={{
        loadingTitle: t("detail.loadingTitle"),
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ detail: _detail, listBack }) => (
        <EntityDetailEditButton
          label={t("detail.editWithIcon")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.clients}
        />
      )}
    >
      {({ detail, dateFmt }) => <ClientDetailBody detail={detail} dateFmt={dateFmt} />}
    </EntityDetailScreen>
  );
}
