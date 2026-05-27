/** Allowed page sizes for list APIs (`page_size` query). */
export const LIST_PAGE_SIZE_CHOICES = [10, 20, 50, 100] as const;

export type ListPageSizeChoice = (typeof LIST_PAGE_SIZE_CHOICES)[number];

export const DEFAULT_LIST_PAGE_SIZE: ListPageSizeChoice = 20;

export function normalizeListPageSize(
  raw: number,
  fallback: ListPageSizeChoice = DEFAULT_LIST_PAGE_SIZE,
): ListPageSizeChoice {
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.trunc(raw);
  return (LIST_PAGE_SIZE_CHOICES as readonly number[]).includes(n)
    ? (n as ListPageSizeChoice)
    : fallback;
}

export function parsePageSizeParam(
  param: string | null,
  fallback: ListPageSizeChoice = DEFAULT_LIST_PAGE_SIZE,
): ListPageSizeChoice {
  if (param == null || param === "") return fallback;
  const n = Number.parseInt(param, 10);
  return normalizeListPageSize(n, fallback);
}

export function listPageSizeSelectOptions(): { value: string; label: string }[] {
  return LIST_PAGE_SIZE_CHOICES.map((n) => ({ value: String(n), label: String(n) }));
}
