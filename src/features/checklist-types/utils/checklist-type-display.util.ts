import type {
  ChecklistType,
  ChecklistTypeProjectTypeRef,
} from "@/features/checklist-types/types/checklist-type.types";

export function checklistTypeTitleFromRow(row: { title?: string | null }): string {
  return row.title?.trim() ?? "";
}

export function formatChecklistTypeLabel(row: Pick<ChecklistType, "id" | "title">): string {
  const label = checklistTypeTitleFromRow(row);
  return label || `Checklist #${row.id}`;
}

export function projectTypeLabelFromChecklistRow(row: {
  project_type?: ChecklistTypeProjectTypeRef | number | null;
  project_type_name?: string | null;
}): string {
  const pt = row.project_type;
  if (pt && typeof pt === "object") {
    return pt.project_type?.trim() || pt.name?.trim() || `Type #${pt.id}`;
  }
  if (row.project_type_name?.trim()) return row.project_type_name.trim();
  if (typeof pt === "number" && pt > 0) return `Type #${pt}`;
  return "—";
}

export function projectTypeIdFromChecklistRow(row: {
  project_type?: ChecklistTypeProjectTypeRef | number | null;
}): number | undefined {
  const pt = row.project_type;
  if (pt && typeof pt === "object" && pt.id > 0) return pt.id;
  if (typeof pt === "number" && pt > 0) return pt;
  return undefined;
}
