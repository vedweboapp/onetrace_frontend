import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/core/utils/http.util";

export function FormFieldRow({
  cols = "2",
  from = "md",
  labelTop = false,
  className,
  children,
}: {
  cols?: "1" | "2" | "3";
  /** When two columns kick in (use `xl` beside narrow map columns). */
  from?: "sm" | "md" | "lg" | "xl";
  /** Stack label above control in every cell (e.g. fulfilment subsections). */
  labelTop?: boolean;
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
          labelTop && "form-field-row--label-top",
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
