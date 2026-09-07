import type { Job, JobSiteRef } from "@/features/jobs/types/job.types";
import type { AddressMapPoint } from "@/shared/components/maps/google-address-multi-mini-map";
import { hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";

function parseCoord(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asJobSiteRef(site: Job["site"]): JobSiteRef | null {
  if (site && typeof site === "object" && typeof site.id === "number" && site.id > 0) {
    return site;
  }
  return null;
}

function sitePostalCode(site: JobSiteRef): string {
  return (site.pincode ?? site.zip_code ?? "").trim();
}

export function formatJobSiteAddress(site: JobSiteRef | null | undefined): string {
  if (!site) return "";
  return [
    site.address_line_1?.trim(),
    site.address_line_2?.trim(),
    site.city?.trim(),
    site.state?.trim(),
    sitePostalCode(site) || null,
    site.country?.trim(),
  ]
    .filter(Boolean)
    .join(", ");
}

/** True when the job's nested site has coords or enough address text to geocode. */
export function jobHasMapableSite(job: Pick<Job, "site">): boolean {
  const site = asJobSiteRef(job.site);
  if (!site) return false;
  const lat = parseCoord(site.latitude);
  const lon = parseCoord(site.longitude);
  if (lat != null && lon != null) return true;
  return hasGeocodeableAddress({
    line1: site.address_line_1?.trim() ?? "",
    line2: site.address_line_2?.trim() ?? "",
    city: site.city?.trim() ?? "",
    state: site.state?.trim() ?? "",
    pincode: sitePostalCode(site),
    country: site.country?.trim() ?? "",
  });
}

export type JobMapPin = AddressMapPoint & {
  jobId: number;
  jobLabel: string;
  addressText: string;
  siteName: string | null;
};

/**
 * Build a map pin from the job's site address.
 * Uses job id as the point id so multiple jobs at the same site stay distinct.
 */
export function jobToSiteAddressMapPoint(job: Job): JobMapPin | null {
  const site = asJobSiteRef(job.site);
  if (!site || !jobHasMapableSite(job)) return null;

  const lat = parseCoord(site.latitude);
  const lon = parseCoord(site.longitude);
  const serial = job.job_serial_number?.trim();
  const title = job.title?.trim();
  const jobLabel = serial || title || `Job #${job.id}`;
  const siteName = site.site_name?.trim() || null;
  const addressText = formatJobSiteAddress(site);
  const label = [jobLabel, siteName].filter(Boolean).join(" · ");

  return {
    id: job.id,
    jobId: job.id,
    jobLabel,
    addressText,
    siteName,
    label,
    addressParts: {
      line1: site.address_line_1,
      line2: site.address_line_2,
      city: site.city,
      state: site.state,
      pincode: sitePostalCode(site) || null,
      country: site.country,
    },
    coordinates: lat != null && lon != null ? { lat, lon } : null,
  };
}
