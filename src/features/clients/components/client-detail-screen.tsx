"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { fetchClient, updateClient } from "@/features/clients/api/client.api";
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
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { AppButton, AppTabs, type AppTabItem } from "@/shared/ui";

type Props = {
  clientId: number;
};

export function ClientDetailScreen({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [togglingActive, setTogglingActive] = React.useState(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      actions={({ detail, listBack, retry }) => (
        <div className="flex flex-wrap items-center gap-2">
          <AppButton
            type="button"
            variant="secondary"
            size="sm"
            loading={togglingActive}
            disabled={togglingActive}
            onClick={async () => {
              const next = !detail.is_active;
              setTogglingActive(true);
              try {
                await updateClient(detail.id, { is_active: next });
                toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
                retry();
              } catch {
                toastError(t("toggleActiveError"));
              } finally {
                setTogglingActive(false);
              }
            }}
          >
            {detail.is_active ? t("deactivate") : t("activate")}
          </AppButton>
          <EntityDetailEditButton
            label={t("detail.editWithIcon")}
            listBack={listBack}
            fallbackRoute={routes.dashboard.clients}
          />
        </div>
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



