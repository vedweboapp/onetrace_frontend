import type { UnitType } from "@/features/unit-types/types/unit-type.types";

export function formatUnitTypeLabel(row: Pick<UnitType, "id" | "name">): string {
  const name = row.name?.trim();
  if (name) return name;
  return `Unit #${row.id}`;
}

export function formatUnitTypeShortLabel(row: Pick<UnitType, "id" | "name" | "short_form">): string {
  const shortForm = row.short_form?.trim();
  if (shortForm) return shortForm;
  // Fallback to full name to keep UI stable for legacy rows.
  return formatUnitTypeLabel(row);
}
