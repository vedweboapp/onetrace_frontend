"use client";

import { DashboardLoadErrorState } from "@/shared/ui";

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
  return (
    <DashboardLoadErrorState
      message={message}
      title={title}
      retryLabel={retryLabel}
      onRetry={onRetry}
      fill={fill}
      viewportFill={fill}
      compact={!fill}
      className={className}
    />
  );
}
