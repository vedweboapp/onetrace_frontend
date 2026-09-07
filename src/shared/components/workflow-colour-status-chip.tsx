import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { cn } from "@/core/utils/http.util";

function normalizeHex(raw: string | null | undefined, fallback: string): string {
  const t = raw?.trim() ?? "";
  if (!t) return fallback;
  return t.startsWith("#") ? t : `#${t}`;
}

export function WorkflowColourStatusChip({
  row,
  className,
  fallbackLabel,
}: {
  row: Pick<WorkflowColourStatus, "status_name" | "bg_colour" | "text_colour"> | null;
  className?: string;
  fallbackLabel?: string;
}) {
  if (!row) {
    return fallbackLabel ? (
      <span className={cn("text-sm text-slate-500 dark:text-slate-400", className)}>{fallbackLabel}</span>
    ) : null;
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{
        backgroundColor: normalizeHex(row.bg_colour, "#e2e8f0"),
        color: normalizeHex(row.text_colour, "#334155"),
      }}
    >
      {row.status_name}
    </span>
  );
}
