"use client";

import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import {
  formatVendorTypeLabel,
  vendorTypeBgHex,
  vendorTypeTextHex,
} from "@/features/vendor-types/utils/vendor-type-display.util";
import { cn } from "@/core/utils/http.util";

type VendorTypeChipRow = Pick<VendorType, "id" | "name" | "bg_color" | "text_color">;

export function VendorTypeChip({
  row,
  className,
  truncate,
}: {
  row: VendorTypeChipRow;
  className?: string;
  /** Cap chip width so long labels end with … */
  truncate?: boolean;
}) {
  const label = formatVendorTypeLabel(row);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex items-center rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-semibold shadow-sm",
        truncate ? "max-w-[9.5rem] truncate" : "max-w-full truncate",
        className,
      )}
      style={{ backgroundColor: vendorTypeBgHex(row), color: vendorTypeTextHex(row) }}
    >
      {label}
    </span>
  );
}

/**
 * Compact list cell: first type (ellipsis if long) + `+N` for remaining values.
 */
export function VendorTypeChipGroup({
  rows,
  maxVisible = 1,
  className,
}: {
  rows: VendorTypeChipRow[];
  maxVisible?: number;
  className?: string;
}) {
  if (rows.length === 0) return null;

  const visible = rows.slice(0, Math.max(1, maxVisible));
  const remaining = rows.length - visible.length;
  const fullLabel = rows.map((row) => formatVendorTypeLabel(row)).join(", ");

  return (
    <span
      className={cn("inline-flex min-w-0 max-w-full items-center gap-1.5", className)}
      title={fullLabel}
    >
      {visible.map((row) => (
        <VendorTypeChip key={row.id} row={row} truncate />
      ))}
      {remaining > 0 ? (
        <span className="shrink-0 text-xs font-semibold text-[color:var(--dash-accent,#0f766e)]">
          +{remaining}
        </span>
      ) : null}
    </span>
  );
}
