"use client";

import type { InstallationType } from "@/features/installation-types/types/installation-type.types";
import {
  formatInstallationTypeLabel,
  installationTypeBgHex,
  installationTypeTextHex,
} from "@/features/installation-types/utils/installation-type-display.util";
import { cn } from "@/core/utils/http.util";

export function InstallationTypeChip({
  row,
  className,
}: {
  row: Pick<InstallationType, "id" | "installation_type" | "bg_color" | "text_color">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{ backgroundColor: installationTypeBgHex(row), color: installationTypeTextHex(row) }}
    >
      {formatInstallationTypeLabel(row)}
    </span>
  );
}
