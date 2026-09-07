import type { DispatchDetail, DispatchLineItem, DispatchReturnItem } from "@/features/dispatches/types/dispatch.types";

export type DispatchReturnSourceLine = {
  line_id: number;
  returnable_quantity: number;
};

export type AggregatedDispatchLine = {
  key: string;
  itemId: number;
  itemName: string;
  isExtra: boolean;
  requested: number;
  pending: number;
  dispatched: number;
  extraQuantity: number;
  restocked: number;
  fulfilled: number;
  surplus: number;
};

export type AggregatedDispatchReturnLine = {
  group_key: string;
  item_id: number;
  item_name: string | null;
  is_extra: boolean;
  dispatched_quantity: number;
  returned_quantity: number;
  returnable_quantity: number;
  sources: DispatchReturnSourceLine[];
};

function dispatchLineItemName(line: DispatchLineItem): string {
  return line.item.name?.trim() || `#${line.item.id}`;
}

/** Extra units on a dispatch line: full qty for extra lines, surplus otherwise. */
export function extraQuantityPool(line: DispatchLineItem): number {
  if (line.is_extra) return line.dispatched_quantity;
  return line.extra_quantity;
}

export function isLineReturnableAsExtra(line: DispatchLineItem): boolean {
  return line.is_extra || line.extra_quantity > 0;
}

export function extraReturnedForLine(line: DispatchLineItem): number {
  const extraPool = extraQuantityPool(line);
  if (extraPool <= 0) return 0;
  return Math.min(line.restocked_quantity, extraPool);
}

export function extraReturnableForLine(line: DispatchLineItem, pendingQty = 0): number {
  const extraPool = extraQuantityPool(line);
  if (extraPool <= 0) return 0;
  const gross = Math.max(0, line.dispatched_quantity - line.restocked_quantity);
  const lineReturnable = Math.min(gross, extraPool);
  return Math.max(0, lineReturnable - pendingQty);
}

export function aggregateDispatchDetailLines(lines: DispatchLineItem[]): AggregatedDispatchLine[] {
  const map = new Map<string, AggregatedDispatchLine>();

  for (const line of lines) {
    const key = line.is_extra ? `extra:item:${line.item.id}` : `item:${line.item.id}`;
    const fulfilled = Math.max(0, line.dispatched_quantity - line.extra_quantity);
    const existing = map.get(key);

    if (existing) {
      existing.requested += line.requested_quantity;
      existing.pending += line.pending_quantity;
      existing.dispatched += line.dispatched_quantity;
      existing.extraQuantity += line.extra_quantity;
      existing.restocked += line.restocked_quantity;
      existing.fulfilled += fulfilled;
      existing.surplus += line.extra_quantity;
    } else {
      map.set(key, {
        key,
        itemId: line.item.id,
        itemName: dispatchLineItemName(line),
        isExtra: line.is_extra,
        requested: line.requested_quantity,
        pending: line.pending_quantity,
        dispatched: line.dispatched_quantity,
        extraQuantity: line.extra_quantity,
        restocked: line.restocked_quantity,
        fulfilled,
        surplus: line.extra_quantity,
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.isExtra !== b.isExtra) return a.isExtra ? 1 : -1;
    return a.itemName.localeCompare(b.itemName);
  });
}

export function aggregateDispatchReturnLines(detail: DispatchDetail): AggregatedDispatchReturnLine[] {
  const map = new Map<string, AggregatedDispatchReturnLine>();

  for (const line of detail.lines) {
    if (!isLineReturnableAsExtra(line)) continue;
    const returnable = extraReturnableForLine(line);
    if (returnable <= 0) continue;

    const extraPool = extraQuantityPool(line);
    const extraReturned = extraReturnedForLine(line);
    const groupKey = line.is_extra ? `extra:item:${line.item.id}` : `item:${line.item.id}`;
    const source: DispatchReturnSourceLine = { line_id: line.id, returnable_quantity: returnable };
    const existing = map.get(groupKey);

    if (existing) {
      existing.dispatched_quantity += extraPool;
      existing.returned_quantity += extraReturned;
      existing.returnable_quantity += returnable;
      existing.sources.push(source);
    } else {
      map.set(groupKey, {
        group_key: groupKey,
        item_id: line.item.id,
        item_name: dispatchLineItemName(line),
        is_extra: line.is_extra,
        dispatched_quantity: extraPool,
        returned_quantity: extraReturned,
        returnable_quantity: returnable,
        sources: [source],
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    if (a.is_extra !== b.is_extra) return a.is_extra ? 1 : -1;
    return (a.item_name ?? "").localeCompare(b.item_name ?? "");
  });
}

export function aggregatedDispatchReturnLinesToApi(
  rows: AggregatedDispatchReturnLine[],
): DispatchReturnItem[] {
  return rows.map((row) => ({
    line_id: row.sources[0]?.line_id ?? 0,
    item_id: row.item_id,
    item_name: row.item_name,
    job_name: null,
    worker_name: null,
    dispatched_quantity: row.dispatched_quantity,
    returned_quantity: row.returned_quantity,
    returnable_quantity: row.returnable_quantity,
    is_extra: row.is_extra,
    group_key: row.group_key,
    sources: row.sources,
  }));
}

export function allocateReturnQuantityAcrossDispatchLines(
  sources: DispatchReturnSourceLine[],
  quantity: number,
): Array<{ line_id: number; quantity: number }> {
  let remaining = Math.min(
    quantity,
    sources.reduce((sum, row) => sum + row.returnable_quantity, 0),
  );
  if (remaining <= 0) return [];

  const out: Array<{ line_id: number; quantity: number }> = [];
  for (const source of sources) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, source.returnable_quantity);
    if (take > 0) {
      out.push({ line_id: source.line_id, quantity: take });
      remaining -= take;
    }
  }
  return out;
}
