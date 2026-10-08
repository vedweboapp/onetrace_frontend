/** Normalize approved-vendor / approved-quotation API payloads for the PO form. */

export type ApprovedVendorOption = {
  id: number;
  name: string;
};

export type ApprovedQuotationItemOption = {
  id: number;
  name: string;
  rate: number | null;
  groupId: number | null;
  groupName: string;
  quantity: number | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asTrimmed(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value !== "string") return "";
  return value.trim();
}

function asPositiveId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number.parseInt(value.trim(), 10);
    return n > 0 ? n : null;
  }
  const nested = asRecord(value);
  if (nested && "id" in nested) return asPositiveId(nested.id);
  return null;
}

function asMoney(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseFloat(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  if (!root) return [];
  const data = root.data;
  if (Array.isArray(data)) return data;
  const nested = asRecord(data);
  for (const key of [
    "results",
    "vendors",
    "vendor_quotations",
    "approved_vendor_quotations",
    "quotations",
    "approved_quotations",
    "items",
    "vendor_items",
  ]) {
    const list = nested?.[key] ?? root[key];
    if (Array.isArray(list)) return list;
  }
  return [];
}

function vendorFromRow(row: unknown): ApprovedVendorOption | null {
  const rec = asRecord(row);
  if (!rec) return null;

  const nestedVendor = asRecord(rec.vendor);
  const id =
    asPositiveId(nestedVendor) ??
    asPositiveId(rec.vendor_id) ??
    asPositiveId(rec.vendor) ??
    asPositiveId(rec.id);
  if (id == null) return null;

  const name =
    asTrimmed(nestedVendor?.name) ||
    asTrimmed(rec.vendor_name) ||
    asTrimmed(rec.name) ||
    `Vendor #${id}`;

  return { id, name };
}

/** Unique vendors from GET project/{id}/approved-vendor-quotations/ */
export function parseApprovedVendorQuotations(raw: unknown): ApprovedVendorOption[] {
  const seen = new Set<number>();
  const out: ApprovedVendorOption[] = [];
  for (const row of unwrapList(raw)) {
    const vendor = vendorFromRow(row);
    if (!vendor || seen.has(vendor.id)) continue;
    seen.add(vendor.id);
    out.push(vendor);
  }
  return out;
}

function itemIdFromRow(rec: Record<string, unknown>): number | null {
  return (
    asPositiveId(rec.composite_item_id) ??
    asPositiveId(rec.composite_item) ??
    asPositiveId(rec.composite_items) ??
    asPositiveId(rec.composite_itmes) ??
    asPositiveId(asRecord(rec.item)?.id) ??
    asPositiveId(rec.item_id) ??
    asPositiveId(rec.item) ??
    asPositiveId(rec.id)
  );
}

function itemNameFromRow(rec: Record<string, unknown>, fallbackId: number): string {
  const nestedItem = asRecord(rec.item);
  return (
    asTrimmed(rec.item_name) ||
    asTrimmed(rec.name) ||
    asTrimmed(rec.composite_item_name) ||
    asTrimmed(nestedItem?.name) ||
    asTrimmed(nestedItem?.sku) ||
    `#${fallbackId}`
  );
}

function groupFromRow(rec: Record<string, unknown>): { id: number | null; name: string } {
  const nestedGroup = asRecord(rec.group);
  const nestedItem = asRecord(rec.item);
  const id =
    asPositiveId(nestedGroup) ??
    asPositiveId(rec.group_id) ??
    asPositiveId(rec.group) ??
    asPositiveId(nestedItem?.group) ??
    null;
  const name =
    asTrimmed(nestedGroup?.name) ||
    asTrimmed(rec.group_name) ||
    asTrimmed(nestedItem?.group_name) ||
    "";
  return { id, name };
}

function rateFromRow(rec: Record<string, unknown>): number | null {
  const nestedItem = asRecord(rec.item);
  return (
    asMoney(rec.unit_price) ??
    asMoney(rec.selling_price) ??
    asMoney(rec.rate) ??
    asMoney(rec.cost_price) ??
    asMoney(nestedItem?.selling_price) ??
    asMoney(nestedItem?.cost_price)
  );
}

function quantityFromRow(rec: Record<string, unknown>): number | null {
  const qty = asMoney(rec.quantity);
  return qty != null && qty > 0 ? qty : null;
}

function pushItem(
  out: ApprovedQuotationItemOption[],
  seen: Set<number>,
  row: unknown,
): void {
  const rec = asRecord(row);
  if (!rec) return;
  const id = itemIdFromRow(rec);
  if (id == null || seen.has(id)) return;
  const group = groupFromRow(rec);
  seen.add(id);
  out.push({
    id,
    name: itemNameFromRow(rec, id),
    rate: rateFromRow(rec),
    groupId: group.id,
    groupName: group.name,
    quantity: quantityFromRow(rec),
  });
}

/**
 * Flatten items from GET vendors/{id}/approved-quotations/
 * (quotations with nested items, or a flat item list).
 */
export function parseVendorApprovedQuotations(raw: unknown): ApprovedQuotationItemOption[] {
  const seen = new Set<number>();
  const out: ApprovedQuotationItemOption[] = [];

  for (const row of unwrapList(raw)) {
    const rec = asRecord(row);
    if (!rec) continue;

    const nestedItems =
      (Array.isArray(rec.vendor_items) && rec.vendor_items) ||
      (Array.isArray(rec.items) && rec.items) ||
      (Array.isArray(rec.approved_items) && rec.approved_items) ||
      (Array.isArray(rec.line_items) && rec.line_items) ||
      null;

    if (nestedItems) {
      for (const item of nestedItems) pushItem(out, seen, item);
      continue;
    }

    pushItem(out, seen, row);
  }

  return out;
}
