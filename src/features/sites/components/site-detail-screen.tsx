"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { getSiteContactPersonContactId, normalizeSiteContactPersonsFromApi } from "@/features/sites/utils/site-contact-person.util";
import { fetchSite, patchSite } from "@/features/sites/api/site.api";
import { SiteDetailBody } from "@/features/sites/components/site-detail-body";
import type { Site } from "@/features/sites/types/site.types";
import {
  EntityDetailEditButton,
  EntityDetailScreen,
} from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";

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

function SiteDetailBodyWithContacts({
  detail,
  clientName,
  dateFmt,
}: {
  detail: Site;
  clientName: string;
  dateFmt: Intl.DateTimeFormat;
}) {
  const [contactNameById, setContactNameById] = React.useState<Record<number, string>>({});
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
        if (row.contact && typeof row.contact === "object" && row.contact.name?.trim()) {
          fromRows[row.contact.id] = row.contact.name.trim();
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
        const { items } = await fetchContactsPage(1, 500, { client: clientId, is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const c of items) {
            mapped[c.id] = c.name?.trim() || c.email?.trim() || `#${c.id}`;
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

  return (
    <SiteDetailBody
      detail={detail}
      clientName={clientName}
      dateFmt={dateFmt}
      contactNameById={contactNameById}
    />
  );
}

export function SiteDetailScreen({ siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const [clientNameById, setClientNameById] = React.useState<Record<number, string>>({});
  const [togglingActive, setTogglingActive] = React.useState(false);

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
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
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
                await patchSite(detail.id, { is_active: next });
                toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
                retry();
              } catch (error) {
                toastApiError(error, t("toggleActiveError"));
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
            fallbackRoute={routes.dashboard.sites}
          />
        </div>
      )}
    >
      {({ detail, dateFmt }) => (
        <SiteDetailBodyWithContacts
          detail={detail}
          clientName={siteClientName(detail, clientNameById)}
          dateFmt={dateFmt}
        />
      )}
    </EntityDetailScreen>
  );
}
