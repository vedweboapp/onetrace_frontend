import { formatOrgMoney, parseOrgMoneyInput } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";

export function parseMoneyValue(raw: unknown): number {
  const n = parseOrgMoneyInput(raw, getOrgCurrencySettings());
  return Number.isFinite(n) ? n : 0;
}

/** Uses organization home currency from Company Settings. */
export function formatMoneyDisplay(amount: number, _locale?: string, _currency?: string): string {
  return formatOrgMoney(amount, getOrgCurrencySettings());
}

export function computeLineAmount(quantity: number, rate: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return 0;
  return quantity * rate;
}
