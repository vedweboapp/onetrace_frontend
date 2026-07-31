import api from "@/core/api/axios";
import type {
  QuotationScopePinDetailPayload,
  QuotationScopePinDetailRow,
} from "../../../quotations/utils/quotation-composite-scope-pins.util";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function parseString(value: unknown): string | null {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
}

function unwrapApiData(raw: unknown): unknown {
  if (isObject(raw) && typeof raw.success === "boolean" && raw.success === true && "data" in raw) {
    return (raw as Record<string, unknown>).data;
  }
  return raw;
}

function buildRow(raw: Record<string, unknown>, index: number, defaultPinId: number | null): QuotationScopePinDetailRow {
  const pinIdValue = raw.pin_id ?? raw.id ?? defaultPinId;
  const pinId =
    typeof pinIdValue === "number" && Number.isFinite(pinIdValue)
      ? pinIdValue
      : parseString(pinIdValue) && Number.isFinite(Number(pinIdValue))
      ? Number(pinIdValue)
      : defaultPinId;
  const quantity = Math.max(0, parseNumber(raw.quantity ?? raw.qty ?? raw.count ?? 1));
  const sellingPrice = parseNumber(
    raw.selling_price ?? raw.price ?? raw.amount ?? raw.unit_price ?? raw.unitPrice ?? 0,
  );
  const pinsTotal = parseNumber(raw.pins_total ?? raw.total ?? raw.amount ?? quantity * sellingPrice);
  const name =
    parseString(raw.name ?? raw.label ?? raw.item_name ?? raw.description) ??
    (pinId != null ? `Pin #${pinId}` : `Pin ${index + 1}`);
  const pinsOrder =
    Number.isFinite(parseNumber(raw.pins_order ?? raw.order))
      ? parseNumber(raw.pins_order ?? raw.order)
      : index + 1;

  const xRaw = raw.x_coordinate ?? raw.x;
  const x_coordinate =
    typeof xRaw === "number" && Number.isFinite(xRaw)
      ? xRaw
      : typeof xRaw === "string" && xRaw.trim().length > 0 && Number.isFinite(Number(xRaw))
      ? Number(xRaw)
      : null;
  const yRaw = raw.y_coordinate ?? raw.y;
  const y_coordinate =
    typeof yRaw === "number" && Number.isFinite(yRaw)
      ? yRaw
      : typeof yRaw === "string" && yRaw.trim().length > 0 && Number.isFinite(Number(yRaw))
      ? Number(yRaw)
      : null;

  return {
    pin_id: pinId,
    name,
    quantity,
    pins_order: pinsOrder,
    pins_total: pinsTotal,
    selling_price: sellingPrice,
    x_coordinate,
    y_coordinate,
  };
}

function resolveRowArray(raw: unknown, defaultPinId: number | null): QuotationScopePinDetailRow[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (isObject(item)) return buildRow(item, index, defaultPinId);
      return buildRow({}, index, defaultPinId);
    });
  }

  if (!isObject(raw)) {
    return [buildRow({}, 0, defaultPinId)];
  }

  const candidates = [
    raw.rows,
    raw.items,
    raw.pin_items,
    raw.pin_details,
    raw.details,
    raw.source_pins,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return candidate.map((item, index) => {
        if (isObject(item)) return buildRow(item, index, defaultPinId);
        return buildRow({}, index, defaultPinId);
      });
    }
  }

  return [buildRow(raw, 0, defaultPinId)];
}

export async function fetchPublicPinDetails(pinId: number): Promise<QuotationScopePinDetailPayload> {
  const response = await api.get<unknown>(`public/pin/${pinId}`);
  const data = unwrapApiData(response.data);
  const payload = isObject(data) ? data : {};
  const rows = resolveRowArray(payload, pinId);
  const title =
    parseString(payload.title ?? payload.name ?? payload.label ?? payload.item_name) ??
    (pinId != null ? `Pin #${pinId}` : "");
  const sectionLabel =
    parseString(payload.section_label ?? payload.section_name ?? payload.section ?? payload.level) ?? undefined;
  const plotLabel =
    parseString(payload.plot_label ?? payload.plot_name ?? payload.plot ?? payload.location ?? payload.status_name) ?? undefined;
  const drawingFile =
    parseString(
      payload.drawing_file ??
        payload.drawingFile ??
        payload.file_url ??
        payload.fileUrl ??
        payload.drawing_url ??
        payload.drawingUrl,
    ) ?? undefined;
  const drawingFileType =
    parseString(
      payload.drawing_file_type ??
        payload.drawingFileType ??
        payload.file_type ??
        payload.fileType ??
        payload.content_type ??
        payload.contentType,
    ) ?? undefined;

  return {
    title,
    sectionLabel,
    plotLabel,
    drawingFile,
    drawingFileType,
    rows,
  };
}
