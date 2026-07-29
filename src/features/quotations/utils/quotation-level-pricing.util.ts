import type {
  ProjectLevelForQuotation,
  QuotationPlotPin,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";

export type AggregatedCompositeLine = {
  key: string;
  displayName: string;
  /** Number of drawing pins placed for this composite on the plot. */
  pinCount: number;
  /** Sum of per-pin quantities (used for line pricing only). */
  totalQty: number;
  unitPrice: number;
  lineTotal: number;
  /** First pin’s composite item id in this aggregate (for quote draft lines). */
  compositeItemId: number | null;
  sourcePins: QuotationQuoteSectionSourcePin[];
};

function projectFormDetails(
  raw: QuotationPlotPin["project_form"],
): { project_form_id: number | null; project_form_name: string | null; submission_id: number | null; submission_status: string | null } {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return {
      project_form_id: raw,
      project_form_name: null,
      submission_id: null,
      submission_status: null,
    };
  }
  const row = raw && typeof raw === "object" ? raw : null;
  return {
    project_form_id: typeof row?.id === "number" && row.id > 0 ? row.id : null,
    project_form_name: typeof row?.name === "string" && row.name.trim() ? row.name.trim() : null,
    submission_id: typeof row?.submission_id === "number" && row.submission_id > 0 ? row.submission_id : null,
    submission_status:
      typeof row?.submission_status === "string" && row.submission_status.trim()
        ? row.submission_status.trim()
        : null,
  };
}

function sourcePinFromPlotPin(pin: QuotationPlotPin): QuotationQuoteSectionSourcePin {
  const itemIdRaw = pin.item_detail?.id;
  const composite_item_id =
    typeof itemIdRaw === "number" && Number.isFinite(itemIdRaw) && itemIdRaw > 0 ? itemIdRaw : null;
  const projectForm = projectFormDetails(pin.project_form);
  return {
    pin_id: typeof pin.id === "number" && Number.isFinite(pin.id) && pin.id > 0 ? pin.id : null,
    x_coordinate: typeof pin.x_coordinate === "number" && Number.isFinite(pin.x_coordinate) ? pin.x_coordinate : null,
    y_coordinate: typeof pin.y_coordinate === "number" && Number.isFinite(pin.y_coordinate) ? pin.y_coordinate : null,
    status: typeof pin.status === "number" && Number.isFinite(pin.status) ? pin.status : null,
    status_id: typeof pin.status_id === "number" && Number.isFinite(pin.status_id) ? pin.status_id : null,
    status_name:
      typeof pin.status_detail?.status_name === "string" && pin.status_detail.status_name.trim()
        ? pin.status_detail.status_name.trim()
        : typeof pin.status_name === "string" && pin.status_name.trim()
          ? pin.status_name.trim()
          : null,
    quantity: pin.quantity ?? null,
    composite_item_id,
    name: pinDisplayName(pin),
    description: typeof pin.description === "string" && pin.description.trim() ? pin.description.trim() : null,
    location: pin.location ?? null,
    ...projectForm,
  };
}

export function parseMoneyValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatMoneyDisplay(amount: number, locale: string): string {
  if (!Number.isFinite(amount)) return "—";
  return new Intl.NumberFormat(locale === "es" ? "es" : "en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function pinDisplayName(pin: QuotationPlotPin): string {
  const detail = pin.item_detail;
  const fromDetail = typeof detail?.name === "string" ? detail.name.trim() : "";
  if (fromDetail) return fromDetail;
  const c1 = typeof pin.composite_item_name === "string" ? pin.composite_item_name.trim() : "";
  if (c1) return c1;
  const c2 = typeof pin.composite_name === "string" ? pin.composite_name.trim() : "";
  if (c2) return c2;
  const n = typeof pin.name === "string" ? pin.name.trim() : "";
  if (n) return n;
  if (detail?.id != null) return `#${detail.id}`;
  return `Pin ${pin.id}`;
}

function pinUnitPrice(pin: QuotationPlotPin): number {
  const detail = pin.item_detail;
  const fromDetail = parseMoneyValue(detail?.selling_price ?? detail?.cost_price);
  if (fromDetail > 0) return fromDetail;
  return parseMoneyValue(pin.selling_price ?? pin.price ?? pin.amount);
}

function pinQty(pin: QuotationPlotPin): number {
  const q = pin.quantity;
  if (typeof q === "number" && Number.isFinite(q) && q > 0) return q;
  return 1;
}

/** One row per composite item: pinCount = drawing pins placed; totalQty sums pin quantities for pricing. */
export function aggregateCompositeLinesForPlot(plot: { pins?: QuotationPlotPin[] }): AggregatedCompositeLine[] {
  const pins = Array.isArray(plot.pins) ? plot.pins : [];
  const map = new Map<string, AggregatedCompositeLine>();
  for (const pin of pins) {
    const displayName = pinDisplayName(pin);
    const key = displayName.toLowerCase();
    const unit = pinUnitPrice(pin);
    const qty = pinQty(pin);
    const line = unit * qty;
    const itemIdRaw = pin.item_detail?.id;
    const compositeItemId =
      typeof itemIdRaw === "number" && Number.isFinite(itemIdRaw) && itemIdRaw > 0 ? itemIdRaw : null;
    const prev = map.get(key);
    if (prev) {
      prev.pinCount += 1;
      prev.totalQty += qty;
      prev.lineTotal += line;
      prev.unitPrice = prev.totalQty > 0 ? prev.lineTotal / prev.totalQty : prev.unitPrice;
      if (prev.compositeItemId == null && compositeItemId != null) prev.compositeItemId = compositeItemId;
      prev.sourcePins.push(sourcePinFromPlotPin(pin));
    } else {
      map.set(key, {
        key,
        displayName,
        pinCount: 1,
        totalQty: qty,
        unitPrice: unit,
        lineTotal: line,
        compositeItemId,
        sourcePins: [sourcePinFromPlotPin(pin)],
      });
    }
  }
  return Array.from(map.values());
}

export function plotCompositeTotal(plot: { pins?: QuotationPlotPin[] }): number {
  return aggregateCompositeLinesForPlot(plot).reduce((a, r) => a + r.lineTotal, 0);
}

export function levelCompositeTotal(level: ProjectLevelForQuotation): number {
  const plots = Array.isArray(level.plots) ? level.plots : [];
  return plots.reduce((acc, p) => acc + plotCompositeTotal(p), 0);
}

export function setLevelMembershipOrdered(
  sortedRows: ProjectLevelForQuotation[],
  currentIds: number[],
  levelId: number,
  include: boolean,
): number[] {
  const set = new Set(currentIds);
  if (include) set.add(levelId);
  else set.delete(levelId);
  return sortedRows.map((r) => r.id).filter((id) => set.has(id));
}

export function isLevelIncluded(selectAllLevels: boolean, levelIds: number[], levelId: number): boolean {
  return selectAllLevels || levelIds.includes(levelId);
}
