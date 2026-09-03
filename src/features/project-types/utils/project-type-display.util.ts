import type { ProjectType } from "@/features/project-types/types/project-type.types";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export function normalizeProjectTypeHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.slice(0, 7).toLowerCase();
}

/** API label field; legacy responses may still use `name`. */
export function projectTypeNameFromRow(row: { project_type?: string | null; name?: string | null }): string {
  return row.project_type?.trim() || row.name?.trim() || "";
}

export function formatProjectTypeLabel(row: Pick<ProjectType, "id" | "project_type"> & { name?: string | null }): string {
  const label = projectTypeNameFromRow(row);
  return label || `Type #${row.id}`;
}

export function projectTypeBgHex(
  row: Pick<ProjectType, "bg_color"> & { bg_colour?: string | null },
): string {
  return normalizeProjectTypeHex(row.bg_color ?? row.bg_colour, DEFAULT_BG);
}

export function projectTypeTextHex(
  row: Pick<ProjectType, "text_color"> & { text_colour?: string | null },
): string {
  return normalizeProjectTypeHex(row.text_color ?? row.text_colour, DEFAULT_TEXT);
}
