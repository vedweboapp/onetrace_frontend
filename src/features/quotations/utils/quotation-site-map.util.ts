import type { QuotationSiteSnapshot } from "@/features/quotations/types/quotation.types";
import type { Site } from "@/features/sites/types/site.types";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";

function parseSiteCoord(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function siteToAddressMapPoint(site: Site): AddressMapPoint {
  const lat = parseSiteCoord(site.latitude);
  const lon = parseSiteCoord(site.longitude);
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
    coordinates: lat != null && lon != null ? { lat, lon } : null,
  };
}

export function quotationSiteSnapshotToAddressMapPoint(snap: QuotationSiteSnapshot): AddressMapPoint {
  const lat = parseSiteCoord((snap as { latitude?: unknown }).latitude);
  const lon = parseSiteCoord((snap as { longitude?: unknown }).longitude);
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
    coordinates: lat != null && lon != null ? { lat, lon } : null,
  };
}

export function siteHasMapableLocation(site: Pick<Site, "latitude" | "longitude" | "address_line_1" | "city" | "pincode" | "country">): boolean {
  const lat = parseSiteCoord(site.latitude);
  const lon = parseSiteCoord(site.longitude);
  if (lat != null && lon != null) return true;
  return Boolean(
    site.address_line_1?.trim() ||
      site.city?.trim() ||
      site.pincode?.trim() ||
      site.country?.trim(),
  );
}
