"use client";

import type { ProjectType } from "@/features/project-types/types/project-type.types";
import {
  formatProjectTypeLabel,
  projectTypeBgHex,
  projectTypeTextHex,
} from "@/features/project-types/utils/project-type-display.util";
import { cn } from "@/core/utils/http.util";

export function ProjectTypeChip({
  row,
  className,
}: {
  row: Pick<ProjectType, "id" | "project_type" | "bg_color" | "text_color">;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{ backgroundColor: projectTypeBgHex(row), color: projectTypeTextHex(row) }}
    >
      {formatProjectTypeLabel(row)}
    </span>
  );
}
