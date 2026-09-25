"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { DetailEntityLink } from "@/shared/components/entity/detail-entity-link";
import { cn } from "@/core/utils/http.util";

export type EntityLabelOverflowItem = {
  id: string | number;
  label: string;
  href?: string | null;
};

const ITEM_GAP_PX = 6;

function computeVisibleCount(
  availableWidth: number,
  itemWidths: number[],
  overflowWidths: Map<number, number>,
): number {
  if (itemWidths.length === 0 || availableWidth <= 0) return 0;

  let used = 0;
  let count = 0;

  for (let i = 0; i < itemWidths.length; i++) {
    const remainingCount = itemWidths.length - (i + 1);
    const overflowReserve =
      remainingCount > 0 ? (overflowWidths.get(remainingCount) ?? 24) + ITEM_GAP_PX : 0;
    const gap = count > 0 ? ITEM_GAP_PX : 0;
    const nextTotal = used + gap + itemWidths[i] + overflowReserve;

    if (count === 0 || nextTotal <= availableWidth) {
      used += gap + itemWidths[i];
      count++;
      continue;
    }
    break;
  }

  return Math.max(1, Math.min(count, itemWidths.length));
}

function LabelItem({
  item,
  className,
}: {
  item: EntityLabelOverflowItem;
  className?: string;
}) {
  const href = item.href?.trim();
  if (href) {
    return (
      <DetailEntityLink
        href={href}
        className={cn("min-w-0 truncate font-medium", className)}
        onClick={(e) => e.stopPropagation()}
        title={item.label}
      >
        {item.label}
      </DetailEntityLink>
    );
  }
  return (
    <span className={cn("min-w-0 truncate", className)} title={item.label}>
      {item.label}
    </span>
  );
}

/**
 * Compact list cell for multiple related labels: show what fits, then grey `+N`.
 * Same overflow idea as vendor-type chips, for plain text / entity links.
 */
export function EntityLabelOverflowGroup({
  items,
  maxVisible,
  className,
  empty = "—",
  separator = ",",
}: {
  items: EntityLabelOverflowItem[];
  maxVisible?: number;
  className?: string;
  empty?: ReactNode;
  separator?: string;
}) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);
  const [visibleCount, setVisibleCount] = useState(() => Math.min(items.length, maxVisible ?? 2));

  const fullLabel = items.map((item) => item.label).join(", ");

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRoot = measureRef.current;
    if (!container || !measureRoot || items.length === 0) return;

    const recompute = () => {
      const available = container.clientWidth;
      if (available <= 0) return;

      const itemNodes = measureRoot.querySelectorAll<HTMLElement>("[data-entity-label-item]");
      const itemWidths = Array.from(itemNodes, (node) => node.offsetWidth);
      if (itemWidths.length === 0) return;

      const overflowWidths = new Map<number, number>();
      measureRoot.querySelectorAll<HTMLElement>("[data-entity-label-overflow]").forEach((node) => {
        const count = Number(node.dataset.entityLabelOverflow);
        if (Number.isFinite(count)) overflowWidths.set(count, node.offsetWidth);
      });

      const next = computeVisibleCount(available, itemWidths, overflowWidths);
      const capped = maxVisible != null ? Math.min(next, maxVisible) : next;
      setVisibleCount((prev) => (prev === capped ? prev : capped));
    };

    const observer = new ResizeObserver(recompute);
    observer.observe(container);
    recompute();

    return () => observer.disconnect();
  }, [items, maxVisible]);

  if (items.length === 0) {
    return <span className={cn("text-slate-400 dark:text-slate-500", className)}>{empty}</span>;
  }

  const visible = items.slice(0, visibleCount);
  const remaining = items.length - visible.length;

  return (
    <>
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible fixed left-0 top-0 -z-50 opacity-0"
      >
        <span className="inline-flex items-center gap-1.5">
          {items.map((item) => (
            <span key={item.id} data-entity-label-item className="inline-flex max-w-[12rem]">
              <LabelItem item={item} />
              <span>{separator}</span>
            </span>
          ))}
        </span>
        {Array.from({ length: items.length - 1 }, (_, index) => {
          const overflowCount = items.length - (index + 1);
          return (
            <span
              key={overflowCount}
              data-entity-label-overflow={overflowCount}
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
        {visible.map((item, index) => (
          <span key={item.id} className="inline-flex min-w-0 max-w-full items-center gap-1.5">
            <LabelItem item={item} className={visible.length > 1 ? "max-w-[9.5rem]" : undefined} />
            {index < visible.length - 1 || remaining > 0 ? (
              <span className="shrink-0 text-slate-400" aria-hidden>
                {separator}
              </span>
            ) : null}
          </span>
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
