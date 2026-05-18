"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchSite } from "@/features/sites/api/site.api";
import { SiteDetailBody } from "@/features/sites/components/site-detail-body";
import type { Site } from "@/features/sites/types/site.types";
import {
  EntityDetailEditButton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";

function siteClientId(site: Site): number | null {
  if (typeof site.client === "number" && Number.isFinite(site.client) && site.client > 0) return site.client;
  if (site.client && typeof site.client === "object" && Number.isFinite(site.client.id) && site.client.id > 0) {
    return site.client.id;
  }
  return null;
}

function siteClientName(site: Site, clientNameById: Record<number, string>): string {
  if (site.client && typeof site.client === "object" && site.client.name?.trim()) return site.client.name.trim();
  const id = siteClientId(site);
  if (id && clientNameById[id]) return clientNameById[id];
  return id ? `#${id}` : "—";
}

type Props = {
  siteId: number;
};

export function SiteDetailScreen({ siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const [clientNameById, setClientNameById] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of items) mapped[row.id] = row.name;
          setClientNameById(mapped);
        }
      } catch {
        if (!cancelled) setClientNameById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <EntityDetailScreen
      entityId={siteId}
      listSection="sites"
      listRoute={routes.dashboard.sites}
      loadError={t("detailLoadError")}
      fetch={fetchSite}
      getTitle={(detail) => detail.site_name}
      labels={{
        loadingTitle: t("detail.loadingTitle"),
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ listBack }) => (
        <EntityDetailEditButton
          label={t("detail.editWithIcon")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.sites}
        />
      )}
    >
      {({ detail, dateFmt }) => (
        <SiteDetailBody detail={detail} clientName={siteClientName(detail, clientNameById)} dateFmt={dateFmt} />
      )}
    </EntityDetailScreen>
  );
}
