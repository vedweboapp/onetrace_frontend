import type { QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import { draftPinTotal } from "@/features/quotations/utils/quotation-draft-compute.util";

export type AggregatedDraftCompositeLine = {
  key: string;
  compositeItemId: number | null;
  displayName: string;
  /** Drawing pins placed (shown as ×N). */
  repeatCount: number;
  /** Sum of line quantities (Pins.quantity). */
  totalQty: number;
  unitPrice: number;
  lineTotal: number;
  /** Indices into the source `pins` array (for duplicate / remove). */
  lineIndices: number[];
};

function lineCatalogQty(line: QuotationDraftLine): number {
  const q = line.quantity;
  return typeof q === "number" && Number.isFinite(q) && q >= 0 ? q : 0;
}

/** Strip duplicate suffixes so copies aggregate and display as the same composite. */
export function normalizeCompositeDisplayName(name: string): string {
  const trimmed = name.trim();
  const withoutSuffix = trimmed
    .replace(/\s*\(copy(?:\s*\d+)?\)\s*$/i, "")
    .replace(/\s+copy\s*\d+\s*$/i, "")
    .trim();
  return withoutSuffix || trimmed;
}

function aggregateKey(line: QuotationDraftLine): string {
  if (line.composite_item_id != null && line.composite_item_id > 0) {
    return `id:${line.composite_item_id}`;
  }
  return `name:${normalizeCompositeDisplayName(line.name).toLowerCase()}`;
}

/** Drawing pins represented by this draft line (not catalog stock quantity). */
export function draftCompositePinCount(line: QuotationDraftLine): number {
  if (typeof line.pin_count === "number" && Number.isFinite(line.pin_count) && line.pin_count > 0) {
    return Math.round(line.pin_count);
  }
  return 1;
}

/** One row per composite item; repeatCount is how many drawing pins (not line quantity). */
export function aggregateDraftCompositeLines(pins: QuotationDraftLine[]): AggregatedDraftCompositeLine[] {
  const order: string[] = [];
  const map = new Map<string, AggregatedDraftCompositeLine>();

  pins.forEach((line, index) => {
    const key = aggregateKey(line);
    const prev = map.get(key);
    const pinCount = draftCompositePinCount(line);
    const lineTotal = draftPinTotal(line);
    const catalogQty = lineCatalogQty(line);
    if (prev) {
      prev.repeatCount += pinCount;
      prev.totalQty += catalogQty;
      prev.lineTotal += lineTotal;
      prev.lineIndices.push(index);
    } else {
      order.push(key);
      map.set(key, {
        key,
        compositeItemId: line.composite_item_id,
        displayName: normalizeCompositeDisplayName(line.name),
        repeatCount: pinCount,
        totalQty: catalogQty,
        unitPrice: Number.isFinite(line.selling_price) ? line.selling_price : 0,
        lineTotal,
        lineIndices: [index],
      });
    }
  });

  return order.map((k) => {
    const row = map.get(k)!;
    row.unitPrice = row.totalQty > 0 ? row.lineTotal / row.totalQty : row.unitPrice;
    return row;
  });
}
