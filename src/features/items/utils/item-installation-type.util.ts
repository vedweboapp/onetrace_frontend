import type { InstallationType } from "@/features/installation-types/types/installation-type.types";
import { formatInstallationTypeLabel } from "@/features/installation-types/utils/installation-type-display.util";
import type { Item, ItemInstallationTypeRef } from "@/features/items/types/item.types";

const DEFAULT_BG = "#DBEAFE";
const DEFAULT_TEXT = "#1E40AF";

export function installationTypeNameFromRef(ref: ItemInstallationTypeRef): string {
  return ref.installation_type?.trim() || ref.name?.trim() || "";
}

export function getInstallationTypeId(value: Item["installation_type"]): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  if (typeof value === "object" && Number.isFinite(value.id) && value.id > 0) return value.id;
  return null;
}

export function resolveInstallationTypeLabel(
  value: Item["installation_type"],
  byId?: Record<number, Pick<InstallationType, "id" | "installation_type">>,
): string {
  if (value != null && typeof value === "object") {
    const name = installationTypeNameFromRef(value);
    return name || `Type #${value.id}`;
  }
  const id = getInstallationTypeId(value);
  if (!id) return "—";
  const cached = byId?.[id];
  if (cached) return formatInstallationTypeLabel(cached);
  return `Type #${id}`;
}

export function resolveInstallationTypeChipData(
  value: Item["installation_type"],
  byId?: Record<number, InstallationType>,
): Pick<InstallationType, "id" | "installation_type" | "bg_color" | "text_color"> | null {
  if (value != null && typeof value === "object") {
    const ref = value;
    return {
      id: ref.id,
      installation_type: installationTypeNameFromRef(ref) || `Type #${ref.id}`,
      bg_color: ref.bg_color ?? ref.bg_colour ?? DEFAULT_BG,
      text_color: ref.text_color ?? ref.text_colour ?? DEFAULT_TEXT,
    };
  }
  const id = getInstallationTypeId(value);
  if (!id) return null;
  const row = byId?.[id];
  if (row) return row;
  return {
    id,
    installation_type: `Type #${id}`,
    bg_color: DEFAULT_BG,
    text_color: DEFAULT_TEXT,
  };
}
