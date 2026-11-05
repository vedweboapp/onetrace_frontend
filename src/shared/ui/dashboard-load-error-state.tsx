"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AppButton } from "./app-button";
import { DashboardEmptyState } from "./dashboard-empty-state";

type Props = {
  /** Optional API / network message shown under the title. */
  message?: string | null;
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  /** Fill remaining shell height and center (list pages). Default true. */
  fill?: boolean;
  /** Also apply viewport min-height (standalone detail panes). */
  viewportFill?: boolean;
  compact?: boolean;
  className?: string;
};

/**
 * Centered load/network error for list pages, settings, and detail shells.
 * Use instead of ad-hoc red text when a page fetch fails.
 */
export function DashboardLoadErrorState({
  message,
  title,
  description,
  onRetry,
  retryLabel,
  fill = true,
  viewportFill = false,
  compact = false,
  className,
}: Props) {
  const tList = useTranslations("Dashboard.list");
  const tDetail = useTranslations("Dashboard.common.detail");
  const tActions = useTranslations("Dashboard.common.actions");

  const resolvedTitle = title ?? tDetail("loadErrorTitle");
  const resolvedDescription =
    description ??
    (message?.trim() ? message.trim() : tList("loadErrorDescription"));

  return (
    <DashboardEmptyState
      iconName="error"
      title={resolvedTitle}
      description={resolvedDescription}
      fill={fill}
      viewportFill={viewportFill}
      compact={compact}
      className={className}
      action={
        onRetry ? (
          <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel ?? tActions("retry")}
          </AppButton>
        ) : undefined
      }
    />
  );
}
