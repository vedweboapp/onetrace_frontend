import { parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

type ItemLike = {
  selling_price?: string | number | null;
};

/** Selling price (SP) for customer-facing line pricing — never cost price. */
export function parseItemSellingPrice(raw: unknown): number {
  const n = parseOrgMoneyInput(raw, getOrgCurrencySettings());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Catalog SP string for form inputs when an item/composite is selected. */
export function catalogSellingPriceString(item: ItemLike | null | undefined): string {
  if (!item) return "";
  const sp = item.selling_price;
  if (sp == null || String(sp).trim() === "") return "";
  return String(sp);
}

/** Catalog SP as a number for totals and line calculations. */
export function catalogSellingPriceNumber(item: ItemLike | null | undefined): number {
  return parseItemSellingPrice(item?.selling_price);
}
