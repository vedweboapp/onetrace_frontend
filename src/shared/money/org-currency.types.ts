export type OrgCurrencyFormatType = "symbol" | "code";
export type OrgCurrencySymbolPosition = "before" | "after";

export type OrgCurrencySettings = {
  currencyCode: string;
  currencyName: string;
  formatType: OrgCurrencyFormatType;
  symbol: string;
  symbolPosition: OrgCurrencySymbolPosition;
  digitSeparator: string;
  decimalPlaces: number;
};

export const DEFAULT_ORG_CURRENCY: OrgCurrencySettings = {
  currencyCode: "INR",
  currencyName: "Indian Rupee",
  formatType: "symbol",
  symbol: "₹",
  symbolPosition: "before",
  digitSeparator: "1,234,567.89",
  decimalPlaces: 2,
};

export function normalizeOrgCurrencySettings(
  partial: Partial<OrgCurrencySettings> | null | undefined,
): OrgCurrencySettings {
  const formatType =
    partial?.formatType === "code" || partial?.formatType === "symbol"
      ? partial.formatType
      : DEFAULT_ORG_CURRENCY.formatType;
  const symbolPosition =
    partial?.symbolPosition === "after" || partial?.symbolPosition === "before"
      ? partial.symbolPosition
      : DEFAULT_ORG_CURRENCY.symbolPosition;
  const decimalPlaces =
    typeof partial?.decimalPlaces === "number" && Number.isFinite(partial.decimalPlaces)
      ? Math.max(0, Math.min(6, Math.trunc(partial.decimalPlaces)))
      : DEFAULT_ORG_CURRENCY.decimalPlaces;

  return {
    currencyCode: (partial?.currencyCode ?? DEFAULT_ORG_CURRENCY.currencyCode).trim() || DEFAULT_ORG_CURRENCY.currencyCode,
    currencyName: (partial?.currencyName ?? DEFAULT_ORG_CURRENCY.currencyName).trim() || DEFAULT_ORG_CURRENCY.currencyName,
    formatType,
    symbol: (partial?.symbol ?? DEFAULT_ORG_CURRENCY.symbol).trim() || DEFAULT_ORG_CURRENCY.symbol,
    symbolPosition,
    digitSeparator: (partial?.digitSeparator ?? DEFAULT_ORG_CURRENCY.digitSeparator).trim() || DEFAULT_ORG_CURRENCY.digitSeparator,
    decimalPlaces,
  };
}

/** Affix text shown next to amount inputs (symbol or currency code). */
export function orgCurrencyAffix(settings: OrgCurrencySettings = DEFAULT_ORG_CURRENCY): string {
  return settings.formatType === "code" ? settings.currencyCode : settings.symbol;
}
