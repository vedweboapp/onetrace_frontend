import type {
  DataAdministrationLog,
  DataAdministrationUserRef,
} from "@/features/settings/data-administration/types/data-administration.types";

function asUserRef(value: unknown): DataAdministrationUserRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as DataAdministrationUserRef;
}

export function dataAdminLogFileName(row: DataAdministrationLog): string {
  return (
    row.file_name?.trim() ||
    row.original_filename?.trim() ||
    row.filename?.trim() ||
    `#${row.id}`
  );
}

export function dataAdminLogModule(row: DataAdministrationLog): string {
  return row.module_name?.trim() || row.module?.trim() || "—";
}

export function dataAdminLogStatus(row: DataAdministrationLog): string {
  return row.status?.trim() || "—";
}

export function dataAdminLogWhen(row: DataAdministrationLog): string | null {
  const raw = row.created_at || row.imported_at || row.exported_at || row.modified_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : raw;
}

export function dataAdminLogActor(row: DataAdministrationLog): string {
  const raw = row.created_by ?? row.imported_by ?? row.exported_by ?? row.user;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return `#${raw}`;
  const user = asUserRef(raw);
  if (!user) return "—";
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.name?.trim() || user.username?.trim() || user.email?.trim() || "—";
}

export function dataAdminCount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function dataAdminCanUndo(row: DataAdministrationLog): boolean {
  if (typeof row.can_undo === "boolean") return row.can_undo;
  if (typeof row.undo_available === "boolean") return row.undo_available;
  return true;
}

export function dataAdminCanRedo(row: DataAdministrationLog): boolean {
  if (typeof row.can_redo === "boolean") return row.can_redo;
  if (typeof row.redo_available === "boolean") return row.redo_available;
  return true;
}
