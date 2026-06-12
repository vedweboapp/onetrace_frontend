import type { JobChecklistItem } from "@/features/jobs/types/job.types";

export function jobChecklistItemLabel(item: JobChecklistItem): string {
  return item.title?.trim() || `#${item.id}`;
}

export function JobChecklistItemTitle({ item }: { item: JobChecklistItem }) {
  return (
    <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
      {jobChecklistItemLabel(item)}
      {item.is_required ? <span className="text-red-500"> *</span> : null}
    </span>
  );
}
