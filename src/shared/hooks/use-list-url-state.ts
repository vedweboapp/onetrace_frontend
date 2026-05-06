"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  DEFAULT_LIST_PAGE_SIZE,
  normalizeListPageSize,
  parsePageSizeParam,
} from "@/shared/utils/list-page-size.util";

export type ListUrlUpdates = Record<string, string | null | undefined>;

export type SetListUrlOptions = {
  replace?: boolean;
};

/** `is_active` query: omit / empty = all; `true` / `false` = filter */
export function parseIsActiveParam(param: string | null): boolean | undefined {
  if (param === "true") return true;
  if (param === "false") return false;
  return undefined;
}

/**
 * True when search or explicit list filters are applied in the URL.
 * Used to show a “no results” state instead of the onboarding empty state.
 */
export function hasListActiveFilters(args: {
  search: string;
  isActiveParam?: string | null;
  groupParam?: string | null;
}): boolean {
  if (args.search.trim() !== "") return true;
  /** Default list is active-only; only “inactive” is treated as an applied filter. */
  if (args.isActiveParam === "false") return true;
  if (args.groupParam != null && args.groupParam.trim() !== "") return true;
  return false;
}

export function parseGroupIdParam(param: string | null): number | undefined {
  if (!param || !/^\d+$/.test(param)) return undefined;
  const n = Number.parseInt(param, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Table (default) vs card grid list view; only `list` is stored in the URL (`?view=list`). */
export type ListPageViewMode = "table" | "list";

export function parseListViewParam(param: string | null): ListPageViewMode {
  return param === "list" ? "list" : "table";
}

export function useListUrlState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const page = React.useMemo(() => {
    const raw = searchParams.get("page");
    const n = raw ? Number.parseInt(raw, 10) : 1;
    return Number.isFinite(n) && n >= 1 ? n : 1;
  }, [searchParams]);

  const search = searchParams.get("search") ?? "";
  const isActiveParam = searchParams.get("is_active");
  const groupParam = searchParams.get("group");
  const pageSize = React.useMemo(
    () => parsePageSizeParam(searchParams.get("page_size")),
    [searchParams],
  );

  const listViewMode = React.useMemo(
    () => parseListViewParam(searchParams.get("view")),
    [searchParams],
  );

  const setUrl = React.useCallback(
    (updates: ListUrlUpdates, opts?: SetListUrlOptions) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === undefined || value === "") {
          p.delete(key);
        } else {
          p.set(key, value);
        }
      }
      if (p.get("page") === "1") {
        p.delete("page");
      }
      if (p.get("page_size") === String(DEFAULT_LIST_PAGE_SIZE)) {
        p.delete("page_size");
      }
      const view = p.get("view");
      if (view && view !== "list") {
        p.delete("view");
      }
      const qs = p.toString();
      const href = qs.length > 0 ? `${pathname}?${qs}` : pathname;
      if (opts?.replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    },
    [pathname, router, searchParams],
  );

  const setPage = React.useCallback(
    (next: number) => {
      const safe = Number.isFinite(next) && next >= 1 ? next : 1;
      setUrl({ page: safe <= 1 ? null : String(safe) });
    },
    [setUrl],
  );

  const setPageSize = React.useCallback(
    (next: number) => {
      const size = normalizeListPageSize(next);
      setUrl(
        {
          page_size: size === DEFAULT_LIST_PAGE_SIZE ? null : String(size),
          page: null,
        },
        { replace: true },
      );
    },
    [setUrl],
  );

  const setListViewMode = React.useCallback(
    (mode: ListPageViewMode) => {
      setUrl({ view: mode === "list" ? "list" : null, page: null }, { replace: true });
    },
    [setUrl],
  );

  return {
    page,
    pageSize,
    listViewMode,
    search,
    isActiveParam,
    groupParam,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
    pathname,
  };
}
