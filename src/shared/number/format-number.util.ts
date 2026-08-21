import {
  DEFAULT_ORG_NUMBER_FORMAT,
  formatGroupedNumber,
  normalizeOrgNumberFormat,
  parseGroupedNumber,
} from "@/shared/number/digit-grouping.util";

export function formatOrgNumber(
  amount: number,
  decimalPlaces = 2,
  numberFormat: string = DEFAULT_ORG_NUMBER_FORMAT,
): string {
  if (!Number.isFinite(amount)) return "—";
  return formatGroupedNumber(amount, decimalPlaces, normalizeOrgNumberFormat(numberFormat));
}

export function formatOrgQuantity(
  value: unknown,
  numberFormat: string = DEFAULT_ORG_NUMBER_FORMAT,
): string {
  const format = normalizeOrgNumberFormat(numberFormat);
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? parseGroupedNumber(value, format)
        : Number.NaN;
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n * 10000) / 10000;
  const decimals = Number.isInteger(rounded) ? 0 : 2;
  return formatGroupedNumber(rounded, decimals, format);
}

export function formatOrgNumberValue(
  value: unknown,
  decimalPlaces = 2,
  numberFormat: string = DEFAULT_ORG_NUMBER_FORMAT,
): string {
  const format = normalizeOrgNumberFormat(numberFormat);
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? parseGroupedNumber(value, format)
        : Number.NaN;
  return formatOrgNumber(n, decimalPlaces, format);
}

export function parseOrgNumberInput(raw: unknown, numberFormat: string = DEFAULT_ORG_NUMBER_FORMAT): number {
  return parseGroupedNumber(raw, normalizeOrgNumberFormat(numberFormat));
}

export function parseOrgNumberOrNull(raw: unknown, numberFormat: string = DEFAULT_ORG_NUMBER_FORMAT): number | null {
  const n = parseOrgNumberInput(raw, numberFormat);
  return Number.isFinite(n) ? n : null;
}
