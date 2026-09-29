import type { MaterialRequestItemRef } from "@/features/material-requests/types/material-request.types";
import { materialRequestLineKey } from "@/features/material-requests/utils/material-request-line-key.util";
import {
  materialRequestDispatchedDisplay,
  materialRequestItemDispatchedQty,
  materialRequestItemGroupName,
  materialRequestItemPendingQty,
  materialRequestItemProductName,
  materialRequestItemRequestedQty,
  materialRequestItemRestockedQty,
  nestedId,
} from "@/features/material-requests/utils/material-request-nested-fields.util";

export type MaterialRequestItemSource = {
  lineKey: string;
  pending: number;
  requested: number;
  alreadyDispatched: number;
};

export type AggregatedMaterialRequestItem = {
  key: string;
  itemId: number;
  materialName: string;
  groupName: string;
  requested: number;
  dispatched: number;
  pending: number;
  restocked: number;
  fulfilled: number;
  surplus: number;
  sources: MaterialRequestItemSource[];
};

export function materialRequestItemProductId(row: MaterialRequestItemRef): number | null {
  const id = nestedId(row.item);
  return id != null && id > 0 ? id : null;
}

export function aggregateMaterialRequestItems(
  items: MaterialRequestItemRef[] | undefined,
): AggregatedMaterialRequestItem[] {
  const map = new Map<number, AggregatedMaterialRequestItem>();

  (items ?? []).forEach((row, index) => {
    const itemId = materialRequestItemProductId(row);
    if (itemId == null) return;

    const requested = materialRequestItemRequestedQty(row);
    const alreadyDispatched = materialRequestItemDispatchedQty(row);
    const pending = materialRequestItemPendingQty(row);
    const restocked = materialRequestItemRestockedQty(row);
    const lineKey = materialRequestLineKey(row, index);
    const source: MaterialRequestItemSource = {
      lineKey,
      pending,
      requested,
      alreadyDispatched,
    };

    const existing = map.get(itemId);
    if (existing) {
      existing.requested += requested;
      existing.dispatched += alreadyDispatched;
      existing.pending += pending;
      existing.restocked += restocked;
      existing.sources.push(source);
    } else {
      map.set(itemId, {
        key: `item-${itemId}`,
        itemId,
        materialName: materialRequestItemProductName(row),
        groupName: materialRequestItemGroupName(row),
        requested,
        dispatched: alreadyDispatched,
        pending,
        restocked,
        fulfilled: 0,
        surplus: 0,
        sources: [source],
      });
    }
  });

  return [...map.values()]
    .map((row) => {
      const display = materialRequestDispatchedDisplay({
        requested_quantity: row.requested,
        dispatched_quantity: row.dispatched,
      } as MaterialRequestItemRef);
      return {
        ...row,
        fulfilled: display.fulfilled,
        surplus: display.surplus,
      };
    })
    .sort((a, b) => a.materialName.localeCompare(b.materialName));
}

export function materialRequestUniqueItemCount(items: MaterialRequestItemRef[] | undefined): number {
  const ids = new Set<number>();
  for (const row of items ?? []) {
    const id = materialRequestItemProductId(row);
    if (id != null) ids.add(id);
  }
  return ids.size;
}

export function allocateMaterialRequestDispatchQuantity(
  sources: MaterialRequestItemSource[],
  totalQty: number,
): Array<{ line_key: string; quantity: number }> {
  const qty = Math.max(0, totalQty);
  if (qty <= 0 || sources.length === 0) return [];

  let remaining = qty;
  const out: Array<{ line_key: string; quantity: number }> = [];

  for (const source of sources) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, Math.max(0, source.pending));
    if (take > 0) {
      out.push({ line_key: source.lineKey, quantity: take });
      remaining -= take;
    }
  }

  if (remaining > 0) {
    const lastKey = sources[sources.length - 1]?.lineKey;
    if (lastKey) {
      const last = out.find((row) => row.line_key === lastKey);
      if (last) last.quantity += remaining;
      else out.push({ line_key: lastKey, quantity: remaining });
    }
  }

  return out;
}
