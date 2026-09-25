import type { ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Section heading on its own row; fields stack below (use with FormFieldRow). */
export function FormSubsection({
  title,
  children,
  className,
}: {
  title: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3 pt-1", className)}>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      {children}
    </section>
  );
}
