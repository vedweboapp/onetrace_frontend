import type { UnitType } from "@/features/unit-types/types/unit-type.types";
import { formatUnitTypeLabel, formatUnitTypeShortLabel } from "@/features/unit-types/utils/unit-type-display.util";
import type { Item, ItemUnitTypeRef } from "@/features/items/types/item.types";

export function getUnitTypeId(value: Item["unit_type"]): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && Number.isFinite(value.id) && value.id > 0) return value.id;
  return null;
}

export function resolveUnitTypeLabel(
  value: Item["unit_type"],
  byId?: Record<number, Pick<UnitType, "id" | "name">>,
): string {
  if (value != null && typeof value === "object") {
    const name = value.name?.trim();
    return name || `Unit #${value.id}`;
  }
  const id = getUnitTypeId(value);
  if (!id) return "—";
  const cached = byId?.[id];
  if (cached) return formatUnitTypeLabel(cached);
  return `Unit #${id}`;
}

export function resolveUnitTypeShortLabel(
  value: Item["unit_type"],
  byId?: Record<number, Pick<UnitType, "id" | "name" | "short_form">>,
): string {
  if (value != null && typeof value === "object") {
    const name = value.short_form?.trim?.() ?? "";
    if (name) return name;
    const fallback = value.name?.trim();
    return fallback || `Unit #${value.id}`;
  }
  const id = getUnitTypeId(value);
  if (!id) return "—";
  const cached = byId?.[id];
  if (cached) return formatUnitTypeShortLabel(cached);
  return `Unit #${id}`;
}

export function unitTypeNameFromRef(ref: ItemUnitTypeRef): string {
  return ref.name?.trim() || "";
}

/** When no unit is chosen yet, pick the first active option from the API list. */
export function resolveDefaultUnitTypeSelectValue(
  currentValue: string,
  options: Array<{ value: string }>,
): string {
  if (currentValue.trim()) return currentValue;
  return options[0]?.value ?? "";
}
