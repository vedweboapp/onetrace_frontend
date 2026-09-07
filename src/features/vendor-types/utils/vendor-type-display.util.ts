import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export function normalizeVendorTypeHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.slice(0, 7).toLowerCase();
}

export function formatVendorTypeLabel(row: Pick<VendorType, "id" | "name">): string {
  const label = row.name?.trim();
  return label || `Type #${row.id}`;
}

export function vendorTypeBgHex(
  row: Pick<VendorType, "bg_color"> & { bg_colour?: string | null },
): string {
  return normalizeVendorTypeHex(row.bg_color ?? row.bg_colour, DEFAULT_BG);
}

export function vendorTypeTextHex(
  row: Pick<VendorType, "text_color"> & { text_colour?: string | null },
): string {
  return normalizeVendorTypeHex(row.text_color ?? row.text_colour, DEFAULT_TEXT);
}
