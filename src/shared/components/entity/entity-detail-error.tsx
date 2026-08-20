"use client";

import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { detailTabFillStateClassName } from "@/shared/components/layout/detail-tab-layout";

type Props = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
  /** Center in the tab pane and fill available height. */
  fill?: boolean;
  className?: string;
};

/** Error state inside entity detail `SurfaceShell`. */
export function EntityDetailErrorState({
  message,
  retryLabel,
  onRetry,
  fill = false,
  className,
}: Props) {
  if (fill) {
    return (
      <div className={cn(detailTabFillStateClassName, "gap-4", className)}>
        <p className="max-w-md text-sm text-red-600 dark:text-red-400">{message}</p>
        <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
          {retryLabel}
        </AppButton>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 p-4 sm:p-6", className)}>
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </AppButton>
    </div>
  );
}
