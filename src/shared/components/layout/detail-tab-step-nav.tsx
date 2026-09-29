"use client";

import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type Props = {
  onPrev?: () => void;
  onNext?: () => void;
  prevLabel?: string;
  nextLabel?: string;
  className?: string;
};

/** Stacked prev / next actions at the bottom of a detail tab (previous above next). */
export function DetailTabStepNav({ onPrev, onNext, prevLabel = "Previous", nextLabel = "Next", className }: Props) {
  if (!onPrev && !onNext) return null;

  return (
    <div
      className={cn(
        "mt-8 flex flex-col items-stretch gap-2 border-t border-slate-200 pt-6 dark:border-slate-800 sm:items-end",
        className,
      )}
    >
      {onPrev ? (
        <AppButton type="button" variant="secondary" size="sm" className="w-full sm:w-auto sm:min-w-[11rem]" onClick={onPrev}>
          {prevLabel}
        </AppButton>
      ) : null}
      {onNext ? (
        <AppButton type="button" variant="primary" size="sm" className="w-full sm:w-auto sm:min-w-[11rem]" onClick={onNext}>
          {nextLabel}
        </AppButton>
      ) : null}
    </div>
  );
}
