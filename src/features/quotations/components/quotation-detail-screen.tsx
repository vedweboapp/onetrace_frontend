"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationDetailBody } from "@/features/quotations/components/quotation-detail-body";
import { QuotationExportDropdown } from "@/features/quotations/components/quotation-export-dropdown";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  getQuotationNestedSite,
  getQuotationSiteId,
  getQuotationCustomerId,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { fetchSite, fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import { EntityDetailEditButton, EntityDetailScreen } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";

type Props = {
  quotationId: number;
};

export function QuotationDetailScreen({ quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const dueFmt = useDashboardDateFormat({ dateOnly: true });

  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [siteNames, setSiteNames] = React.useState<Record<number, string>>({});
  const [tagNames, setTagNames] = React.useState<Record<number, string>>({});
  const [siteDetail, setSiteDetail] = React.useState<Site | null>(null);
  const [siteDetailLoading, setSiteDetailLoading] = React.useState(false);
  const [detailForSite, setDetailForSite] = React.useState<QuotationDetail | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of clients) mapped[row.id] = row.name;
          setClientNames(mapped);
        }
      } catch {
        if (!cancelled) setClientNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: sites } = await fetchSitesPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of sites) mapped[row.id] = row.site_name;
          setSiteNames(mapped);
        }
      } catch {
        if (!cancelled) setSiteNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: tags } = await fetchTagsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of tags) {
            const label = (row.name ?? row.tag_name ?? "").trim();
            if (label) mapped[row.id] = label;
          }
          setTagNames(mapped);
        }
      } catch {
        if (!cancelled) setTagNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!detailForSite) {
      setSiteDetail(null);
      setSiteDetailLoading(false);
      return;
    }

    let cancelled = false;
    const snap = detailForSite.site_snapshot;
    const snapshotAddressUsable =
      !!snap &&
      hasDetailAddress({
        line1: snap.address_line_1,
        line2: snap.address_line_2,
        city: snap.city,
        state: snap.state,
        pincode: snap.pincode,
        country: snap.country,
      });
    const nestedSite = getQuotationNestedSite(detailForSite.site);
    const nestedSiteAddressUsable =
      !!nestedSite &&
      hasDetailAddress({
        line1: nestedSite.address_line_1,
        line2: nestedSite.address_line_2,
        city: nestedSite.city,
        state: nestedSite.state,
        pincode: nestedSite.pincode,
        country: nestedSite.country,
      });
    if (snapshotAddressUsable || nestedSiteAddressUsable) {
      setSiteDetail(null);
      setSiteDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const siteId = detailForSite.site != null ? getQuotationSiteId(detailForSite.site) : null;
    if (siteId == null || !Number.isFinite(siteId)) {
      setSiteDetail(null);
      setSiteDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSiteDetailLoading(true);
    setSiteDetail(null);
    void (async () => {
      try {
        const row = await fetchSite(siteId);
        if (!cancelled) setSiteDetail(row);
      } catch {
        if (!cancelled) setSiteDetail(null);
      } finally {
        if (!cancelled) setSiteDetailLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [detailForSite]);

  return (
    <EntityDetailScreen
      entityId={quotationId}
      listSection="quotations"
      listRoute={routes.dashboard.quotations}
      loadError={t("detailLoadError")}
      fetch={fetchQuotation}
      getTitle={(detail) => detail.quote_name}
      onDetailChange={setDetailForSite}
      labels={{
        loadingTitle: t("detail.loadingTitle"),
        metaTitle: t("detailMetaTitle"),
        backAria: t("detail.backAria"),
        retry: t("detail.retry"),
      }}
      actions={({ detail, listBack }) => (
        <>
          <QuotationExportDropdown quotationId={quotationId} quoteName={detail.quote_name} />
          <EntityDetailEditButton
            label={t("edit")}
            listBack={listBack}
            fallbackRoute={routes.dashboard.quotations}
          />
        </>
      )}
    >
      {({ detail, dateFmt }) => {
        const customerIdForLookup = getQuotationCustomerId(detail.customer);
        const siteIdForLookup = getQuotationSiteId(detail.site);
        return (
          <QuotationDetailBody
            detail={detail}
            customerName={customerIdForLookup != null ? clientNames[customerIdForLookup] : undefined}
            siteName={
              detail.site_snapshot?.site_name?.trim() ||
              (siteIdForLookup != null ? siteNames[siteIdForLookup] : undefined)
            }
            tagLookup={tagNames}
            siteDetail={siteDetail}
            siteDetailLoading={siteDetailLoading}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
          />
        );
      }}
    </EntityDetailScreen>
  );
}
