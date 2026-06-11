import type { Vendor, VendorAddress, VendorTypeRef } from "@/features/vendors/types/vendor.types";

export function getVendorTypeRow(vendor: Pick<Vendor, "type">): VendorTypeRef | null {
  const t = vendor.type;
  if (t && typeof t === "object" && typeof t.id === "number") return t;
  return null;
}

export function getVendorTypeId(vendor: Pick<Vendor, "type">): number | null {
  const t = vendor.type;
  if (typeof t === "number" && t > 0) return t;
  if (t && typeof t === "object" && typeof t.id === "number") return t.id;
  return null;
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
