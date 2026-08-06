import {
  DEFAULT_ORG_CURRENCY,
  orgCurrencyAffix,
  type OrgCurrencySettings,
} from "@/shared/money/org-currency.types";

function formatIntegerPart(integerPart: string, digitSeparator: string): string {
  if (digitSeparator === "12,34,567.89") {
    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherBits = integerPart.substring(0, integerPart.length - 3);
    if (otherBits !== "") lastThree = "," + lastThree;
    return otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  }
  if (digitSeparator === "1.234.567,89") {
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  if (digitSeparator === "1 234 567.89") {
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Format a number using organization currency settings (Company Settings → Currencies). */
export function formatOrgMoney(
  amount: number,
  settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY,
): string {
  if (!Number.isFinite(amount)) return "—";

  const decimals = Number.isFinite(settings.decimalPlaces) ? settings.decimalPlaces : 2;
  const parts = Math.abs(amount).toFixed(decimals).split(".");
  const integerPart = parts[0] ?? "0";
  const fraction = parts[1];

  const formattedInteger = formatIntegerPart(integerPart, settings.digitSeparator);
  const formattedNumber =
    settings.digitSeparator === "1.234.567,89"
      ? formattedInteger + (fraction ? `,${fraction}` : "")
      : formattedInteger + (fraction ? `.${fraction}` : "");

  const signed = amount < 0 ? `-${formattedNumber}` : formattedNumber;
  const affix = orgCurrencyAffix(settings);

  return settings.symbolPosition === "after" ? `${signed} ${affix}` : `${affix} ${signed}`;
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
        ? Number(value)
        : Number.NaN;
  return formatOrgMoney(n, settings);
}
