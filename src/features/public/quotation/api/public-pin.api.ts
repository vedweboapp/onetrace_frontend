import api from "@/core/api/axios";
import type {
  QuotationScopePinDetailPayload,
  QuotationScopePinDetailRow,
} from "../../../quotations/utils/quotation-composite-scope-pins.util";
import type { DrawingPin, DrawingPlot, DrawingPinAttachment } from "@/features/projects/types/drawing.types";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";

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

function parsePinObject(pObj: Record<string, unknown>): DrawingPin {
  const id = parseNumber(pObj.id ?? pObj.pin_id ?? 0);
  const x = parseNumber(pObj.x_coordinate ?? pObj.x ?? 0);
  const y = parseNumber(pObj.y_coordinate ?? pObj.y ?? 0);
  const location = parseString(pObj.location ?? pObj.loc) ?? (id > 0 ? String(id) : "1");
  const quantity = Math.max(1, parseNumber(pObj.quantity ?? pObj.qty ?? 1));
  const variation = Boolean(pObj.variation);
  const description = parseString(pObj.description) ?? "";
  const itemDetail = isObject(pObj.item_detail) ? (pObj.item_detail as Record<string, unknown>) : null;
  const groupDetail = isObject(pObj.group_detail) ? (pObj.group_detail as Record<string, unknown>) : null;
  const statusDetail = isObject(pObj.status_detail) ? (pObj.status_detail as Record<string, unknown>) : null;
  const rawAttachments = Array.isArray(pObj.attachments) ? pObj.attachments : [];

  const attachments: DrawingPinAttachment[] = rawAttachments.map((att: any, idx: number) => {
    if (!isObject(att)) return {};
    return {
      id: parseNumber(att.id ?? idx),
      file_name: parseString(att.file_name ?? att.name),
      name: parseString(att.file_name ?? att.name),
      file_url: parseString(att.file ?? att.url ?? att.file_url),
      url: parseString(att.file ?? att.url ?? att.file_url),
      content_type: parseString(att.content_type_value ?? att.content_type),
    };
  });

  const parsedItemDetail = itemDetail
    ? {
        id: parseNumber(itemDetail.id),
        name: parseString(itemDetail.name) ?? "Item",
        sku: parseString(itemDetail.sku) ?? "",
        is_composite: Boolean(itemDetail.is_composite),
        installation_type: itemDetail.installation_type,
        selling_price: itemDetail.selling_price,
        attachments: Array.isArray(itemDetail.attachments)
          ? itemDetail.attachments.map((att: any, idx: number) => ({
              id: parseNumber(att?.id ?? idx),
              file_name: parseString(att?.file_name ?? att?.name),
              name: parseString(att?.file_name ?? att?.name),
              file: parseString(att?.file ?? att?.url ?? att?.file_url),
              url: parseString(att?.file ?? att?.url ?? att?.file_url),
              file_url: parseString(att?.file ?? att?.url ?? att?.file_url),
            }))
          : [],
        components: Array.isArray(itemDetail.components) ? itemDetail.components : [],
      }
    : null;

  const parsedStatusDetail = statusDetail
    ? {
        id: parseNumber(statusDetail.id),
        status_name: parseString(statusDetail.status_name) ?? "To Do",
        bg_colour: parseString(statusDetail.bg_colour) ?? "#E5E7EB",
        text_colour: parseString(statusDetail.text_colour) ?? "#111827",
      }
    : null;

  return {
    id,
    x_coordinate: x,
    y_coordinate: y,
    location,
    quantity,
    variation,
    description,
    item: parseNumber(pObj.item ?? parsedItemDetail?.id),
    item_detail: parsedItemDetail as any,
    group_detail: groupDetail,
    status: parseNumber(pObj.status ?? parsedStatusDetail?.id),
    status_detail: parsedStatusDetail,
    attachments,
  };
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

  const levelDetail = isObject(payload.level_detail) ? (payload.level_detail as Record<string, unknown>) : null;

  const drawingFile =
    parseString(
      levelDetail?.drawing_file ??
        levelDetail?.file ??
        levelDetail?.file_url ??
        payload.drawing_file ??
        payload.drawingFile ??
        payload.file_url ??
        payload.fileUrl ??
        payload.drawing_url ??
        payload.drawingUrl,
    ) ?? undefined;

  const drawingFileType =
    parseString(
      levelDetail?.drawing_file_type ??
        levelDetail?.file_type ??
        payload.drawing_file_type ??
        payload.drawingFileType ??
        payload.file_type ??
        payload.fileType ??
        payload.content_type ??
        payload.contentType,
    ) ?? undefined;

  const drawingName =
    parseString(
      levelDetail?.name ??
        levelDetail?.title ??
        payload.title ??
        payload.name ??
        payload.drawing_name,
    ) ?? `Pin #${pinId} Preview`;

  const rawPlots = Array.isArray(levelDetail?.plots)
    ? levelDetail!.plots
    : Array.isArray(payload.plots)
    ? payload.plots
    : [];

  const plots: DrawingPlot[] = rawPlots.map((plotObj: any) => {
    const plotId = parseNumber(plotObj.id ?? 0);
    const plotName = parseString(plotObj.name ?? plotObj.label) ?? "Plot";
    const rawCoords = Array.isArray(plotObj.coordinates) ? plotObj.coordinates : [];
    const coordinates = rawCoords
      .map((c: any) => (Array.isArray(c) ? [parseNumber(c[0]), parseNumber(c[1])] : []))
      .filter((c: number[]) => c.length === 2);
    const rawPins = Array.isArray(plotObj.pins) ? plotObj.pins : [];
    const pins: DrawingPin[] = rawPins.map((pObj: any) => parsePinObject(pObj));

    return {
      id: plotId,
      name: plotName,
      coordinates,
      plot_border: plotObj.plot_border,
      plot_bg: plotObj.plot_bg,
      pins,
    };
  });

  let selectedPin: DrawingPin | null = plots.flatMap((p) => p.pins).find((p) => p.id === pinId) ?? null;

  if (!selectedPin && (payload.id || payload.pin_id)) {
    selectedPin = parsePinObject(payload);
  }

  if (plots.length === 0 && selectedPin) {
    plots.push({
      id: 1,
      name: parseString(payload.plot_label ?? payload.plot_name) ?? "Plot",
      coordinates: [],
      pins: [selectedPin],
    });
  }

  const rows = resolveRowArray(payload, pinId);
  const sectionLabel =
    parseString(levelDetail?.name ?? payload.section_label ?? payload.section_name ?? payload.section ?? payload.level) ?? undefined;
  const plotLabel =
    parseString(payload.plot_label ?? payload.plot_name ?? payload.plot ?? payload.location ?? payload.status_name) ?? undefined;

  // Extract quotation ID — try every plausible field path/name.
  function resolveQuotationId(raw: Record<string, unknown>): number | null {
    const candidates = [
      raw.quotation_id,
      raw.quotation,
      raw.quote_id,
      raw.quote,
      (levelDetail as Record<string, unknown> | null)?.quotation_id,
      (levelDetail as Record<string, unknown> | null)?.quotation,
      (levelDetail as Record<string, unknown> | null)?.quote_id,
    ];
    for (const c of candidates) {
      if (typeof c === "number" && Number.isFinite(c) && c > 0) return c;
      if (typeof c === "string") {
        const n = Number(c.trim());
        if (Number.isFinite(n) && n > 0) return n;
      }
      // Support nested object: { id: 1, ... }
      if (isObject(c) && typeof (c as any).id === "number" && (c as any).id > 0) return (c as any).id;
    }
    return null;
  }
  const quotationId = resolveQuotationId(payload);

  // Dev-mode: log raw payload keys to help identify correct field name.
  if (process.env.NODE_ENV !== "production") {
    console.debug("[PublicPin] raw payload keys:", Object.keys(payload));
    if (levelDetail) console.debug("[PublicPin] levelDetail keys:", Object.keys(levelDetail));
    console.debug("[PublicPin] resolved quotationId:", quotationId);
  }

  return {
    title: drawingName,
    sectionLabel,
    plotLabel,
    drawingFile,
    drawingFileType,
    rows,
    selectedPin,
    plots,
    drawingName,
    quotationId,
  };
}

export async function fetchPublicQuotationByToken(token: string): Promise<QuotationDetail> {
  const response = await api.get<unknown>(`public/quotations/${token}/`);
  const data = unwrapApiData(response.data);
  return data as QuotationDetail;
}

export type PublicQuotationResponsePayload = {
  status: "approved" | "rejected" | "questioned";
  comment?: string;
  signature?: File | Blob | string | null;
};

export function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? "image/png";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

export async function submitPublicQuotationResponse(
  token: string,
  payload: PublicQuotationResponsePayload,
): Promise<void> {
  const formData = new FormData();
  formData.append("status", payload.status);

  if (payload.comment?.trim()) {
    formData.append("comment", payload.comment.trim());
  }

  if (payload.signature) {
    if (payload.signature instanceof File || payload.signature instanceof Blob) {
      formData.append("signature", payload.signature, "signature.png");
    } else if (typeof payload.signature === "string" && payload.signature.startsWith("data:")) {
      const blob = dataURLtoBlob(payload.signature);
      formData.append("signature", blob, "signature.png");
    } else if (typeof payload.signature === "string" && payload.signature.trim()) {
      formData.append("signature", payload.signature.trim());
    }
  }

  await api.post(`public/quotations/${token}/`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}
