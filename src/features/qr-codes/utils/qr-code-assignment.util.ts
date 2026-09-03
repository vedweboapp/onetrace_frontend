import type {
  QrCode,
  QrCodeAssignedJobRef,
  QrCodeAssignedPinRef,
  QrCodeAssignedToDetail,
} from "@/features/qr-codes/types/qr-code.types";
import { routes } from "@/shared/config/routes";

function positiveId(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Normalize `assigned_to_detail` from API.
 * Current shape: `{ pin: { id }, job: { id } }`.
 * Legacy shape (job fields at top level): `{ id, title, ... }` treated as job only.
 */
export function normalizeQrAssignedToDetail(raw: unknown): QrCodeAssignedToDetail | null {
  if (raw == null || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;

  const pinRaw = row.pin;
  let pin: QrCodeAssignedPinRef | null = null;
  if (pinRaw && typeof pinRaw === "object") {
    const p = pinRaw as Record<string, unknown>;
    const id = positiveId(p.id);
    if (id != null) {
      pin = {
        id,
        name: typeof p.name === "string" ? p.name : null,
        plot_id: positiveId(p.plot_id),
      };
    }
  }

  const jobRaw = row.job;
  let job: QrCodeAssignedJobRef | null = null;
  if (jobRaw && typeof jobRaw === "object") {
    const j = jobRaw as Record<string, unknown>;
    const id = positiveId(j.id);
    if (id != null) {
      job = {
        id,
        title: typeof j.title === "string" ? j.title : null,
        name: typeof j.name === "string" ? j.name : null,
        job_serial_number: typeof j.job_serial_number === "string" ? j.job_serial_number : null,
        status: typeof j.status === "string" ? j.status : null,
      };
    }
  } else {
    // Legacy: assigned_to_detail was the job object itself.
    const legacyJobId = positiveId(row.id);
    if (legacyJobId != null && !("pin" in row)) {
      job = {
        id: legacyJobId,
        title: typeof row.title === "string" ? row.title : null,
        name: typeof row.name === "string" ? row.name : null,
        job_serial_number: typeof row.job_serial_number === "string" ? row.job_serial_number : null,
        status: typeof row.status === "string" ? row.status : null,
      };
    }
  }

  if (!pin && !job) return null;
  return { pin, job };
}

/** Job id from assignment detail (never use assigned_to_id — that is the pin id). */
export function getQrAssignedJobId(row: QrCode): number | null {
  return positiveId(row.assigned_to_detail?.job?.id);
}

/** Pin id from assignment detail, falling back to assigned_to_id. */
export function getQrAssignedPinId(row: QrCode): number | null {
  const fromDetail = positiveId(row.assigned_to_detail?.pin?.id);
  if (fromDetail != null) return fromDetail;
  return positiveId(row.assigned_to_id);
}

/** Deep-link to the pin details page inside the assigned job. */
export function getQrAssignedPinHref(row: QrCode): string | null {
  const jobId = getQrAssignedJobId(row);
  const pinId = getQrAssignedPinId(row);
  if (jobId == null || pinId == null) return null;
  return routes.dashboard.jobPinDetail(jobId, pinId);
}

export function qrAssignedLabel(row: QrCode): string {
  const job = row.assigned_to_detail?.job;
  if (job) {
    const title = job.title?.trim() || job.name?.trim() || job.job_serial_number?.trim();
    if (title) return title;
    if (job.id > 0) return `#${job.id}`;
  }
  const pinId = getQrAssignedPinId(row);
  return pinId != null ? `Pin #${pinId}` : "—";
}
