import { ApiBusinessError } from "@/core/errors/api-business-error";
import type {
  PublicQrJob,
  PublicQrLookupResult,
  PublicQrPin,
  PublicQrPinGroupRef,
  PublicQrPinItemRef,
  PublicQrPinStatusRef,
} from "@/features/public/qr-code/types/public-qr.types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveId(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}

function asString(raw: unknown): string | null {
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function unwrapEnvelope(raw: unknown): unknown {
  if (isObject(raw) && raw.success === true && "data" in raw) {
    return raw.data;
  }
  return raw;
}

function parsePinItem(raw: unknown): PublicQrPinItemRef | null {
  if (!isObject(raw)) return null;
  const id = positiveId(raw.id);
  const name = asString(raw.name);
  const sku = asString(raw.sku);
  if (id == null && !name && !sku) return null;
  return { id: id ?? undefined, name, sku };
}

function parsePinGroup(raw: unknown): PublicQrPinGroupRef | null {
  if (!isObject(raw)) return null;
  const id = positiveId(raw.id);
  const name = asString(raw.name);
  if (id == null && !name) return null;
  return { id: id ?? undefined, name };
}

function parsePinStatus(raw: unknown): PublicQrPinStatusRef | null {
  if (!isObject(raw)) return null;
  const id = positiveId(raw.id);
  const status_name = asString(raw.status_name);
  if (id == null && !status_name) return null;
  return {
    id: id ?? undefined,
    status_name,
    bg_colour: asString(raw.bg_colour),
    text_colour: asString(raw.text_colour),
  };
}

function parsePin(
  raw: unknown,
  levelMeta: { levelId: number | null; levelName: string | null; plotId: number | null },
): PublicQrPin | null {
  if (!isObject(raw)) return null;
  const id = positiveId(raw.id);
  if (id == null) return null;

  const qrRaw = isObject(raw.qr_code) ? raw.qr_code : null;

  return {
    id,
    job_pin_id: positiveId(raw.job_pin_id),
    location: asString(raw.location),
    description: asString(raw.description),
    quantity: typeof raw.quantity === "number" ? raw.quantity : null,
    x_coordinate: typeof raw.x_coordinate === "number" ? raw.x_coordinate : null,
    y_coordinate: typeof raw.y_coordinate === "number" ? raw.y_coordinate : null,
    qr_code: qrRaw
      ? {
          id: positiveId(qrRaw.id),
          qr_code_id: asString(qrRaw.qr_code_id),
          public_uuid: asString(qrRaw.public_uuid),
          qr_image: asString(qrRaw.qr_image),
        }
      : null,
    item_detail: parsePinItem(raw.item_detail),
    group_detail: parsePinGroup(raw.group_detail),
    status_detail: parsePinStatus(raw.status_detail),
    quality_assurance:
      isObject(raw.quality_assurance) && typeof raw.quality_assurance.status === "string"
        ? (raw.quality_assurance as PublicQrPin["quality_assurance"])
        : null,
    level_id: levelMeta.levelId,
    level_name: levelMeta.levelName,
    plot_id: levelMeta.plotId,
  };
}

/** Flatten pins from `job.levels[].plots[].pins[]`. */
export function collectPublicQrPins(job: PublicQrJob): PublicQrPin[] {
  const levels = Array.isArray(job.levels) ? job.levels : [];
  const pins: PublicQrPin[] = [];
  for (const level of levels) {
    if (!level || typeof level !== "object") continue;
    const levelId = positiveId(level.id);
    const levelName = asString(level.name);
    const plots = Array.isArray(level.plots) ? level.plots : [];
    for (const plot of plots) {
      if (!plot || typeof plot !== "object") continue;
      const plotId = positiveId(plot.id);
      const plotPins = Array.isArray(plot.pins) ? plot.pins : [];
      for (const pinRaw of plotPins) {
        const pin = parsePin(pinRaw, { levelId, levelName, plotId });
        if (pin) pins.push(pin);
      }
    }
  }
  return pins;
}

export function parsePublicQrResponse(raw: unknown): PublicQrLookupResult {
  const unwrapped = unwrapEnvelope(raw);
  const root = isObject(unwrapped) ? unwrapped : isObject(raw) ? raw : null;
  if (!root) {
    throw new ApiBusinessError("Unexpected public QR response");
  }

  if (root.success === false) {
    const msg = typeof root.message === "string" ? root.message : "Request failed";
    throw new ApiBusinessError(msg);
  }

  const jobRaw = root.job;
  if (!isObject(jobRaw) || positiveId(jobRaw.id) == null) {
    throw new ApiBusinessError("No job data for this QR code");
  }

  return { job: jobRaw as PublicQrJob };
}
