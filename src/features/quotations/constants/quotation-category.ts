/** API `quote_category` query/body values. */
export const QUOTE_CATEGORY = {
  service: "servicequote",
  project: "projectquote",
} as const;

export type QuoteCategoryApi = (typeof QUOTE_CATEGORY)[keyof typeof QUOTE_CATEGORY];

export function isServiceQuoteCategory(raw: string | null | undefined): boolean {
  const cat = raw?.trim().toLowerCase() ?? "";
  return cat === QUOTE_CATEGORY.service || cat === "service";
}

export function isProjectQuoteCategory(raw: string | null | undefined): boolean {
  const cat = raw?.trim().toLowerCase() ?? "";
  return cat === QUOTE_CATEGORY.project || cat === "project";
}

export function parseQuoteCategoryParam(raw: string | null | undefined): QuoteCategoryApi | undefined {
  const cat = raw?.trim().toLowerCase() ?? "";
  if (cat === QUOTE_CATEGORY.service || cat === "service") return QUOTE_CATEGORY.service;
  if (cat === QUOTE_CATEGORY.project || cat === "project") return QUOTE_CATEGORY.project;
  return undefined;
}
