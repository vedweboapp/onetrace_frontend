import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";
import { dashboardListTableShellClassName } from "@/shared/config/dashboard-shell";
import { surfaceBorderClassName } from "@/shared/config/design-tokens";

export type SurfaceShellVariant = "elevated" | "flat" | "list";

const variantClassNames: Record<SurfaceShellVariant, string> = {
  elevated: cn(
    "rounded-2xl bg-white shadow-sm ring-1 ring-slate-950/[0.03]",
    surfaceBorderClassName,
    "dark:bg-slate-950 dark:ring-white/[0.04]",
  ),
  flat: cn("rounded-xl bg-white shadow-none ring-0", surfaceBorderClassName, "dark:bg-slate-950"),
  list: cn(
    "rounded-lg bg-white shadow-none ring-0",
    surfaceBorderClassName,
    "dark:bg-slate-950",
    dashboardListTableShellClassName,
  ),
};

export function SurfaceShell({
  children,
  className,
  variant = "elevated",
}: {
  children: ReactNode;
  className?: string;
  variant?: SurfaceShellVariant;
}) {
  return (
    <div className={cn("overflow-hidden", variantClassNames[variant], className)}>
      {children}
    </div>
  );
}
