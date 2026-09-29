import type { Item } from "@/features/items/types/item.types";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

export type CompositeComponentPriceRow = {
  child_item: string;
  quantity: string;
};

export function formatCompositePriceInput(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) return "0";
  const decimals = getOrgCurrencySettings().decimalPlaces;
  return Number(amount.toFixed(decimals)).toString();
}

/** Sum of component (item price × quantity) for composite cost / selling defaults. */
export function sumCompositeComponentPrices(
  rows: CompositeComponentPriceRow[],
  items: Pick<Item, "id" | "cost_price" | "selling_price">[],
): { cost: number; sell: number } {
  const byId = new Map(items.map((item) => [item.id, item]));
  let cost = 0;
  let sell = 0;
  for (const row of rows) {
    const id = Number.parseInt(row.child_item, 10);
    if (!Number.isFinite(id) || id <= 0) continue;
    const item = byId.get(id);
    if (!item) continue;
    const qtyRaw = Number.parseFloat(row.quantity);
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? qtyRaw : 0;
    const itemCost = Number(item.cost_price);
    const itemSell = Number(item.selling_price);
    if (Number.isFinite(itemCost)) cost += itemCost * qty;
    if (Number.isFinite(itemSell)) sell += itemSell * qty;
  }
  return { cost, sell };
}
