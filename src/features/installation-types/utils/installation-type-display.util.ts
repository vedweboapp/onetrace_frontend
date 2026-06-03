import type { InstallationType } from "@/features/installation-types/types/installation-type.types";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export function normalizeInstallationTypeHex(raw: string | null | undefined, fallback: string): string {
  const t = (raw ?? "").trim();
  if (!t) return fallback;
  const h = t.startsWith("#") ? t : `#${t}`;
  if (h.length === 4) return `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`.toLowerCase();
  return h.slice(0, 7).toLowerCase();
}

/** API label field; legacy responses may still use `name`. */
export function installationTypeNameFromRow(row: {
  installation_type?: string | null;
  name?: string | null;
}): string {
  return row.installation_type?.trim() || row.name?.trim() || "";
}

export function formatInstallationTypeLabel(
  row: Pick<InstallationType, "id" | "installation_type"> & { name?: string | null },
): string {
  const label = installationTypeNameFromRow(row);
  return label || `Type #${row.id}`;
}

export function installationTypeBgHex(
  row: Pick<InstallationType, "bg_color"> & { bg_colour?: string | null },
): string {
  return normalizeInstallationTypeHex(row.bg_color ?? row.bg_colour, DEFAULT_BG);
}

export function installationTypeTextHex(
  row: Pick<InstallationType, "text_color"> & { text_colour?: string | null },
): string {
  return normalizeInstallationTypeHex(row.text_color ?? row.text_colour, DEFAULT_TEXT);
}
