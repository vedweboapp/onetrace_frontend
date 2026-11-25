"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchSite, updateSiteAttachments } from "@/features/sites/api/site.api";
import { SITE_PATHS } from "@/features/sites/api/site.paths";
import { SiteDetailBody } from "@/features/sites/components/site-detail-body";
import type { Site } from "@/features/sites/types/site.types";
import { SiteAttachmentsTab } from "./site-attachments-tab";
import { EntityNotesTab } from "@/shared/notes/entity-notes-tab";
import {
  EntityDetailEditButton,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { useTabOrderStorageKey } from "@/shared/hooks/use-tab-order-storage-key";
import { CustomizableAppTabs, type AppTabItem } from "@/shared/ui";

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
  return "—";
}

type Props = {
  siteId: number;
};

export function SiteDetailScreen({ siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const tCommon = useTranslations("Dashboard.common");
  const tabsStorageKey = useTabOrderStorageKey("siteDetail");
  const [clientNameById, setClientNameById] = React.useState<Record<number, string>>({});
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = React.useState("details");

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: tAudit("tabDetails") },
      { id: "attachments", label: tCommon("attachmentsTab.title") },
      { id: "notes", label: tCommon("notesTab.title") },
      { id: "timeline", label: tAudit("tabTimeline") },
    ],
    [tAudit, tCommon],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 20, { is_active: true, dropdown: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          const options: { value: string; label: string }[] = [];
          for (const row of items) {
            mapped[row.id] = row.name;
            options.push({ value: String(row.id), label: row.name });
          }
          setClientNameById(mapped);
          setClientOptions(options);
        }
      } catch {
        if (!cancelled) {
          setClientNameById({});
          setClientOptions([]);
        }
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
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      headerExtension={
        <CustomizableAppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
          storageKey={tabsStorageKey}
          ariaLabel={tAudit("tabTimeline")}
          panelIdPrefix="site-detail-tab"
          className="-mx-1 px-1 sm:-mx-0 sm:px-0"
        />
      }
      actions={({ listBack }) => (
        <EntityDetailEditButton
          label={t("detail.editWithIcon")}
          listBack={listBack}
          fallbackRoute={routes.dashboard.sites}
        />
      )}
      renderSurface={({ detail, loading, error, retry, dateFmt }) => (
        <div
          role="tabpanel"
          id={`site-detail-tab-${activeTab}`}
          aria-labelledby={`site-detail-tab-trigger-${activeTab}`}
          className={entityDetailTabPanelClassName}
        >
          {loading ? (
            <EntityDetailLoadingSkeleton />
          ) : error ? (
            <EntityDetailErrorState message={error} retryLabel={t("detail.retry")} onRetry={retry} />
          ) : detail && activeTab === "details" ? (
            <SiteDetailBody
              detail={detail}
              clientName={siteClientName(detail, clientNameById)}
              clientOptions={clientOptions}
              dateFmt={dateFmt}
              onSaved={retry}
            />
          ) : detail && activeTab === "attachments" ? (
            <SiteAttachmentsTab detail={detail} onSaved={retry} />
          ) : detail && activeTab === "notes" ? (
            <EntityNotesTab detailPath={SITE_PATHS.detail(detail.id)} />
          ) : detail && activeTab === "timeline" ? (
            <EntityAuditTimeline
              module={AUDIT_TRAIL_MODULES.site}
              objectId={detail.id}
              dateFmt={dateFmt}
            />
          ) : null}
        </div>
      )}
    />
  );
}