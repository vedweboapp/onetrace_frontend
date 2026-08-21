"use client";

import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import {
  formatVendorTypeLabel,
  vendorTypeBgHex,
  vendorTypeTextHex,
} from "@/features/vendor-types/utils/vendor-type-display.util";
import { cn } from "@/core/utils/http.util";

export function VendorTypeChip({
  row,
  className,
}: {
  row: Pick<VendorType, "id" | "name" | "bg_color" | "text_color">;
  className?: string;
}) {
  const label = formatVendorTypeLabel(row);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex max-w-full truncate rounded-full border border-black/10 px-3 py-1 text-xs font-semibold shadow-sm",
        className,
      )}
      style={{ backgroundColor: vendorTypeBgHex(row), color: vendorTypeTextHex(row) }}
    >
      {label}
    </span>
  );
}
