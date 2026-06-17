export type QuotationScopeNavContext =
  | { mode: "new" }
  | { mode: "edit"; quotationId: number }
  | { mode: "detail"; quotationId: number };

type CompositeScopeHrefParams = {
  compositeItemId: number;
  repeatCount: number;
  sectionLabel?: string;
  plotLabel?: string;
  backHref?: string;
};

export function buildQuotationCompositeScopeHref(
  context: QuotationScopeNavContext,
  params: CompositeScopeHrefParams,
): string {
  const { compositeItemId, repeatCount, sectionLabel, plotLabel, backHref } = params;
  const base =
    context.mode === "new"
      ? `/quotations/new/composite/${compositeItemId}`
      : context.mode === "edit"
        ? `/quotations/${context.quotationId}/edit/composite/${compositeItemId}`
        : `/quotations/${context.quotationId}/composite/${compositeItemId}`;

  const q = new URLSearchParams();
  if (repeatCount > 1) q.set("repeat", String(repeatCount));
  if (sectionLabel?.trim()) q.set("section", sectionLabel.trim());
  if (plotLabel?.trim()) q.set("plot", plotLabel.trim());
  if (backHref?.trim()) q.set("back", backHref.trim());
  const qs = q.toString();
  return qs ? `${base}?${qs}` : base;
}

export function parseCompositeScopeRepeat(raw: string | null | undefined): number {
  if (!raw?.trim()) return 1;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
