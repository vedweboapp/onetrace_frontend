import type {
  DataAdministrationLog,
  DataAdministrationUserRef,
} from "@/features/settings/data-administration/types/data-administration.types";

function asUserRef(value: unknown): DataAdministrationUserRef | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as DataAdministrationUserRef;
}

function formatUserRef(user: DataAdministrationUserRef | null): string | null {
  if (!user) return null;
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ").trim();
  return fullName || user.name?.trim() || user.username?.trim() || user.email?.trim() || null;
}

export function dataAdminLogFileName(row: DataAdministrationLog): string {
  const name =
    row.file_name?.trim() ||
    row.original_filename?.trim() ||
    row.filename?.trim() ||
    "";
  if (!name) return String(row.id);
  const format = (row.export_format || row.import_format || "").trim().toLowerCase();
  if (format && !name.toLowerCase().endsWith(`.${format}`)) {
    return `${name}.${format}`;
  }
  return name;
}

export function dataAdminLogModule(row: DataAdministrationLog): string {
  return (
    row.module_display_name?.trim() ||
    row.module_name?.trim() ||
    row.module?.trim() ||
    row.model_name?.trim() ||
    "—"
  );
}

export function dataAdminLogFormat(row: DataAdministrationLog): string | null {
  const format = (row.export_format || row.import_format || "").trim().toUpperCase();
  return format || null;
}

export function dataAdminLogStatus(row: DataAdministrationLog): string | null {
  const status = row.status?.trim();
  return status || null;
}

export function dataAdminLogWhen(row: DataAdministrationLog): string | null {
  const raw = row.created_at || row.imported_at || row.exported_at || row.modified_at;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : raw;
}

export function dataAdminLogActor(row: DataAdministrationLog): string {
  const fromDetail = formatUserRef(asUserRef(row.created_by_detail));
  if (fromDetail) return fromDetail;

  const raw = row.created_by ?? row.imported_by ?? row.exported_by ?? row.user;
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof raw === "number" && Number.isFinite(raw)) return `#${raw}`;
  return formatUserRef(asUserRef(raw)) || "—";
}

export function dataAdminCount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function dataAdminRecordsCount(row: DataAdministrationLog): number | null {
  return dataAdminCount(
    row.exported_records_count ??
      row.imported_records_count ??
      row.total_records ??
      null,
  );
}

export function dataAdminCanUndo(row: DataAdministrationLog): boolean {
  if (typeof row.can_undo === "boolean") return row.can_undo;
  if (typeof row.undo_available === "boolean") return row.undo_available;
  return true;
}
