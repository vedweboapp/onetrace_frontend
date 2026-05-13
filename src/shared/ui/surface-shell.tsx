import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

export function SurfaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm",
        "ring-1 ring-slate-950/[0.03] dark:border-slate-800 dark:bg-slate-950 dark:ring-white/[0.04]",
        className,
      )}
    >
      {children}
    </div>
  );
}
