export function parseMoneyValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const n = Number.parseFloat(raw.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function formatMoneyDisplay(amount: number, locale: string, currency = "USD"): string {
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(locale === "es" ? "es" : "en", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(locale === "es" ? "es" : "en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }
}

export function computeLineAmount(quantity: number, rate: number): number {
  if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return 0;
  return quantity * rate;
}
