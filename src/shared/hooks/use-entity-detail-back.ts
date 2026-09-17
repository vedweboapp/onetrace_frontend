"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  pathWithoutQueryAndHash,
  readBackHrefForPath,
  sanitizeInternalListBack,
  sanitizeJobsBackHref,
  sanitizeQuotationsBackHref,
  storeBackHrefForPath,
  type DashboardListSection,
} from "@/shared/utils/detail-from-list.util";
import { sanitizeInternalDashboardBack } from "@/shared/utils/quick-create-navigation.util";

function useMigrateBackQueryToStorage(pathname: string) {
  const searchParams = useSearchParams();
  const router = useRouter();

  React.useEffect(() => {
    const raw = searchParams.get("back");
    if (!raw) return;
    storeBackHrefForPath(pathname, raw);
    const p = new URLSearchParams(searchParams.toString());
    p.delete("back");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);
}

function resolveStoredOrQueryBack(
  pathname: string,
  rawBack: string | null,
  listSection: DashboardListSection,
  fallback: string,
): string {
  const raw = readBackHrefForPath(pathname) ?? rawBack;
  const resolved =
    listSection === "jobs"
      ? sanitizeJobsBackHref(raw, fallback)
      : listSection === "quotations"
        ? sanitizeQuotationsBackHref(raw, fallback)
        : sanitizeInternalDashboardBack(raw) ?? sanitizeInternalListBack(raw, listSection) ?? fallback;

  if (pathWithoutQueryAndHash(resolved) === pathWithoutQueryAndHash(pathname)) {
    return fallback;
  }

  return resolved;
}

/**
 * Resolves the back link for entity detail pages from session storage (or legacy `?back=`).
 */
export function useEntityDetailBack(listSection: DashboardListSection, listRoute: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useMigrateBackQueryToStorage(pathname);

  const listHref = React.useMemo(() => {
    const i = pathname.indexOf(listRoute);
    return i >= 0 ? pathname.slice(0, i + listRoute.length) : listRoute;
  }, [pathname, listRoute]);

  const resolve = React.useCallback(
    () => resolveStoredOrQueryBack(pathname, searchParams.get("back"), listSection, listHref),
    [pathname, searchParams, listSection, listHref],
  );

  const [backHref, setBackHref] = React.useState(resolve);

  React.useLayoutEffect(() => {
    setBackHref(resolve());
  }, [resolve]);

  return backHref;
}

/** Back link for create/edit form screens (stored in session, not in the URL). */
export function useFormBackUrl(listSection: DashboardListSection, fallback: string): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useMigrateBackQueryToStorage(pathname);

  const resolve = React.useCallback(
    () => resolveStoredOrQueryBack(pathname, searchParams.get("back"), listSection, fallback),
    [pathname, searchParams, listSection, fallback],
  );

  const [backHref, setBackHref] = React.useState(resolve);

  React.useLayoutEffect(() => {
    setBackHref(resolve());
  }, [resolve]);

  return backHref;
}

/** Quotation forms may return to the quotations list or a project detail page. */
export function useQuotationFormBackUrl(): string {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useMigrateBackQueryToStorage(pathname);

  const resolve = React.useCallback(() => {
    const raw = readBackHrefForPath(pathname) ?? searchParams.get("back");
    return sanitizeQuotationsBackHref(raw, routes.dashboard.quotations);
  }, [pathname, searchParams]);

  const [backHref, setBackHref] = React.useState(resolve);

  React.useLayoutEffect(() => {
    setBackHref(resolve());
  }, [resolve]);

  return backHref;
}
