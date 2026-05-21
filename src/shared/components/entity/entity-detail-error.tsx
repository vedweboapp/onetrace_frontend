"use client";

import { AppButton } from "@/shared/ui";

type Props = {
  message: string;
  retryLabel: string;
  onRetry: () => void;
};

/** Error state inside entity detail `SurfaceShell`. */
export function EntityDetailErrorState({ message, retryLabel, onRetry }: Props) {
  return (
    <div className="space-y-4 p-4 sm:p-6">
      <p className="text-sm text-red-600 dark:text-red-400">{message}</p>
      <AppButton type="button" variant="secondary" size="sm" onClick={onRetry}>
        {retryLabel}
      </AppButton>
    </div>
  );
}
