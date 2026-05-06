/** Allowed page sizes for list APIs (`page_size` query). */
export const LIST_PAGE_SIZE_CHOICES = [10, 20, 50, 100] as const;

export type ListPageSizeChoice = (typeof LIST_PAGE_SIZE_CHOICES)[number];

export const DEFAULT_LIST_PAGE_SIZE: ListPageSizeChoice = 20;

export function normalizeListPageSize(raw: number): ListPageSizeChoice {
  if (!Number.isFinite(raw)) return DEFAULT_LIST_PAGE_SIZE;
  const n = Math.trunc(raw);
  return (LIST_PAGE_SIZE_CHOICES as readonly number[]).includes(n)
    ? (n as ListPageSizeChoice)
    : DEFAULT_LIST_PAGE_SIZE;
}

/** Parse `page_size` URL param; invalid or missing → default. */
export function parsePageSizeParam(param: string | null): ListPageSizeChoice {
  if (param == null || param === "") return DEFAULT_LIST_PAGE_SIZE;
  const n = Number.parseInt(param, 10);
  return normalizeListPageSize(n);
}

export function listPageSizeSelectOptions(): { value: string; label: string }[] {
  return LIST_PAGE_SIZE_CHOICES.map((n) => ({ value: String(n), label: String(n) }));
}
