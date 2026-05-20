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

export function resolvePinMarkerAbbreviation(
  pin: DrawingPin,
  abbrevByKey: Record<string, string>,
  productName: string,
): string {
  if (pin.group != null && pin.item != null) {
    const fromGroup = abbrevByKey[groupItemAbbrevKey(pin.group, pin.item)]?.trim();
    if (fromGroup) return fromGroup.toUpperCase();
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
