import type { QuotationDraft, QuotationDraftLine } from "@/features/quotations/types/quotation-draft.types";
import type {
  QuotationBlockScopeSession,
  QuotationBlockScopeTableRow,
  QuotationScopeBlock,
} from "@/features/quotations/types/quotation-block-scope.types";
import { draftPinTotal } from "@/features/quotations/utils/quotation-draft-compute.util";
import type { QuotationScopeNavContext } from "@/features/quotations/utils/quotation-composite-scope-nav.util";
import { mergeUrlQueryParam } from "@/shared/utils/detail-from-list.util";

export const QUOTATION_BLOCK_SCOPE_SESSION_KEY = "quotation-block-scope-v1";

const LOCALE_PREFIX_RE = /^\/(en|es)(?=\/|$)/;

/** next-intl `Link` expects paths without a locale segment. */
export function stripLocalePathPrefix(path: string): string {
  const m = path.match(LOCALE_PREFIX_RE);
  if (m) {
    const rest = path.slice(m[0].length);
    return rest.startsWith("/") ? rest : rest ? `/${rest}` : "/";
  }
  return path;
}

const QUOTATION_SCOPE_PRICING_PATH = /^\/dashboard\/quotations(?:\/new|\/\d+(?:\/edit)?)$/;

/** Locale-free return URL for quotation Scope & Pricing (not the quotations list). */
export function sanitizeQuotationScopePricingBack(decoded: string): string | null {
  const qIdx = decoded.indexOf("?");
  const pathOnly = stripLocalePathPrefix(qIdx >= 0 ? decoded.slice(0, qIdx) : decoded);
  if (!QUOTATION_SCOPE_PRICING_PATH.test(pathOnly)) return null;
  const params = new URLSearchParams(qIdx >= 0 ? decoded.slice(qIdx + 1) : "");
  params.delete("back");
  params.set("tab", "pricing");
  const qs = params.toString();
  return qs ? `${pathOnly}?${qs}` : mergeUrlQueryParam(pathOnly, "tab", "pricing");
}

/** Return URL for Scope & Pricing after leaving scope detail (locale-free path + tab). */
export function buildQuotationScopeReturnHref(pathname: string): string {
  const base = stripLocalePathPrefix(pathname);
  if (typeof window === "undefined") {
    return mergeUrlQueryParam(base, "tab", "pricing");
  }
  const params = new URLSearchParams(window.location.search);
  params.delete("back");
  params.set("tab", "pricing");
  const qs = params.toString();
  return qs ? `${base}?${qs}` : mergeUrlQueryParam(base, "tab", "pricing");
}

export function normalizeQuotationScopeBackHref(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (raw?.trim()) {
    let decoded = raw.trim();
    try {
      decoded = decodeURIComponent(decoded);
    } catch {
      decoded = raw.trim();
    }
    const safe = sanitizeQuotationScopePricingBack(decoded);
    if (safe) return safe;
  }
  return (
    sanitizeQuotationScopePricingBack(fallback) ??
    mergeUrlQueryParam(stripLocalePathPrefix(fallback), "tab", "pricing")
  );
}

const SECTION_BLOCK_SUFFIX = "_section";

export function quotationBlockKey(sectionId: string, plotId: string | null): string {
  return plotId ? `${sectionId}::${plotId}` : `${sectionId}::${SECTION_BLOCK_SUFFIX}`;
}

export function buildBlocksFromDraft(draft: QuotationDraft): QuotationScopeBlock[] {
  const blocks: QuotationScopeBlock[] = [];
  for (const section of draft.sections) {
    if (!section.included) continue;
    const sectionPins = section.section_pins ?? [];
    if (sectionPins.length > 0) {
      blocks.push({
        key: quotationBlockKey(section.id, null),
        sectionName: section.name,
        blockName: section.name.trim() || "Section",
        lines: sectionPins,
      });
    }
    for (const plot of section.plots) {
      blocks.push({
        key: quotationBlockKey(section.id, plot.id),
        sectionName: section.name,
        blockName: plot.name?.trim() || "Plot",
        lines: plot.pins,
      });
    }
  }
  return blocks;
}

/** One table row per pin line; qty is Pins.quantity (not drawing-pin ×N). */
export function blockLinesToPerPinTableRows(lines: QuotationDraftLine[]): QuotationBlockScopeTableRow[] {
  return lines.map((line) => {
    const listPrice = Number.isFinite(line.selling_price) ? line.selling_price : 0;
    const quantity = Number.isFinite(line.quantity) && line.quantity >= 0 ? line.quantity : 0;
    const total = draftPinTotal(line);
    return {
      rowKey: line.id,
      name: (typeof line.name === "string" ? line.name : "").trim() || "—",
      quantity,
      listPrice,
      amount: total,
      discount: 0,
      tax: 0,
      total,
    };
  });
}

export function blockLinesTotal(lines: QuotationDraftLine[]): number {
  return lines.reduce((acc, ln) => acc + draftPinTotal(ln), 0);
}

export function writeBlockScopeSession(session: QuotationBlockScopeSession): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(QUOTATION_BLOCK_SCOPE_SESSION_KEY, JSON.stringify(session));
}

export function readBlockScopeSession(): QuotationBlockScopeSession | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(QUOTATION_BLOCK_SCOPE_SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as QuotationBlockScopeSession;
    if (!parsed || !Array.isArray(parsed.blocks)) return null;
    return parsed;
  } catch {
    return null;
  }
}

type BlockScopeHrefParams = {
  blockKey: string;
  backHref?: string;
};

export function buildQuotationBlockScopeHref(
  context: QuotationScopeNavContext,
  params: BlockScopeHrefParams,
): string {
  const base =
    context.mode === "new"
      ? "/dashboard/quotations/new/block"
      : context.mode === "edit"
        ? `/dashboard/quotations/${context.quotationId}/edit/block`
        : `/dashboard/quotations/${context.quotationId}/block`;

  const q = new URLSearchParams();
  q.set("block", params.blockKey);
  if (params.backHref?.trim()) q.set("back", params.backHref.trim());
  return `${base}?${q.toString()}`;
}
