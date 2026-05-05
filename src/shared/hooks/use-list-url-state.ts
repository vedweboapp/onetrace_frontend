"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

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

export function parseGroupIdParam(param: string | null): number | undefined {
  if (!param || !/^\d+$/.test(param)) return undefined;
  const n = Number.parseInt(param, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
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

  return {
    page,
    search,
    isActiveParam,
    groupParam,
    setUrl,
    setPage,
    pathname,
  };
}
