"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchClient } from "@/features/clients/api/client.api";
import { ClientContactsTab } from "@/features/clients/components/client-contacts-tab";
import { ClientDetailBody } from "@/features/clients/components/client-detail-body";
import { ClientSitesTab } from "@/features/clients/components/client-sites-tab";
import {
  EntityDetailEditButton,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { AppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  clientId: number;
};

export function ClientDetailScreen({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: t("detail.tabs.details") },
      { id: "contacts", label: t("detail.tabs.contacts") },
      { id: "sites", label: t("detail.tabs.sites") },
    ],
    [t],
  );

  const allowedDetailTabIds = React.useMemo(() => new Set(detailTabs.map((x) => x.id)), [detailTabs]);

  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTab] = React.useState(() =>
    tabFromUrl && ["details", "contacts", "sites"].includes(tabFromUrl) ? tabFromUrl : "details",
  );

  React.useEffect(() => {
    const tab = searchParams.get("tab");
    if (!tab || !allowedDetailTabIds.has(tab)) return;
    setActiveTab(tab);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("tab");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [searchParams, pathname, router, allowedDetailTabIds]);

  return (
    <EntityDetailScreen
      entityId={clientId}
      listSection="clients"
      listRoute={routes.dashboard.clients}
      loadError={t("detailLoadError")}
      fetch={fetchClient}
      getTitle={(detail) => detail.name}
      labels={{
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}

      headerExtension={
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={(tab) => {
            setActiveTab(tab);
            const p = new URLSearchParams(searchParams.toString());
            if (tab === "details") p.delete("tab");
            else p.set("tab", tab);
            const qs = p.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
          }}
          ariaLabel={t("detail.tabsAria")}
          panelIdPrefix="client-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
      actions={({ listBack }) => (
        <EntityDetailEditButton
          label={t("detail.editWithIcon")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.clients}
        />
      )}


      renderSurface={({ detail, loading, error, retry, dateFmt }) => (
        <div
          role="tabpanel"
          id={`client-detail-tab-${activeTab}`}
          aria-labelledby={`client-detail-tab-trigger-${activeTab}`}
        >
          {loading && activeTab === "details" ? (
            <EntityDetailLoadingSkeleton />
          ) : error && activeTab === "details" ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            <ClientDetailBody detail={detail} dateFmt={dateFmt} />
          ) : loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "contacts" ? (
            <ClientContactsTab clientId={detail.id} />
          ) : detail && activeTab === "sites" ? (
            <ClientSitesTab clientId={detail.id} />
          ) : null}
        </div>
      )}
    />
  );
}



