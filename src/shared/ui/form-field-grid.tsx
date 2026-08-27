import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

/**
 * Zoho-style form row: 2 fields side-by-side when there is room,
 * 1 field per row when the row host is narrow (container query) or below `from`.
 *
 * Prefer `cols="2"` (default) over `cols="1" className="…grid-cols-2"` so
 * `.form-fields-host` container queries can collapse rows on small screens.
 */
export function FormFieldRow({
  cols = "2",
  from = "md",
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
    <div className="form-fields-host">
      <div
        className={cn(
          "form-field-row grid w-full gap-x-8 gap-y-[var(--form-field-row-gap-y,1.625rem)]",
          cols === "1" && "grid-cols-1",
          cols === "2" && twoCol,
          cols === "3" && "grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/** Use inside `FormFieldRow` when one control should span the full logical row. */
export function FormFieldSpanFull({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("col-span-full", className)} {...props} />;
}
