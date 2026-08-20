import type { Vendor, VendorAddress, VendorTypeRef, VendorTypeValue } from "@/features/vendors/types/vendor.types";

function vendorTypeRefFromUnknown(raw: unknown): VendorTypeRef | null {
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return { id: raw, name: "", bg_color: "", text_color: "" };
  }
  if (typeof raw === "string" && /^\d+$/.test(raw)) {
    const id = Number.parseInt(raw, 10);
    return id > 0 ? { id, name: "", bg_color: "", text_color: "" } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const id = typeof row.id === "number" ? row.id : typeof row.id === "string" && /^\d+$/.test(row.id) ? Number.parseInt(row.id, 10) : NaN;
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    name: typeof row.name === "string" ? row.name : "",
    bg_color: typeof row.bg_color === "string" ? row.bg_color : typeof row.bg_colour === "string" ? row.bg_colour : "",
    text_color: typeof row.text_color === "string" ? row.text_color : typeof row.text_colour === "string" ? row.text_colour : "",
  };
}

function flattenVendorTypes(raw: VendorTypeValue | unknown): VendorTypeRef[] {
  if (raw == null) return [];
  const list = Array.isArray(raw) ? raw : [raw];
  const out: VendorTypeRef[] = [];
  const seen = new Set<number>();
  for (const item of list) {
    const row = vendorTypeRefFromUnknown(item);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    out.push(row);
  }
  return out;
}

function mergeVendorTypeRow(base: VendorTypeRef, extra?: VendorTypeRef): VendorTypeRef {
  if (!extra) return base;
  return {
    id: base.id,
    name: base.name.trim() || extra.name,
    bg_color: base.bg_color.trim() || extra.bg_color,
    text_color: base.text_color.trim() || extra.text_color,
  };
}

type VendorTypeSource = Pick<Vendor, "type"> & {
  types?: VendorTypeValue;
  vendor_types?: VendorTypeValue;
};

export function getVendorTypeRows(vendor: VendorTypeSource): VendorTypeRef[] {
  const primary = flattenVendorTypes(vendor.type);
  const extraById = new Map(
    [...flattenVendorTypes(vendor.types), ...flattenVendorTypes(vendor.vendor_types)].map((row) => [row.id, row]),
  );
  if (primary.length > 0) {
    return primary.map((row) => mergeVendorTypeRow(row, extraById.get(row.id)));
  }
  return Array.from(extraById.values());
}

export function getVendorTypeIds(vendor: VendorTypeSource): number[] {
  return getVendorTypeRows(vendor).map((row) => row.id);
}

export function getVendorTypeRow(vendor: VendorTypeSource): VendorTypeRef | null {
  return getVendorTypeRows(vendor)[0] ?? null;
}

export function getVendorTypeId(vendor: VendorTypeSource): number | null {
  return getVendorTypeIds(vendor)[0] ?? null;
}

export function vendorPrimaryAddress(vendor: Pick<Vendor, "addresses">): VendorAddress | null {
  const rows = vendor.addresses ?? [];
  if (rows.length === 0) return null;
  return rows.find((a) => a.is_primary) ?? rows[0] ?? null;
}

export function vendorAddressSummary(address: VendorAddress | null | undefined): string {
  if (!address) return "—";
  const parts = [
    address.address_line_1,
    address.city,
    address.state,
    address.country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

export function parseVendorCoord(raw: string | null | undefined): number | null {
  const t = raw?.trim() ?? "";
  if (!t) return null;
  const n = Number.parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
