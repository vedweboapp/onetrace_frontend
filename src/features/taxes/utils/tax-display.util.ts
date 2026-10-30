import type { Tax } from "../types/tax.types";

export function formatTaxPercentage(tax: Tax | string | number | null | undefined): string {
  if (tax === null || tax === undefined) return "0%";
  const raw = typeof tax === "object" ? tax.tax_percentage : tax;
  if (raw === null || raw === undefined || raw === "") return "0%";
  const num = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (Number.isNaN(num)) return `${raw}%`;
  return `${num}%`;
}

export function formatTaxLabel(tax: Tax): string {
  if (!tax) return "";
  const name = tax.tax_name?.trim() || "Tax";
  const pct = formatTaxPercentage(tax);
  return `${name} (${pct})`;
}

