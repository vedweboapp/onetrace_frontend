"use client";

import { WorkflowColourStatusChip } from "@/shared/components/workflow-colour-status-chip";
import type { WorkflowColourStatus } from "@/shared/types/workflow-colour-status.types";
import { cn } from "@/core/utils/http.util";
import { normalizeMaterialRequestStatus } from "@/features/material-requests/utils/material-request-nested-fields.util";

type Props = {
  status: string | { id?: number; name?: string; status_name?: string; bg_colour?: string; text_colour?: string } | null | undefined;
  label?: string;
  statusRow?: Pick<WorkflowColourStatus, "status_name" | "bg_colour" | "text_colour"> | null;
  className?: string;
};

function fallbackTone(status: string | { id?: number; name?: string; status_name?: string; bg_colour?: string; text_colour?: string } | null | undefined): string {
  const statusStr = typeof status === "object" && status ? (status.name || status.status_name) : status;
  const norm = normalizeMaterialRequestStatus(statusStr);
  if (norm === "dispatched") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-300";
  }
  if (norm === "partially_dispatched" || norm === "partial") {
    return "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-300";
  }
  if (norm === "pending") {
    return "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";
  }
  if (norm === "draft") {
    return "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-950/50 dark:text-sky-300";
  }
  return "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300";
}

export function MaterialRequestStatusBadge({ status, label, statusRow, className }: Props) {
  const statusStr = typeof status === "object" && status ? (status.name || status.status_name) : (typeof status === "string" ? status : "");
  const displayLabel = label ?? statusRow?.status_name ?? statusStr?.trim() ?? "—";

  if (statusRow) {
    return (
      <WorkflowColourStatusChip
        row={{ ...statusRow, status_name: displayLabel }}
        className={className}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex w-fit max-w-full shrink-0 self-start items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        fallbackTone(status),
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current opacity-80" aria-hidden />
      {displayLabel}
    </span>
  );
}
