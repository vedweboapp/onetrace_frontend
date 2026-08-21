export const ORG_NUMBER_FORMATS = [
  "1,234,567.89",
  "12,34,567.89",
  "1.234.567,89",
  "1 234 567.89",
] as const;

export type OrgNumberFormat = (typeof ORG_NUMBER_FORMATS)[number];

export const DEFAULT_ORG_NUMBER_FORMAT: OrgNumberFormat = "1,234,567.89";

export function normalizeOrgNumberFormat(raw?: string | null): OrgNumberFormat {
  const trimmed = raw?.trim() ?? "";
  return (ORG_NUMBER_FORMATS as readonly string[]).includes(trimmed)
    ? (trimmed as OrgNumberFormat)
    : DEFAULT_ORG_NUMBER_FORMAT;
}

export function groupedDecimalSeparator(format: string): "." | "," {
  return format === "1.234.567,89" ? "," : ".";
}

export function groupedGroupingSeparator(format: string): string {
  if (format === "1.234.567,89") return ".";
  if (format === "1 234 567.89") return " ";
  return ",";
}

export function formatGroupedInteger(integerPart: string, format: string): string {
  if (format === "12,34,567.89") {
    let lastThree = integerPart.substring(integerPart.length - 3);
    const otherBits = integerPart.substring(0, integerPart.length - 3);
    if (otherBits !== "") lastThree = "," + lastThree;
    return otherBits.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  }
  if (format === "1.234.567,89") {
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }
  if (format === "1 234 567.89") {
    return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  }
  return integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function formatGroupedNumber(amount: number, decimalPlaces: number, format: string): string {
  if (!Number.isFinite(amount)) return "";
  const decimals = Number.isFinite(decimalPlaces) ? Math.max(0, Math.min(8, Math.trunc(decimalPlaces))) : 0;
  const parts = Math.abs(amount).toFixed(decimals).split(".");
  const integerPart = parts[0] ?? "0";
  const fraction = parts[1];
  const formattedInteger = formatGroupedInteger(integerPart, format);
  const formattedNumber =
    format === "1.234.567,89"
      ? formattedInteger + (fraction ? `,${fraction}` : "")
      : formattedInteger + (fraction ? `.${fraction}` : "");
  return amount < 0 ? `-${formattedNumber}` : formattedNumber;
}

export function parseGroupedNumber(raw: unknown, format: string): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw !== "string") return Number.NaN;

  let s = raw.trim();
  if (!s) return Number.NaN;

  const negative = s.startsWith("-");
  if (negative) s = s.slice(1).trim();
  if (!s) return Number.NaN;

  const dec = groupedDecimalSeparator(format);
  const grp = groupedGroupingSeparator(format);

  if (grp === ".") s = s.replace(/\./g, "");
  else if (grp === " ") s = s.replace(/\s/g, "");
  else s = s.replace(/,/g, "");

  if (dec === ",") s = s.replace(",", ".");

  if (!/^\d*(\.\d*)?$/.test(s) || s === "." || s === "") return Number.NaN;
  const n = Number(s);
  if (!Number.isFinite(n)) return Number.NaN;
  return negative ? -n : n;
}

export function sanitizeGroupedNumberDraft(
  raw: string,
  format: string,
  allowDecimal: boolean,
): string {
  const dec = groupedDecimalSeparator(format);
  const grp = groupedGroupingSeparator(format);
  let out = "";
  let seenDec = false;
  let i = 0;
  if (raw.startsWith("-")) {
    out = "-";
    i = 1;
  }
  for (; i < raw.length; i++) {
    const ch = raw[i] ?? "";
    if (ch >= "0" && ch <= "9") {
      out += ch;
      continue;
    }
    if (allowDecimal && ch === dec && !seenDec) {
      out += ch;
      seenDec = true;
      continue;
    }
    if (ch === grp) out += ch;
  }
  return out;
}

export function toCanonicalNumberString(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  return String(amount);
}
