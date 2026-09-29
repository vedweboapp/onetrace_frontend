"use client";

import type { ComponentProps } from "react";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";
import { storeBackHrefForPath } from "@/shared/utils/detail-from-list.util";

/** Clickable entity names — always blue so they read as links, not primary/accent. */
export const entityNameLinkClassName =
  "text-[#2563EB] underline-offset-2 hover:underline hover:text-[#1D4ED8] dark:text-[#60A5FA] dark:hover:text-[#93C5FD]";

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
export function DetailEntityLink({ href, onClick, className, ...props }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return (
    <Link
      href={href}
      className={cn(entityNameLinkClassName, className)}
      onClick={(event) => {
        storeBackHrefForPath(destinationPath(href), currentDashboardLocation(pathname, searchParams));
        onClick?.(event);
      }}
      {...props}
    />
  );
}
