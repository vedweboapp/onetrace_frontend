"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/core/utils/http.util";

/**
 * Reads `?highlight=<id>` from the list URL, scrolls the matching row/card into view,
 * applies a short-lived highlight class, then removes the param (preserves other query state).
 */
export function useListRowHighlight() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const highlightedId = searchParams.get("highlight");

  React.useEffect(() => {
    if (!highlightedId) return;
    const raf = requestAnimationFrame(() => {
      document.querySelector(`[data-list-row-id="${highlightedId}"]`)?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [highlightedId]);

  React.useEffect(() => {
    if (!highlightedId) return;
    const t = window.setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      p.delete("highlight");
      const qs = p.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, 3800);
    return () => window.clearTimeout(t);
  }, [highlightedId, pathname, router, searchParams]);

  const highlightClass = (id: number) =>
    highlightedId != null && String(id) === highlightedId
      ? "ring-2 ring-[color:var(--dash-accent)]/45 bg-slate-50/90 dark:bg-slate-800/55"
      : undefined;

  const highlightClassName = (id: number) => cn(highlightClass(id));

  return { highlightedId, highlightClassName };
}
