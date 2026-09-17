import type { Job } from "@/features/jobs/types/job.types";
import {
  jobToSiteAddressMapPoint,
  type JobMapPin,
} from "@/features/jobs/utils/job-site-map.util";
import type { OrganizationDetails } from "@/features/settings/company-settings/types/types";
import type { Schedule } from "@/features/scheduling/types/schedule.types";
import { scheduleJobLabel, scheduleWorkerIds } from "@/features/scheduling/utils/schedule-map.util";
import { hasGeocodeableAddress } from "@/shared/utils/address-geocode-query";

/** Sentinel pin id for company HQ (Jobs map components key markers by numeric jobId). */
export const ATTENDANCE_HQ_PIN_ID = -1;

export type AttendanceLocationFilter = "all" | "hq" | "job";

export type AttendanceLocationKind = "hq" | "job";

export type AttendanceWorkerRow = {
  workerId: number;
  workerName: string;
  workerTitle: string;
  scheduleId: number;
  jobId: number;
  jobLabel: string;
  clientName: string;
  startAt: string;
  endAt: string;
  activeNow: boolean;
};

export type AttendanceLocation = {
  pinId: number;
  kind: AttendanceLocationKind;
  pin: JobMapPin;
  workers: AttendanceWorkerRow[];
};

function formatOrgAddress(org: OrganizationDetails): string {
  const street = [org.street?.trim(), org.street2?.trim()].filter(Boolean).join(", ");
  const locality = [org.city?.trim(), org.state?.trim()].filter(Boolean).join(", ");
  const zip = org.zip?.trim() || "";
  const country = org.country?.trim() || "";
  const cityLine = [locality, zip].filter(Boolean).join(" ");
  return [street, cityLine, country].filter(Boolean).join(", ");
}

export function organizationToHqMapPin(
  org: OrganizationDetails,
  hqLabel: string,
): JobMapPin | null {
  const addressParts = {
    line1: org.street?.trim() || null,
    line2: org.street2?.trim() || null,
    city: org.city?.trim() || null,
    state: org.state?.trim() || null,
    pincode: org.zip?.trim() || null,
    country: org.country?.trim() || null,
  };
  if (!hasGeocodeableAddress(addressParts)) return null;

  const addressText = formatOrgAddress(org);
  const name = org.name?.trim() || hqLabel;
  return {
    id: ATTENDANCE_HQ_PIN_ID,
    jobId: ATTENDANCE_HQ_PIN_ID,
    jobLabel: name,
    addressText,
    siteName: name,
    label: [hqLabel, addressText || name].filter(Boolean).join(" · "),
    addressParts,
    coordinates: null,
  };
}

export function scheduleOverlapsNow(schedule: Pick<Schedule, "start_at" | "end_at">, now = new Date()): boolean {
  const start = new Date(schedule.start_at);
  const end = new Date(schedule.end_at);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
  const t = now.getTime();
  return start.getTime() <= t && t <= end.getTime();
}

export function workersFromSchedule(schedule: Schedule, now = new Date()): AttendanceWorkerRow[] {
  const ids = scheduleWorkerIds(schedule);
  if (ids.length === 0) return [];
  const names = schedule.worker_name
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const jobLabel = scheduleJobLabel(schedule);
  const activeNow = scheduleOverlapsNow(schedule, now);
  return ids.map((workerId, index) => ({
    workerId,
    workerName: names[index] || names[0] || `Worker #${workerId}`,
    workerTitle: schedule.worker_title?.trim() || "",
    scheduleId: schedule.id,
    jobId: schedule.job_id,
    jobLabel,
    clientName: schedule.client_name?.trim() || "",
    startAt: schedule.start_at,
    endAt: schedule.end_at,
    activeNow,
  }));
}

/**
 * Build attendance locations: one pin per scheduled job site + optional company HQ.
 * Workers on jobs without a mappable site are attached to HQ when available.
 */
export function buildAttendanceLocations(args: {
  schedules: Schedule[];
  jobsById: Map<number, Job>;
  hqPin: JobMapPin | null;
  now?: Date;
}): AttendanceLocation[] {
  const now = args.now ?? new Date();
  const byPin = new Map<number, AttendanceLocation>();

  if (args.hqPin) {
    byPin.set(ATTENDANCE_HQ_PIN_ID, {
      pinId: ATTENDANCE_HQ_PIN_ID,
      kind: "hq",
      pin: args.hqPin,
      workers: [],
    });
  }

  for (const schedule of args.schedules) {
    const rows = workersFromSchedule(schedule, now);
    if (rows.length === 0) continue;

    const job = schedule.job_id > 0 ? args.jobsById.get(schedule.job_id) : undefined;
    const jobPin = job ? jobToSiteAddressMapPoint(job) : null;

    if (jobPin) {
      const existing = byPin.get(jobPin.jobId);
      if (existing) {
        existing.workers.push(...rows);
      } else {
        byPin.set(jobPin.jobId, {
          pinId: jobPin.jobId,
          kind: "job",
          pin: jobPin,
          workers: [...rows],
        });
      }
      continue;
    }

    // Unmapped job site → show under HQ when available so workers are not dropped.
    const hq = byPin.get(ATTENDANCE_HQ_PIN_ID);
    if (hq) {
      hq.workers.push(...rows);
    }
  }

  // Dedupe workers per pin (same worker + schedule); prefer currently working first.
  for (const loc of byPin.values()) {
    const seen = new Set<string>();
    loc.workers = loc.workers.filter((w) => {
      const key = `${w.workerId}:${w.scheduleId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    loc.workers.sort((a, b) => Number(b.activeNow) - Number(a.activeNow) || a.workerName.localeCompare(b.workerName));
  }

  return [...byPin.values()];
}

export function filterAttendanceLocations(
  locations: AttendanceLocation[],
  filter: AttendanceLocationFilter,
  search: string,
): AttendanceLocation[] {
  const q = search.trim().toLowerCase();
  return locations.filter((loc) => {
    if (filter === "hq" && loc.kind !== "hq") return false;
    if (filter === "job" && loc.kind !== "job") return false;
    if (!q) return true;
    const hay = [
      loc.pin.jobLabel,
      loc.pin.addressText,
      loc.pin.siteName ?? "",
      loc.pin.label ?? "",
      ...loc.workers.flatMap((w) => [w.workerName, w.workerTitle, w.jobLabel, w.clientName]),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
