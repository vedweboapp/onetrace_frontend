import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

/** Options for a row, hiding values already chosen on other rows (keeps `currentValue`). */
export function checkmarkOptionsExcludingUsed(
  all: CheckmarkSelectOption[],
  usedValues: string[],
  currentValue: string,
): CheckmarkSelectOption[] {
  const used = new Set(usedValues.filter((v) => v && v !== currentValue));
  return all.filter((opt) => !used.has(opt.value));
}
