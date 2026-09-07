import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

/** Keeps the current selection visible when options reload asynchronously. */
export function ensureCheckmarkOption(
  options: CheckmarkSelectOption[],
  value: string,
  fallbackLabel?: string,
): CheckmarkSelectOption[] {
  const id = value.trim();
  if (!id || options.some((opt) => opt.value === id)) return options;
  const label = fallbackLabel?.trim() || `#${id}`;
  return [{ value: id, label }, ...options];
}

/** Ensures every selected value has a matching option for multi-select display. */
export function ensureMultiCheckOptions(
  options: CheckmarkSelectOption[],
  values: string[],
  fallbackLabels?: Record<string, string>,
): CheckmarkSelectOption[] {
  const byValue = new Map(options.map((opt) => [opt.value, opt]));
  for (const raw of values) {
    const id = raw.trim();
    if (!id || byValue.has(id)) continue;
    const label = fallbackLabels?.[id]?.trim() || `#${id}`;
    byValue.set(id, { value: id, label });
  }
  return Array.from(byValue.values());
}
