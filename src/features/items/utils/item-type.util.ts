import type { Item, ItemType } from "@/features/items/types/item.types";

export function resolveItemType(raw: unknown): ItemType {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return v === "service" ? "service" : "goods";
}

export function getItemType(item: Pick<Item, "item_type"> | null | undefined): ItemType {
  return resolveItemType(item?.item_type);
}

export function isServiceItem(item: Pick<Item, "item_type"> | null | undefined): boolean {
  return getItemType(item) === "service";
}

/** Auto SKU for service items when the form omits SKU. */
export function generateServiceItemSku(name?: string): string {
  const slug = String(name ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "")
    .slice(0, 8);
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `SVC-${slug || "ITEM"}-${suffix}`;
}
