"use client";

import * as React from "react";
import { useLocale } from "next-intl";

type DateFormatOptions = {
  /** Date only (no time), e.g. due dates and project ranges. */
  dateOnly?: boolean;
};

/** Shared formatter for dashboard entity views. */
export function useDashboardDateFormat(options?: DateFormatOptions) {
  const locale = useLocale();
  const dateOnly = options?.dateOnly ?? false;
  return React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        ...(dateOnly ? {} : { timeStyle: "short" as const }),
      }),
    [locale, dateOnly],
  );
}
