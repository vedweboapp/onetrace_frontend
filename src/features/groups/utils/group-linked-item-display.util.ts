import type { CompositeItem } from "@/features/composite-items/types/composite-item.types";
import type { GroupItemRef } from "@/features/groups/types/group.types";
import { formatOrgMoneyValue } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

export function moneyDisplay(v: unknown): string {
  return formatOrgMoneyValue(v, getOrgCurrencySettings());
}

export function groupLinkedItemDisplayName(entry: GroupItemRef, composite?: CompositeItem): string {
  const name = entry.item_name ?? composite?.name ?? `#${entry.item}`;
  const abbr = entry.abbreviation?.trim();
  return abbr ? `${name} (${abbr})` : name;
}

export function groupLinkedItemStatsLine(composite?: CompositeItem): string {
  if (!composite) return "";
  const parts: string[] = [];
  if (composite.quantity != null) parts.push(`Qty ${composite.quantity}`);
  const cost = moneyDisplay(composite.cost_price);
  if (cost !== "—") parts.push(`Cost ${cost}`);
  const sell = moneyDisplay(composite.selling_price);
  if (sell !== "—") parts.push(`Sell ${sell}`);
  const componentCount = composite.components?.length ?? 0;
  parts.push(`${componentCount} cmp`);
  return parts.join(" · ");
}

export function groupLinkedItemsNamesSummary(
  items: GroupItemRef[],
  compositeById: Map<number, CompositeItem>,
): string {
  if (!items.length) return "—";
  return items.map((entry) => groupLinkedItemDisplayName(entry, compositeById.get(entry.item))).join(", ");
}

export function groupLinkedItemsSummaryText(
  items: GroupItemRef[],
  compositeById: Map<number, CompositeItem>,
  maxItems?: number,
): string {
  if (!items.length) return "—";
  const limit = maxItems ?? items.length;
  const lines = items.slice(0, limit).map((entry) => {
    const composite = compositeById.get(entry.item);
    const name = groupLinkedItemDisplayName(entry, composite);
    const stats = groupLinkedItemStatsLine(composite);
    return stats ? `${name} — ${stats}` : name;
  });
  if (items.length > limit) {
    lines.push(`+${items.length - limit} more`);
  }
  return lines.join(" · ");
}
