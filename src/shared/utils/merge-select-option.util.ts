import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";
import type { QuickCreateResult } from "@/shared/types/quick-create.types";

export function mergeQuickCreateOption(
  prev: CheckmarkSelectOption[],
  created: QuickCreateResult,
): CheckmarkSelectOption[] {
  const value = String(created.id);
  if (prev.some((o) => o.value === value)) return prev;
  const next = [...prev, { value, label: created.label }];
  next.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return next;
}
