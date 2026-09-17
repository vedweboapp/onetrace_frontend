import api from "@/core/api/axios";
import { ApiBusinessError } from "@/core/errors/api-business-error";

/** Shared flag for list endpoints that should return cursor-paginated dropdown data. */
export type WithDropdownFilter = {
  dropdown?: boolean;
};

/**
 * Default `page_size` for `dropdown=true` list loads.
 * Full option lists still load completely by following `pagination.next` / cursor `next`.
 */
export const DROPDOWN_LIST_PAGE_SIZE = 20;

type PaginationWithNext = {
  next: string | null;
  previous: string | null;
  total_pages: number;
  current_page: number;
  page_size: number;
  total_records: number;
};

type ListPageResult<T, P extends PaginationWithNext = PaginationWithNext> = {
  items: T[];
  pagination: P;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asItemArray<T>(value: unknown): T[] | null {
  return Array.isArray(value) ? (value as T[]) : null;
}

function pickNext(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isCursorResultsEnvelope(raw: Record<string, unknown>): boolean {
  return Array.isArray(raw.results) || "next" in raw || "previous" in raw;
}

/** Adds `dropdown=true` when loading full option lists for selects. */
export function applyDropdownListParam(
  params: Record<string, string | number | boolean>,
  dropdown?: boolean,
): void {
  if (dropdown === true) params.dropdown = "true";
}

/**
 * Normalize common list / cursor-pagination envelopes into `{ items, pagination }`.
 * Supports:
 * - `{ success, data: T[], pagination: { next } }` (normal list pages)
 * - `{ success, data: { results: T[], next, previous } }`
 * - `{ results: T[], next, previous }` (dropdown=true cursor pages — no `success`/`data`)
 */
export function unwrapListPayload<T, P extends PaginationWithNext = PaginationWithNext>(
  raw: unknown,
  fallbackPageSize = DROPDOWN_LIST_PAGE_SIZE,
): ListPageResult<T, P> {
  if (!raw || typeof raw !== "object") {
    return {
      items: [],
      pagination: {
        next: null,
        previous: null,
        page_size: fallbackPageSize,
        total_records: 0,
        current_page: 1,
        total_pages: 1,
      } as P,
    };
  }

  const envelope = raw as Record<string, unknown>;
  const nestedData = envelope.data;
  const nestedRec = asRecord(nestedData);
  const paginationRec = asRecord(envelope.pagination) ?? {};

  const fromTopResults = asItemArray<T>(envelope.results);
  const fromDataResults = nestedRec ? asItemArray<T>(nestedRec.results) : null;
  const fromDataArray = asItemArray<T>(nestedData);

  const preferCursor =
    Boolean(fromTopResults) ||
    Boolean(fromDataResults) ||
    isCursorResultsEnvelope(envelope) ||
    (nestedRec != null && isCursorResultsEnvelope(nestedRec));

  const items =
    (preferCursor
      ? (fromTopResults ?? fromDataResults ?? fromDataArray)
      : (fromDataArray ?? fromTopResults ?? fromDataResults)) ?? [];

  const next =
    pickNext(envelope.next) ??
    pickNext(nestedRec?.next) ??
    pickNext(paginationRec.next) ??
    null;
  const previous =
    pickNext(envelope.previous) ??
    pickNext(nestedRec?.previous) ??
    pickNext(paginationRec.previous) ??
    null;

  const pageSizeRaw = paginationRec.page_size ?? nestedRec?.page_size ?? envelope.page_size;
  const pageSize =
    typeof pageSizeRaw === "number" && Number.isFinite(pageSizeRaw) && pageSizeRaw > 0
      ? pageSizeRaw
      : fallbackPageSize;

  const totalRaw =
    paginationRec.total_records ?? nestedRec?.total_records ?? envelope.total_records;
  const total =
    typeof totalRaw === "number" && Number.isFinite(totalRaw)
      ? totalRaw
      : next
        ? Math.max(items.length + 1, pageSize)
        : items.length;

  const currentRaw =
    paginationRec.current_page ?? nestedRec?.current_page ?? envelope.current_page;
  const current =
    typeof currentRaw === "number" && Number.isFinite(currentRaw) && currentRaw > 0
      ? currentRaw
      : 1;

  const pagesRaw = paginationRec.total_pages ?? nestedRec?.total_pages ?? envelope.total_pages;
  const totalPages =
    typeof pagesRaw === "number" && Number.isFinite(pagesRaw) && pagesRaw > 0
      ? pagesRaw
      : next
        ? Math.max(2, current + 1)
        : 1;

  return {
    items,
    pagination: {
      ...paginationRec,
      next,
      previous,
      page_size: pageSize,
      total_records: total,
      current_page: current,
      total_pages: totalPages,
    } as P,
  };
}

/**
 * Parse a list/dropdown GET body.
 * - Cursor dropdown: `{ results, next, previous }` (no `success`) → OK
 * - Envelope: `{ success: true, data: [...] }` → OK
 * - Envelope: `{ success: false, ... }` → throws
 */
export function parseListApiPage<T, P extends PaginationWithNext = PaginationWithNext>(
  raw: unknown,
  fallbackPageSize = DROPDOWN_LIST_PAGE_SIZE,
): ListPageResult<T, P> {
  const rec = asRecord(raw);
  if (rec && rec.success === false) {
    const msg =
      typeof rec.message === "string" && rec.message.trim() ? rec.message.trim() : "Request failed";
    throw new ApiBusinessError(msg);
  }
  return unwrapListPayload<T, P>(raw, fallbackPageSize);
}

/**
 * Coerce a page returned by feature APIs when `data` was a cursor bag
 * (`{ results, next }`) instead of a plain array.
 */
export function coerceListPageResult<T, P extends PaginationWithNext>(
  page: ListPageResult<T, P>,
  fallbackPageSize = DROPDOWN_LIST_PAGE_SIZE,
): ListPageResult<T, P> {
  if (Array.isArray(page.items)) {
    const next = pickNext(page.pagination?.next) ?? null;
    return {
      items: page.items,
      pagination: {
        ...page.pagination,
        next,
        previous: pickNext(page.pagination?.previous) ?? null,
        page_size: page.pagination?.page_size || fallbackPageSize,
      } as P,
    };
  }

  return unwrapListPayload<T, P>({ data: page.items, pagination: page.pagination }, fallbackPageSize);
}

/**
 * GET a cursor/`next` URL from list pagination.
 * Supports absolute URLs and API-relative paths.
 */
export async function fetchListNextPage<T, P extends PaginationWithNext = PaginationWithNext>(
  nextUrl: string,
  options?: { silent?: boolean },
): Promise<ListPageResult<T, P>> {
  const trimmed = nextUrl.trim();
  if (!trimmed) {
    return {
      items: [],
      pagination: {
        next: null,
        previous: null,
        page_size: DROPDOWN_LIST_PAGE_SIZE,
        total_records: 0,
        current_page: 1,
        total_pages: 1,
      } as P,
    };
  }

  const { data } = await api.get<unknown>(trimmed, {
    skipErrorToast: options?.silent === true,
  });
  return parseListApiPage<T, P>(data);
}

/**
 * When `dropdown` is true, follow cursor/`pagination.next` until exhausted and return all rows.
 * Otherwise return the single page as-is.
 */
export async function resolveDropdownListPages<
  T,
  P extends PaginationWithNext = PaginationWithNext,
>(args: {
  dropdown?: boolean;
  silent?: boolean;
  fetchFirst: () => Promise<ListPageResult<T, P>>;
}): Promise<ListPageResult<T, P>> {
  const first = coerceListPageResult(await args.fetchFirst());
  if (args.dropdown !== true) return first;

  const all = [...first.items];
  let next = first.pagination?.next ?? null;
  const seen = new Set<string>();

  while (typeof next === "string" && next.trim() && !seen.has(next)) {
    seen.add(next);
    const page = await fetchListNextPage<T, P>(next, { silent: args.silent });
    all.push(...page.items);
    next = page.pagination?.next ?? null;
    if (page.items.length === 0) break;
  }

  return {
    items: all,
    pagination: {
      ...first.pagination,
      next: null,
      previous: null,
      total_records: all.length,
      total_pages: 1,
      current_page: 1,
      page_size: all.length || DROPDOWN_LIST_PAGE_SIZE,
    } as P,
  };
}
