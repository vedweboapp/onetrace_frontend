"use client";

import type { ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { storeBackHrefForPath } from "@/shared/utils/detail-from-list.util";

function currentDashboardLocation(pathname: string, searchParams: URLSearchParams): string {
  const qs = searchParams.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function destinationPath(href: string): string {
  return href.split("#")[0]?.split("?")[0] ?? href;
}

type Props = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
};

/** Cross-entity link from a detail page — stores the current page as the back target before navigating. */
export function DetailEntityLink({ href, onClick, ...props }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={href}
      onClick={(event) => {
        storeBackHrefForPath(destinationPath(href), currentDashboardLocation(pathname, searchParams));
        onClick?.(event);
      }}
      {...props}
    />
  );
}
