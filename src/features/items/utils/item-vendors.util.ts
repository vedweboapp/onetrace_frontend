import type { Item, ItemVendorRef } from "@/features/items/types/item.types";

function pushVendorId(ids: number[], seen: Set<number>, raw: unknown) {
  const id = typeof raw === "number" ? raw : Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(id) || id <= 0 || seen.has(id)) return;
  seen.add(id);
  ids.push(id);
}

/** Resolve vendor ids from `vendor_ids` and/or nested `vendors` on an item. */
export function getItemVendorIds(item: Pick<Item, "vendor_ids" | "vendors"> | null | undefined): number[] {
  if (!item) return [];
  const ids: number[] = [];
  const seen = new Set<number>();

  if (Array.isArray(item.vendor_ids)) {
    for (const entry of item.vendor_ids) pushVendorId(ids, seen, entry);
  }

  if (Array.isArray(item.vendors)) {
    for (const entry of item.vendors) {
      if (typeof entry === "number") {
        pushVendorId(ids, seen, entry);
        continue;
      }
      if (entry && typeof entry === "object" && typeof entry.id === "number") {
        pushVendorId(ids, seen, entry.id);
      }
    }
  }

  return ids;
}

/** Display rows for item vendors (prefer nested `vendors`, fall back to id map). */
export function itemVendorRows(
  item: Pick<Item, "vendor_ids" | "vendors"> | null | undefined,
  labelById: Record<number, string> = {},
): { id: number; label: string }[] {
  const fromNested: { id: number; label: string }[] = [];
  const seen = new Set<number>();

  if (Array.isArray(item?.vendors)) {
    for (const entry of item.vendors) {
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
  }

  if (fromNested.length > 0) return fromNested;

  return getItemVendorIds(item).map((id) => ({
    id,
    label: labelById[id]?.trim() || `#${id}`,
  }));
}

export function vendorIdsPayload(values: string[]): { vendor_ids: number[] } {
  const vendor_ids = values
    .map((raw) => Number.parseInt(raw, 10))
    .filter((id) => Number.isFinite(id) && id > 0);
  return { vendor_ids };
}

export type { ItemVendorRef };
