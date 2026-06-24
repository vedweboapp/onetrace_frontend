import type { QuotationSiteSnapshot } from "@/features/quotations/types/quotation.types";
import type { Site } from "@/features/sites/types/site.types";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";

export function siteToAddressMapPoint(site: Site): AddressMapPoint {
  const lat = site.latitude;
  const lon = site.longitude;
  return {
    id: site.id,
    label: site.site_name,
    addressParts: {
      line1: site.address_line_1,
      line2: site.address_line_2,
      city: site.city,
      state: site.state,
      pincode: site.pincode,
      country: site.country,
    },
    coordinates:
      lat != null && lon != null && Number.isFinite(lat) && Number.isFinite(lon)
        ? { lat, lon }
        : null,
  };
}

export function quotationSiteSnapshotToAddressMapPoint(snap: QuotationSiteSnapshot): AddressMapPoint {
  return {
    id: snap.id,
    label: snap.site_name,
    addressParts: {
      line1: snap.address_line_1,
      line2: snap.address_line_2,
      city: snap.city,
      state: snap.state,
      pincode: snap.pincode,
      country: snap.country,
    },
    coordinates: null,
  };
}
