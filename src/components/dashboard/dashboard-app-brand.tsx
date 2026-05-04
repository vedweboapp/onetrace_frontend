"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
};

/**
 * Logo slot: replace the inner span with `<Image />` when the asset exists.
 * App name stays screen-reader only so layout does not depend on wordmark text.
 */
export function DashboardAppBrand({ className }: Props) {
  const t = useTranslations("Dashboard.brand");

  return (
    <Link
      href={routes.dashboard.projects}
      className={cn("flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600", className)}
    >
      <span
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
        aria-hidden
      />
      <span className="sr-only">{t("appName")}</span>
    </Link>
  );
}
