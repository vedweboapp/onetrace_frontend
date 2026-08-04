import type { DrawingPin } from "@/features/projects/types/drawing.types";

export function groupItemAbbrevKey(groupId: number, itemId: number): string {
  return `${groupId}:${itemId}`;
}

export function initialsFromProductName(name: string): string {
  return name
    .split(/[\s()]+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();
}

function resolvePinMarkerAbbreviationFromGroupDetail(pin: DrawingPin): string | undefined {
  if (!pin.group || !pin.item || !pin.group_detail) return undefined;

  const groupItems = Array.isArray(pin.group_detail.items) ? pin.group_detail.items : [];
  const matchedItem = groupItems.find((entry) => entry?.item === pin.item || entry?.id === pin.item);
  const abbreviation = matchedItem?.abbreviation?.trim();
  return abbreviation ? abbreviation.toUpperCase() : undefined;
}

export function resolvePinMarkerAbbreviation(
  pin: DrawingPin,
  abbrevByKey: Record<string, string>,
  productName: string,
): string {
  if (pin.group != null && pin.item != null) {
    const fromGroup = abbrevByKey[groupItemAbbrevKey(pin.group, pin.item)]?.trim();
    if (fromGroup) return fromGroup.toUpperCase();

    const fromDetail = resolvePinMarkerAbbreviationFromGroupDetail(pin);
    if (fromDetail) return fromDetail;
  }
  if (productName && productName !== "PIN") {
    return initialsFromProductName(productName);
  }
  return "PIN";
}

export function resolvePinDisplayQuantity(pin: DrawingPin): number {
  const q = pin.quantity;
  if (typeof q === "number" && Number.isFinite(q) && q > 0) return q;
  return 1;
}

export function defaultQuantityForNewPin(compositeQuantity?: number | null): number {
  if (typeof compositeQuantity === "number" && Number.isFinite(compositeQuantity) && compositeQuantity > 0) {
    return compositeQuantity;
  }
  return 1;
}
