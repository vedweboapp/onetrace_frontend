"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { EntityAuditTimeline } from "@/features/audit-trails/components/entity-audit-timeline";
import { AUDIT_TRAIL_MODULES } from "@/features/audit-trails/constants/audit-trail-modules";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";
import { getSiteContactPersonContactId, normalizeSiteContactPersonsFromApi } from "@/features/sites/utils/site-contact-person.util";
import { fetchSite } from "@/features/sites/api/site.api";
import { fetchTitlesPage } from "@/features/titles/api/title.api";
import { SiteDetailBody } from "@/features/sites/components/site-detail-body";
import type { Site } from "@/features/sites/types/site.types";
import {
  EntityDetailEditButton,
  EntityDetailErrorState,
  EntityDetailLoadingSkeleton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { entityDetailTabPanelClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { AppTabs, type AppTabItem } from "@/shared/ui";

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

function SiteDetailBodyWithContacts({
  detail,
  clientName,
  clientOptions,
  dateFmt,
  onSaved,
}: {
  detail: Site;
  clientName: string;
  clientOptions: { value: string; label: string }[];
  dateFmt: Intl.DateTimeFormat;
  onSaved?: () => void;
}) {
  const [contactNameById, setContactNameById] = React.useState<Record<number, string>>({});
  const [titleNameById, setTitleNameById] = React.useState<Record<string, string>>({});
  const clientId = siteClientId(detail);

  React.useEffect(() => {
    if (!clientId) {
      const timer = window.setTimeout(() => {
        setContactNameById({});
      }, 0);
      return () => window.clearTimeout(timer);
    }
    const rows = normalizeSiteContactPersonsFromApi(detail);
    const needsFetch = rows.some((row) => {
      const id = getSiteContactPersonContactId(row.contact);
      return id != null && typeof row.contact !== "object";
    });
    if (!needsFetch) {
      const fromRows: Record<number, string> = {};
      for (const row of rows) {
        if (row.contact && typeof row.contact === "object") {
          const label = formatContactName(row.contact);
          if (label) fromRows[row.contact.id] = label;
        }
      }
      const timer = window.setTimeout(() => {
        setContactNameById(fromRows);
      }, 0);
      return () => window.clearTimeout(timer);
    }
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchContactsPage(1, 20, { client: clientId, is_active: true, dropdown: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const c of items) {
            mapped[c.id] = formatContactName(c) || "—";
          }
          setContactNameById(mapped);
        }
      } catch {
        if (!cancelled) setContactNameById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detail, clientId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchTitlesPage(1, 20, { dropdown: true });
        if (!cancelled) {
          const mapped: Record<string, string> = {};
          for (const item of items) {
            mapped[String(item.id)] = item.title;
          }
          setTitleNameById(mapped);
        }
      } catch {
        if (!cancelled) setTitleNameById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SiteDetailBody
      detail={detail}
      clientName={clientName}
      clientOptions={clientOptions}
      dateFmt={dateFmt}
      contactNameById={contactNameById}
      titleNameById={titleNameById}
      onSaved={onSaved}
    />
  );
}

export function SiteDetailScreen({ siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const tAudit = useTranslations("Dashboard.auditTrails");
  const [clientNameById, setClientNameById] = React.useState<Record<number, string>>({});
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [activeTab, setActiveTab] = React.useState("details");

  const detailTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "details", label: tAudit("tabDetails") },
      { id: "timeline", label: tAudit("tabTimeline") },
    ],
    [tAudit],
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
        <AppTabs
          tabs={detailTabs}
          value={activeTab}
          onValueChange={setActiveTab}
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
            <SiteDetailBodyWithContacts
              detail={detail}
              clientName={siteClientName(detail, clientNameById)}
              clientOptions={clientOptions}
              dateFmt={dateFmt}
              onSaved={retry}
            />
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
