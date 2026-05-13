import { cn } from "@/core/utils/http.util";

export const formAlertClassName = cn(
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
  "dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200",
);

export const formAlertClassNameLight = cn(
  "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700",
);

export const authCardClassName = cn(
  "w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white p-8 sm:p-10",
  "shadow-[0_1px_3px_rgba(15,23,42,0.06),0_8px_24px_rgba(15,23,42,0.06)]",
  "dark:border-slate-800 dark:bg-slate-950 dark:shadow-[0_1px_3px_rgba(0,0,0,0.3),0_8px_24px_rgba(0,0,0,0.25)]",
);
