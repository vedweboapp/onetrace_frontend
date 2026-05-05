import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Responsive registry row: stacks on xs, `{2}` cols from `sm`, `{3}` from `lg` when requested. */
export function FormFieldRow({
  cols = "2",
  className,
  children,
}: {
  cols?: "1" | "2" | "3";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === "1" && "grid-cols-1",
        cols === "2" && "grid-cols-1 sm:grid-cols-2",
        cols === "3" && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Use inside `FormFieldRow` when one control should span the full logical row. */
export function FormFieldSpanFull({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("sm:col-span-2 lg:col-span-3", className)} {...props} />;
}
