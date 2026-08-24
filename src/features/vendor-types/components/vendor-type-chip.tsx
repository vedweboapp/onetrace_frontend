"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { VendorType } from "@/features/vendor-types/types/vendor-type.types";
import {
  formatVendorTypeLabel,
  vendorTypeBgHex,
  vendorTypeTextHex,
} from "@/features/vendor-types/utils/vendor-type-display.util";
import { cn } from "@/core/utils/http.util";

type VendorTypeChipRow = Pick<VendorType, "id" | "name" | "bg_color" | "text_color">;

const CHIP_GAP_PX = 6;

export function VendorTypeChip({
  row,
  className,
  truncate,
  fill,
}: {
  row: VendorTypeChipRow;
  className?: string;
  /** Cap chip width so long labels end with … */
  truncate?: boolean;
  /** Grow to use remaining row space (list cells with +N overflow). */
  fill?: boolean;
}) {
  const label = formatVendorTypeLabel(row);
  return (
    <span
      title={label}
      className={cn(
        "inline-flex min-w-0 items-center rounded-full border border-black/10 px-2.5 py-0.5 text-xs font-semibold shadow-sm",
        truncate && fill && "max-w-none flex-1 truncate",
        truncate && !fill && "max-w-[9.5rem] shrink truncate",
        !truncate && "max-w-full truncate",
        className,
      )}
      style={{ backgroundColor: vendorTypeBgHex(row), color: vendorTypeTextHex(row) }}
    >
      {label}
    </span>
  );
}

function computeVisibleChipCount(
  availableWidth: number,
  chipWidths: number[],
  overflowWidths: Map<number, number>,
): number {
  if (chipWidths.length === 0 || availableWidth <= 0) return 0;

  let used = 0;
  let count = 0;

  for (let i = 0; i < chipWidths.length; i++) {
    const remainingCount = chipWidths.length - (i + 1);
    const overflowReserve =
      remainingCount > 0 ? (overflowWidths.get(remainingCount) ?? 24) + CHIP_GAP_PX : 0;
    const gap = count > 0 ? CHIP_GAP_PX : 0;
    const nextTotal = used + gap + chipWidths[i] + overflowReserve;

    if (count === 0 || nextTotal <= availableWidth) {
      used += gap + chipWidths[i];
      count++;
      continue;
    }
    break;
  }

  return Math.max(1, Math.min(count, chipWidths.length));
}

/**
 * Compact list cell: show as many types as fit in the column (1–2+), then `+N` for the rest.
 */
export function VendorTypeChipGroup({
  rows,
  maxVisible,
  className,
}: {
  rows: VendorTypeChipRow[];
  maxVisible?: number;
  className?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(rows.length, maxVisible ?? 2));

  const fullLabel = rows.map((row) => formatVendorTypeLabel(row)).join(", ");

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRoot = measureRef.current;
    if (!container || !measureRoot || rows.length === 0) return;

    const recompute = () => {
      const available = container.clientWidth;
      if (available <= 0) return;

      const chipNodes = measureRoot.querySelectorAll<HTMLElement>("[data-vendor-type-chip]");
      const chipWidths = Array.from(chipNodes, (node) => node.offsetWidth);
      if (chipWidths.length === 0) return;

      const overflowWidths = new Map<number, number>();
      measureRoot.querySelectorAll<HTMLElement>("[data-vendor-type-overflow]").forEach((node) => {
        const count = Number(node.dataset.vendorTypeOverflow);
        if (Number.isFinite(count)) overflowWidths.set(count, node.offsetWidth);
      });

      const next = computeVisibleChipCount(available, chipWidths, overflowWidths);
      const capped = maxVisible != null ? Math.min(next, maxVisible) : next;
      setVisibleCount((prev) => (prev === capped ? prev : capped));
    };

    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    recompute();

    return () => observer.disconnect();
  }, [rows, maxVisible]);

  if (rows.length === 0) return null;

  const visible = rows.slice(0, visibleCount);
  const remaining = rows.length - visible.length;
  const singleExpanded = visible.length === 1 && remaining > 0;

  return (
    <>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 -z-50 opacity-0"
      >
        <span className="inline-flex items-center gap-1.5">
          {rows.map((row) => (
            <span key={row.id} data-vendor-type-chip className="inline-flex">
              <VendorTypeChip row={row} truncate />
            </span>
          ))}
        </span>
        {Array.from({ length: rows.length - 1 }, (_, index) => {
          const overflowCount = rows.length - (index + 1);
          return (
            <span
              key={overflowCount}
              data-vendor-type-overflow={overflowCount}
              className="inline-flex shrink-0 text-xs font-semibold"
            >
              +{overflowCount}
            </span>
          );
        })}
      </span>
      <span
        ref={containerRef}
        className={cn("flex w-full min-w-0 items-center gap-1.5 overflow-hidden", className)}
        title={fullLabel}
      >
        {visible.map((row) => (
          <VendorTypeChip
            key={row.id}
            row={row}
            truncate
            fill={singleExpanded}
            className={visible.length > 1 ? "basis-0 flex-1" : undefined}
          />
        ))}
        {remaining > 0 ? (
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            +{remaining}
          </span>
        ) : null}
      </span>
    </>
  );
}
