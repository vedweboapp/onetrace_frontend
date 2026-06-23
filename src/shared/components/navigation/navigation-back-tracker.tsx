"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { readBackHrefForPath, storeBackHrefForPath } from "@/shared/utils/detail-from-list.util";

function currentLocation(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * Remembers the previous in-app location as the back target for the current page.
 * Runs during render so storage is ready before detail pages read their back link.
 * Explicit `storeBackHrefForPath` calls (e.g. from list panels or DetailEntityLink) take precedence.
 */
export function NavigationBackTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRef = React.useRef<string | null>(null);

  const current = currentLocation(pathname, searchParams);
  const previous = previousRef.current;

  if (previous && previous !== current && typeof window !== "undefined") {
    const destinationPath = pathname.split("#")[0] ?? pathname;
    if (!readBackHrefForPath(destinationPath)) {
      storeBackHrefForPath(destinationPath, previous);
    }
  }

  React.useLayoutEffect(() => {
    previousRef.current = current;
  }, [current]);

  return null;
}
