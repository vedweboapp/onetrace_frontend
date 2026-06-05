import { cn } from "@/core/utils/http.util";

/** Centered quantity column header (requested, dispatched, pending, etc.). */
export const quantityTableHeaderClass = "px-3 py-2 text-center w-32 whitespace-nowrap";

/** Centered quantity cell with tabular numbers. */
export const quantityTableCellClass = "px-3 py-3 text-center whitespace-nowrap tabular-nums";

/** Centered cell for quantity inputs (return qty, dispatch now). */
export const quantityTableInputCellClass = "px-3 py-3 text-center whitespace-nowrap";

type QuantityWithUnitsProps = {
  value: number;
  unitsLabel: string;
  className?: string;
  showDashWhenZero?: boolean;
};

export function QuantityWithUnits({
  value,
  unitsLabel,
  className,
  showDashWhenZero = false,
}: QuantityWithUnitsProps) {
  if (showDashWhenZero && value <= 0) {
    return <span className={cn("text-slate-500", className)}>—</span>;
  }
  return (
    <span className={cn("tabular-nums", className)}>
      {value.toFixed(0)} {unitsLabel}
    </span>
  );
}
