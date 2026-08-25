"use client";

import { useTranslations } from "next-intl";
import { AppButton, DashboardEmptyState } from "@/shared/ui";

type Props = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  /** Center in the tab pane and fill available height. */
  fill?: boolean;
  className?: string;
  title?: string;
};

/** Error state inside entity detail `SurfaceShell` — matches empty / not-found UI. */
export function EntityDetailErrorState({
  message,
  retryLabel,
  onRetry,
  fill = false,
  className,
  title,
}: Props) {
  const t = useTranslations("Dashboard.common.detail");

  return (
    <DashboardEmptyState
      iconName="error"
      title={title ?? t("loadErrorTitle")}
      description={message}
      fill={fill}
      compact={!fill}
      className={className}
      action={
        <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </AppButton>
      }
    />
  );
}
