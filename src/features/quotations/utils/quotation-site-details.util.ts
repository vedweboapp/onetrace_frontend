import type { QuotationDetail, QuotationSiteSnapshot } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationNestedSite,
  getQuotationSiteIds,
  quotationNestedSiteToSite,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchSite } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";

function snapshotAddressParts(snap: QuotationSiteSnapshot) {
  return {
    line1: snap.address_line_1,
    line2: snap.address_line_2,
    city: snap.city,
    state: snap.state,
    pincode: snap.pincode,
    country: snap.country,
  };
}

function siteAddressParts(site: Site) {
  return {
    line1: site.address_line_1,
    line2: site.address_line_2,
    city: site.city,
    state: site.state,
    pincode: site.pincode,
    country: site.country,
  };
}

/** Loads full site rows for quotation detail map/address panels. */
export async function resolveQuotationSiteDetails(detail: QuotationDetail): Promise<Site[]> {
  const ids = getQuotationSiteIds(detail);
  if (ids.length === 0) return [];

  const clientId = getQuotationCustomerId(detail.customer) ?? 0;
  const snapshots = [
    ...(detail.site_snapshots ?? []),
    ...(detail.site_snapshot ? [detail.site_snapshot] : []),
  ];
  const snapshotById = new Map<number, QuotationSiteSnapshot>();
  for (const snap of snapshots) {
    if (snap?.id) snapshotById.set(snap.id, snap);
  }

  const nestedSite = getQuotationNestedSite(detail.site);
  const rows: Site[] = [];

  for (const id of ids) {
    const snap = snapshotById.get(id);
    if (snap && hasDetailAddress(snapshotAddressParts(snap)) && clientId > 0) {
      rows.push(quotationNestedSiteToSite(snap, clientId));
      continue;
    }
    if (nestedSite?.id === id && hasDetailAddress(siteAddressParts(nestedSite as Site)) && clientId > 0) {
      rows.push(quotationNestedSiteToSite(nestedSite, clientId));
      continue;
    }
    try {
      rows.push(await fetchSite(id));
    } catch {
      if (snap && clientId > 0) {
        rows.push(quotationNestedSiteToSite(snap, clientId));
      }
    }
  }

  return rows;
}
