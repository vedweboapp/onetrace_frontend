import { cn } from "@/core/utils/http.util";

type Props = {
  count: number;
  className?: string;
};

export function DetailSectionCountBadge({ count, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex min-w-[1.375rem] items-center justify-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300",
        className,
      )}
    >
      {count}
    </span>
  );
}
