"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import {
  sanitizeInternalListBack,
  type DashboardListSection,
} from "@/shared/utils/detail-from-list.util";

/**
 * Resolves the back link for entity detail pages: `?back=` from list, else current locale list path.
 */
export function useEntityDetailBack(listSection: DashboardListSection, listRoute: string) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), listSection);

  const listHref = React.useMemo(() => {
    const i = pathname.indexOf(listRoute);
    return i >= 0 ? pathname.slice(0, i + listRoute.length) : listRoute;
  }, [pathname, listRoute]);

  return safeBack ?? listHref;
}
