import type { Item, ItemVendorRef } from "@/features/items/types/item.types";

function pushVendorId(ids: number[], seen: Set<number>, raw: unknown) {
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
  seen.add(id);
  ids.push(id);
}

function nestedVendorEntries(
  item: Pick<Item, "vendor_ids" | "vendors" | "vendor_details"> | null | undefined,
): Array<number | ItemVendorRef> {
  if (!item) return [];
  if (Array.isArray(item.vendor_details) && item.vendor_details.length > 0) {
    return item.vendor_details;
  }
  if (Array.isArray(item.vendors) && item.vendors.length > 0) {
    return item.vendors;
  }
  return [];
}

/** Resolve vendor ids from `vendor_details`, `vendors`, and/or `vendor_ids`. */
export function getItemVendorIds(
  item: Pick<Item, "vendor_ids" | "vendors" | "vendor_details"> | null | undefined,
): number[] {
  if (!item) return [];
  const ids: number[] = [];
  const seen = new Set<number>();

  for (const entry of nestedVendorEntries(item)) {
    if (typeof entry === "number") {
      pushVendorId(ids, seen, entry);
      continue;
    }
    if (entry && typeof entry === "object" && typeof entry.id === "number") {
      pushVendorId(ids, seen, entry.id);
    }
  }

  if (ids.length > 0) return ids;

  if (Array.isArray(item.vendor_ids)) {
    for (const entry of item.vendor_ids) pushVendorId(ids, seen, entry);
  }

  return ids;
}

/** Display rows for item vendors (prefer `vendor_details` / `vendors`, fall back to id map). */
export function itemVendorRows(
  item: Pick<Item, "vendor_ids" | "vendors" | "vendor_details"> | null | undefined,
  labelById: Record<number, string> = {},
): { id: number; label: string }[] {
  const fromNested: { id: number; label: string }[] = [];
  const seen = new Set<number>();

  for (const entry of nestedVendorEntries(item)) {
    if (typeof entry === "number") {
      if (seen.has(entry)) continue;
      seen.add(entry);
      fromNested.push({ id: entry, label: labelById[entry]?.trim() || `#${entry}` });
      continue;
    }
    if (entry && typeof entry === "object" && typeof entry.id === "number") {
      if (seen.has(entry.id)) continue;
      seen.add(entry.id);
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      fromNested.push({
        id: entry.id,
        label: name || labelById[entry.id]?.trim() || `#${entry.id}`,
      });
    }
  }

  if (fromNested.length > 0) return fromNested;

  return getItemVendorIds(item).map((id) => ({
    id,
    label: labelById[id]?.trim() || `#${id}`,
  }));
}

/** Name map for MultiCheckSelect fallback labels from nested vendor refs. */
export function itemVendorFallbackLabels(
  item: Pick<Item, "vendors" | "vendor_details"> | null | undefined,
): Record<string, string> {
  const fallback: Record<string, string> = {};
  for (const entry of nestedVendorEntries(item)) {
    if (entry && typeof entry === "object" && typeof entry.id === "number") {
      const name = typeof entry.name === "string" ? entry.name.trim() : "";
      if (name) fallback[String(entry.id)] = name;
    }
  }
  return fallback;
}

export function vendorIdsPayload(values: string[]): { vendor_ids: number[] } {
  const vendor_ids = values
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  return { vendor_ids };
}

export type { ItemVendorRef };
