"use client";

import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { GroupItemRef } from "@/features/groups/types/group.types";
import {
  groupLinkedItemDisplayName,
  groupLinkedItemStatsLine,
} from "@/features/groups/utils/group-linked-item-display.util";

type Props = {
  items: GroupItemRef[] | undefined;
  compositeById: Map<number, CompositeItem>;
  maxItems?: number;
  moreLabel?: (count: number) => string;
};

export function GroupLinkedItemsCell({ items, compositeById, maxItems, moreLabel }: Props) {
  if (!items?.length) {
    return <span className="text-slate-500 dark:text-slate-400">—</span>;
  }

  const limit = maxItems ?? items.length;
  const shown = items.slice(0, limit);
  const remaining = items.length - shown.length;

  return (
    <ul className="min-w-0 space-y-1.5 text-sm">
      {shown.map((entry, index) => {
        const composite = compositeById.get(entry.item);
        const stats = groupLinkedItemStatsLine(composite);
        return (
          <li key={`${entry.item}-${entry.id ?? index}`} className="min-w-0 leading-snug">
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {groupLinkedItemDisplayName(entry, composite)}
            </span>
            {stats ? (
              <span className="mt-0.5 block text-xs tabular-nums text-slate-500 dark:text-slate-400">{stats}</span>
            ) : null}
          </li>
        );
      })}
      {remaining > 0 ? (
        <li className="text-xs text-slate-500 dark:text-slate-400">
          {moreLabel ? moreLabel(remaining) : `+${remaining} more`}
        </li>
      ) : null}
    </ul>
  );
}
