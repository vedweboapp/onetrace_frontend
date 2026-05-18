"use client";

import * as React from "react";
import { useLocale } from "next-intl";

/** Shared medium date + short time formatter for dashboard entity views. */
export function useDashboardDateFormat() {
  const locale = useLocale();
  return React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );
}
