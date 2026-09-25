import {
  DEFAULT_ORG_CURRENCY,
  orgCurrencyAffix,
  type OrgCurrencySettings,
} from "@/shared/money/org-currency.types";
import {
  formatGroupedNumber,
  groupedDecimalSeparator,
  parseGroupedNumber,
  sanitizeGroupedNumberDraft,
} from "@/shared/number/digit-grouping.util";

/** Decimal mark from Company Settings → Currencies digit grouping. */
export function orgMoneyDecimalSeparator(settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY): "." | "," {
  return groupedDecimalSeparator(settings.digitSeparator);
}

/** Amount only (grouping + decimals), no currency symbol/code. */
export function formatOrgMoneyNumber(
  amount: number,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): string {
  if (!Number.isFinite(amount)) return "";
  const decimals = Number.isFinite(settings.decimalPlaces) ? settings.decimalPlaces : 2;
  return formatGroupedNumber(amount, decimals, settings.digitSeparator);
}

/** Format a number using organization currency settings (Company Settings → Currencies). */
export function formatOrgMoney(
  amount: number,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): string {
  if (!Number.isFinite(amount)) return "—";

  const signed = formatOrgMoneyNumber(amount, settings);
  const affix = orgCurrencyAffix(settings);

  return settings.symbolPosition === "after" ? `${signed} ${affix}` : `${affix} ${signed}`;
}

/**
 * Parse a typed/pasted amount using org grouping and decimal separators.
 * Returns NaN when empty or invalid.
 */
export function parseOrgMoneyInput(
  raw: unknown,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): number {
  return parseGroupedNumber(raw, settings.digitSeparator);
}

export function parseOrgMoneyOrNull(
  raw: unknown,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): number | null {
  const n = parseOrgMoneyInput(raw, settings);
  return Number.isFinite(n) ? n : null;
}

/** Keep digits, one decimal mark, grouping chars, and an optional leading minus. */
export function sanitizeOrgMoneyDraft(raw: string, settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY): string {
  return sanitizeGroupedNumberDraft(raw, settings.digitSeparator, true);
}

export function toCanonicalMoneyString(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return String(amount);
}

/** Coerce API/unknown values then format with org currency. */
export function formatOrgMoneyValue(
  value: unknown,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): string {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? parseOrgMoneyInput(value, settings)
        : Number.NaN;
  return formatOrgMoney(n, settings);
}
