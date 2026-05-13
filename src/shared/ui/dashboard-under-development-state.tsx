import { Hammer } from "lucide-react";
import { cn } from "@/core/utils/http.util";

type DashboardUnderDevelopmentStateProps = {
  title: string;
  description: string;
  className?: string;
};

export function DashboardUnderDevelopmentState({
  title,
  description,
  className,
}: DashboardUnderDevelopmentStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-[420px] flex-col items-center justify-center rounded-2xl bg-slate-50/45 px-6 text-center dark:bg-slate-900/25",
        className,
      )}
    >
      <div className="mb-5 inline-flex size-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
        <Hammer className="size-6" strokeWidth={1.7} />
      </div>

      <h3 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>

      <div className="mt-7 space-y-2.5">
        <div className="h-3 w-36 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-28 rounded-full bg-slate-100 dark:bg-slate-800" />
        <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-slate-800" />
      </div>
    </div>
  );
}

