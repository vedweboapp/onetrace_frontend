import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/** Responsive registry row: stacks on xs, `{2}` cols from `sm` (or later), `{3}` from `lg` when requested. */
export function FormFieldRow({
  cols = "2",
  from = "sm",
  className,
  children,
}: {
  cols?: "1" | "2" | "3";
  /** When two columns kick in (use `xl` beside narrow map columns). */
  from?: "sm" | "md" | "lg" | "xl";
  className?: string;
  children: ReactNode;
}) {
  const twoCol =
    from === "xl"
      ? "grid-cols-1 xl:grid-cols-2"
      : from === "lg"
        ? "grid-cols-1 lg:grid-cols-2"
        : from === "md"
          ? "grid-cols-1 md:grid-cols-2"
          : "grid-cols-1 sm:grid-cols-2";

  return (
    <div
      className={cn(
        "form-field-row grid w-full gap-x-5 gap-y-4",
        cols === "1" && "grid-cols-1",
        cols === "2" && twoCol,
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
  return <div className={cn("col-span-full sm:col-span-2 lg:col-span-2", className)} {...props} />;
}
