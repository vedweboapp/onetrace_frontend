import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Slim contextual note below list-page headings (links, reminders) without eating vertical space */
export function ListPageCallout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "mb-4 rounded-lg border border-slate-200/85 bg-slate-50/90 px-3 py-2 text-xs leading-snug text-slate-600 dark:border-slate-800 dark:bg-slate-900/45 dark:text-slate-400",
        className,
      )}
    >
      {children}
    </div>
  );
}
