"use client";

import * as React from "react";
import {
  ArrowRight,
  Building2,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  FileSignature,
  Package,
  Search,
  ShoppingCart,
  TrendingDown,
  X,
} from "lucide-react";
import type {
  QuotationDetail,
  QuotationVendorItem,
  QuotationVendorSubmission,
} from "@/features/quotations/types/quotation.types";
import { QuotationSendVendorsModal } from "@/features/quotations/components/quotation-send-vendors-modal";
import { fetchQuotation, createPurchaseOrderFromQuotation } from "@/features/quotations/api/quotation.api";
import { DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastError, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export interface VendorRfqLineItem {
  key: string;
  compositeId: number | null;
  name: string;
  sku: string;
  groupName: string | null;
  quantity: number;
  unit: string;
}

interface VendorBidRow {
  submission: QuotationVendorSubmission;
  unitPrice: number | null;
  itemTotal: number | null;
  deliveryDate: string | null;
}

interface GridRow extends VendorRfqLineItem {
  bids: VendorBidRow[];
}

function extractVendorRfqItems(detail: QuotationDetail): VendorRfqLineItem[] {
  const sections = detail.quote_sections ?? [];
  if (!Array.isArray(sections) || sections.length === 0) return [];
  const rawPins: any[] = [];
  sections.forEach((sec: any) => {
    if (Array.isArray(sec.plots) && sec.plots.length > 0) {
      sec.plots.forEach((plot: any) => {
        const pins = Array.isArray(plot.pins) ? plot.pins : [];
        pins.forEach((p: any) => rawPins.push(p));
      });
    } else if (Array.isArray(sec.pins)) {
      sec.pins.forEach((p: any) => rawPins.push(p));
    } else if (Array.isArray(sec.source_pins)) {
      sec.source_pins.forEach((p: any) => rawPins.push(p));
    }
  });
  const map = new Map<string, { name: string; sku: string; groupName: string | null; unit: string; quantity: number; compositeId: number | null }>();
  rawPins.forEach((pin: any) => {
    const compId: number | null = pin.composite_item_id != null ? Number(pin.composite_item_id) : pin.item_id != null ? Number(pin.item_id) : null;
    const name: string = pin.name ?? pin.item_name ?? (compId ? `Composite Item #${compId}` : "Item");
    const key: string = compId != null ? `cmp_${compId}` : `name_${name.toLowerCase().trim().replace(/\s+/g, "_")}`;
    const qty = Number(pin.quantity ?? 1);
    const groupName: string | null = pin.group_name ?? null;
    const sku: string = pin.sku ?? (compId ? `CMP-${compId}` : "");
    const unit: string = pin.unit ?? "Unit";
    if (map.has(key)) {
      const e = map.get(key)!;
      e.quantity += qty;
      if (!e.groupName && groupName) e.groupName = groupName;
      if (!e.sku && sku) e.sku = sku;
    } else {
      map.set(key, { name, sku, groupName, unit, quantity: qty, compositeId: compId });
    }
  });
  return Array.from(map.entries()).map(([key, d]) => ({ key, compositeId: d.compositeId, name: d.name, sku: d.sku, groupName: d.groupName, quantity: d.quantity, unit: d.unit }));
}

function matchBidItem(vi: any, si: VendorRfqLineItem): boolean {
  const bidId = vi.composite_itmes != null ? Number(vi.composite_itmes) : vi.composite_items != null ? Number(vi.composite_items) : vi.composite_item_id != null ? Number(vi.composite_item_id) : null;
  if (bidId != null && si.compositeId != null) return bidId === si.compositeId;
  const bn = (vi.name ?? vi.item_name ?? "").toLowerCase().trim();
  return bn !== "" && bn === si.name.toLowerCase().trim();
}

function buildGridRows(scope: VendorRfqLineItem[], vendors: QuotationVendorSubmission[]): GridRow[] {
  return scope.map((si) => ({
    ...si,
    bids: vendors.map((sub) => {
      const m = (sub.items ?? []).find((vi: QuotationVendorItem) => matchBidItem(vi, si));
      return { submission: sub, unitPrice: m?.unit_price ?? null, itemTotal: m?.item_total ?? null, deliveryDate: m?.date_of_delivery ?? m?.delivery_date ?? null };
    }),
  }));
}

function fmt(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function statusStyle(s?: string): { bg: string; text: string; label: string } {
  switch ((s ?? "").toLowerCase()) {
    case "submit": case "submitted": return { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-300", label: "Submitted" };
    case "sent": return { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-300", label: "Sent" };
    case "questioned": return { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-300", label: "Questioned" };
    case "rejected": return { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-300", label: "Declined" };
    default: return { bg: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400", label: s ?? "Pending" };
  }
}
function BidDetailModal({ open, sub, scope, onClose }: { open: boolean; sub: QuotationVendorSubmission | null; scope: VendorRfqLineItem[]; onClose: () => void }) {
  if (!open || !sub) return null;
  const v = sub.vendor;
  const items = sub.items ?? [];
  const ss = statusStyle(sub.status);
  const sentAt = sub.sent_at ? new Date(sub.sent_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  const grandTotal = items.reduce((s: number, it: { item_total?: number }) => s + (it.item_total ?? 0), 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <Building2 className="size-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{v.name}</h2>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", ss.bg, ss.text)}>{ss.label}</span>
            </div>
            <div className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-500 dark:text-slate-400">
              {v.email && <span>{v.email}</span>}
              {v.phone && <span>{v.phone}</span>}
              {sentAt && <span>Sent: {sentAt}</span>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"><X className="size-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center"><Package className="mb-2 size-8 text-slate-300" /><p className="text-xs text-slate-500">No items in this submission yet.</p></div>
          ) : (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900/60">
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Item</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">Qty</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">Unit Price</th>
                  <th className="px-4 py-2.5 text-right font-semibold text-slate-600 dark:text-slate-400">Total</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Delivery</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((it: any, idx: number) => {
                  const ms = scope.find((s) => matchBidItem(it, s));
                  const nm = ms?.name ?? it.name ?? it.item_name ?? "—";
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{nm}</td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{it.quantity ?? "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{it.unit_price != null ? fmt(it.unit_price) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{it.item_total != null ? fmt(it.item_total) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{it.date_of_delivery ?? it.delivery_date ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
          <div>{sub.signature && (<a href={sub.signature} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"><FileSignature className="size-3.5" />View Digital Signature</a>)}</div>
          {items.length > 0 && (<div className="text-right"><p className="text-[11px] text-slate-500">Grand Total</p><p className="text-base font-bold text-slate-900 dark:text-slate-100">{fmt(grandTotal)}</p></div>)}
        </div>
      </div>
    </div>
  );
}

function SigDialog({ open, url, name, onClose }: { open: boolean; url: string | null; name: string; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <div className="flex items-center gap-2"><FileSignature className="size-4 text-blue-500" /><h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Digital Signature — {name}</h3></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100"><X className="size-4" /></button>
        </div>
        <div className="flex min-h-40 items-center justify-center p-6">
          {url ? (<img src={url} alt={`Signature of ${name}`} className="max-h-48 max-w-full rounded-lg border border-slate-200 bg-white object-contain shadow-sm dark:border-slate-700" />) : (<p className="text-sm text-slate-400">No signature available.</p>)}
        </div>
      </div>
    </div>
  );
}

type Props = { quotationId: number; quoteName?: string; detail: QuotationDetail; onGoToPricingTab?: () => void; onSent?: () => void; };

export function QuotationVendorQuotationsTab({ quotationId, quoteName, detail, onGoToPricingTab, onSent }: Props) {
  const [sendModalOpen, setSendModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [refreshing, setRefreshing] = React.useState(false);
  const [vendors, setVendors] = React.useState<QuotationVendorSubmission[]>(detail.vendors ?? []);
  const [bidModal, setBidModal] = React.useState<{ open: boolean; sub: QuotationVendorSubmission | null }>({ open: false, sub: null });
  const [sigDlg, setSigDlg] = React.useState<{ open: boolean; url: string | null; name: string }>({ open: false, url: null, name: "" });
  // key = row.key, value = user-edited quantity (defaults to row.quantity)
  const [qtyOverrides, setQtyOverrides] = React.useState<Record<string, number>>({});

  // Initial fetch with ?include=vendors if not already in detail
  React.useEffect(() => {
    if (detail.vendors != null) { setVendors(detail.vendors); return; }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await fetchQuotation(quotationId, { include: "vendors" });
        if (!cancelled) setVendors(fresh.vendors ?? []);
      } catch { /* silent */ }
    })();
    return () => { cancelled = true; };
  }, [quotationId, detail.vendors]);

  const rfqItems = React.useMemo(() => extractVendorRfqItems(detail), [detail]);
  const gridRows = React.useMemo(() => buildGridRows(rfqItems, vendors), [rfqItems, vendors]);

  const uniqueVendors = React.useMemo(() => {
    const seen = new Map<number, string>();
    vendors.forEach((v) => { if (!seen.has(v.vendor.id)) seen.set(v.vendor.id, v.vendor.name); });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [vendors]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gridRows;
    return gridRows.filter((r) => r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q) || (r.groupName?.toLowerCase().includes(q) ?? false) || r.bids.some((b) => b.submission.vendor.name.toLowerCase().includes(q)));
  }, [gridRows, search]);

  function getFilteredBids(row: GridRow): VendorBidRow[] {
    return row.bids.filter((b) => {
      if (vendorFilter !== "all" && String(b.submission.vendor.id) !== vendorFilter) return false;
      return true;
    });
  }

  const submitted = vendors.filter((v) => v.status === "submit" || v.status === "submitted").length;

  const lowestTotal = React.useMemo(() => {
    const vals: number[] = [];
    vendors.forEach((v) => { if (v.status !== "submit" && v.status !== "submitted") return; vals.push((v.items ?? []).reduce((s: number, it: { item_total?: number }) => s + (it.item_total ?? 0), 0)); });
    return vals.length ? Math.min(...vals) : null;
  }, [vendors]);

  const lowestVendorId = React.useMemo(() => {
    const m = new Map<number, number>();
    vendors.forEach((v) => { if (v.status !== "submit" && v.status !== "submitted") return; m.set(v.vendor.id, (v.items ?? []).reduce((s: number, it: { item_total?: number }) => s + (it.item_total ?? 0), 0)); });
    if (!m.size) return null;
    let minId: number | null = null; let minVal = Infinity;
    m.forEach((val, id) => { if (val < minVal) { minVal = val; minId = id; } });
    return minId;
  }, [vendors]);

  const lowestPricePerItem = React.useMemo(() => {
    const m = new Map<string, number>();
    gridRows.forEach((r) => {
      const prices = r.bids.filter((b) => b.unitPrice != null && (b.submission.status === "submit" || b.submission.status === "submitted")).map((b) => b.unitPrice!);
      if (prices.length) m.set(r.key, Math.min(...prices));
    });
    return m;
  }, [gridRows]);

  const handleCopy = React.useCallback((token: string | null | undefined, vid: number) => {
    if (typeof window === "undefined") return;
    const url = token ? `${window.location.origin}${routes.public.vendorQuotationToken(token)}` : `${window.location.origin}${routes.public.vendorQuotation}`;
    void navigator.clipboard.writeText(url);
    setCopied(String(vid));
    toastSuccess("Vendor portal link copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  }, []);

  const handleRefresh = React.useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try { const f = await fetchQuotation(quotationId, { include: "vendors" }); setVendors(f.vendors ?? []); } finally { setRefreshing(false); }
  }, [quotationId, refreshing]);

  const hasVendors = vendors.length > 0;
  const visibleVendors = vendorFilter === "all" ? vendors : vendors.filter((v) => String(v.vendor.id) === vendorFilter);

  const [purchasingKey, setPurchasingKey] = React.useState<string | null>(null);

  const handlePurchase = React.useCallback(
    async (row: GridRow, bid: VendorBidRow, overriddenQty?: number) => {
      const rowKey = `${row.key}-${bid.submission.vendor.id}`;
      if (purchasingKey) return;

      const matchedBidItem = (bid.submission.items ?? []).find((vi: QuotationVendorItem) => matchBidItem(vi, row));
      const compId =
        (matchedBidItem?.composite_itmes != null ? Number(matchedBidItem.composite_itmes) : null) ??
        (matchedBidItem?.composite_items != null ? Number(matchedBidItem.composite_items) : null) ??
        (matchedBidItem?.composite_item != null ? Number(matchedBidItem.composite_item) : null) ??
        (matchedBidItem?.composite_item_id != null ? Number(matchedBidItem.composite_item_id) : null) ??
        (row.compositeId != null ? Number(row.compositeId) : null);

      if (compId == null) {
        toastError("Cannot create purchase order: composite item ID is missing.");
        return;
      }

      // Use the user-overridden quantity if provided, else fall back to bid/row quantity
      const quantity = overriddenQty != null && overriddenQty > 0
        ? overriddenQty
        : Number(matchedBidItem?.quantity ?? row.quantity ?? 1);
      const vendorId = Number(bid.submission.vendor.id);

      const itemPayload = {
        composite_item: compId,
        quantity,
        vendor: vendorId,
      };

      setPurchasingKey(rowKey);
      try {
        const res = await createPurchaseOrderFromQuotation(quotationId, {
          items: [itemPayload as any],
        });
        toastSuccess(res?.message ?? `Purchase order created for ${row.name}`);
        onSent?.();
      } catch (err: any) {
        toastApiError(err, "Failed to create purchase order");
      } finally {
        setPurchasingKey(null);
      }
    },
    [purchasingKey, onSent],
  );

  return (
    <div className="space-y-4">
      {/* Vendor Quotations Grid */}
      <DetailPanelCard
        title="Vendor Quotations"
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-52">
              <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search item or vendor..."
                className={cn(
                  "h-8 w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                  "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500",
                )}
              />
            </div>
            {uniqueVendors.length > 0 && (
              <div className="relative">
                <select
                  value={vendorFilter}
                  onChange={(e) => setVendorFilter(e.target.value)}
                  className={cn(
                    "h-8 appearance-none cursor-pointer rounded-md border border-slate-200 bg-white pl-3 pr-7 text-xs text-slate-700 focus:border-blue-500 focus:outline-none",
                    "dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300",
                  )}
                >
                  <option value="all">All Vendors</option>
                  {uniqueVendors.map((v) => (
                    <option key={v.id} value={String(v.id)}>{v.name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>
        }
      >
        {rfqItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Package className="size-6 text-slate-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              No line items in quotation scope
            </h3>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Add sections, plots, and composite items in the Scope &amp; Pricing tab to generate RFQ line items for vendors.
            </p>
            {onGoToPricingTab && (
              <AppButton type="button" variant="secondary" size="sm" className="mt-4" onClick={onGoToPricingTab}>
                Go to Scope &amp; Pricing
                <ArrowRight className="ml-1.5 size-3.5" />
              </AppButton>
            )}
          </div>
        ) : !hasVendors ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Building2 className="size-6 text-slate-400" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
              No vendors contacted yet
            </h3>
            <p className="mt-1 max-w-xs text-xs text-slate-500 dark:text-slate-400">
              Click &ldquo;Send to Vendors&rdquo; to dispatch this quotation to one or more vendors for pricing.
            </p>
            <AppButton type="button" variant="primary" size="sm" className="mt-4" onClick={() => setSendModalOpen(true)}>
              <Building2 className="mr-1.5 size-3.5" />
              Send to Vendors
            </AppButton>
          </div>
        ) : (
          /* ── Flat grid: one row per (scope-item × vendor) ── */
          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                  <th className="sticky left-0 z-10 min-w-[180px] border-r border-slate-200/60 bg-slate-50 px-4 py-3 font-semibold text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-400">
                    Item Name
                  </th>
                  <th className="min-w-[140px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Quantity
                  </th>
                  <th className="min-w-[160px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Vendor
                  </th>
                  <th className="min-w-[130px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Unit Price
                  </th>
                  <th className="min-w-[160px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                    Expected Delivery
                  </th>
                  <th className="min-w-[170px] px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {(() => {
                  const rows = filteredRows.flatMap((row, ri) => {
                    const bids = getFilteredBids(row);
                    const lowPrice = lowestPricePerItem.get(row.key);
                    return bids.map((bid, bi) => {
                      const isLow =
                        bid.unitPrice != null &&
                        lowPrice != null &&
                        bid.unitPrice === lowPrice &&
                        (bid.submission.status === "submit" || bid.submission.status === "submitted");
                      const hasBid = bid.unitPrice != null || bid.deliveryDate != null;
                      const isCopied = copied === String(bid.submission.vendor.id);
                      const ss = statusStyle(bid.submission.status);
                      const isLowestVendor = lowestVendorId === bid.submission.vendor.id && submitted > 0;
                      const isFirstBid = bi === 0;
                      const rowBg = ri % 2 === 0 ? "bg-white dark:bg-slate-950/20" : "bg-slate-50/40 dark:bg-slate-900/20";

                      return (
                        <tr
                          key={`${row.key}-${bid.submission.vendor.id}`}
                          className={cn(
                            "group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
                            rowBg,
                            /* Separate item groups with a slightly stronger top border */
                            bi === 0 && ri > 0 && "border-t-2 border-slate-200/80 dark:border-slate-800",
                          )}
                        >
                          {/* Item Name — only shown on the first bid row for this scope item */}
                          {isFirstBid ? (
                            <td
                              rowSpan={bids.length || 1}
                              className={cn(
                                "sticky left-0 z-10 border-r border-slate-200/40 px-4 py-3.5 align-top transition-colors dark:border-slate-800/40",
                                "group-hover:bg-blue-50/30 dark:group-hover:bg-blue-950/10",
                                rowBg,
                              )}
                            >
                              <div className="font-semibold leading-snug text-slate-900 dark:text-slate-100">
                                {row.name}
                              </div>
                              {row.sku && (
                                <div className="mt-0.5 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                  {row.sku}
                                </div>
                              )}
                              {row.groupName && (
                                <span className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {row.groupName}
                                </span>
                              )}
                              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                                Required Qty: <span className="font-semibold">{row.quantity}</span>{" "}
                                <span className="text-slate-400">{row.unit}</span>
                              </div>
                            </td>
                          ) : null}

                          {/* Required Qty — editable stepper, spans all bid rows for this item */}
                          {isFirstBid && (
                            <td
                              rowSpan={bids.length || 1}
                              className="px-4 py-3.5 align-top"
                            >
                              <div className="flex items-center gap-1">
                                {/* Minus */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = qtyOverrides[row.key] ?? row.quantity;
                                    setQtyOverrides((prev) => ({ ...prev, [row.key]: Math.max(1, cur - 1) }));
                                  }}
                                  className="flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                                >
                                  <span className="text-sm font-bold leading-none">−</span>
                                </button>

                                {/* Input */}
                                <input
                                  id={`qty-input-${row.key}`}
                                  type="number"
                                  min={1}
                                  value={qtyOverrides[row.key] ?? row.quantity}
                                  onChange={(e) => {
                                    const v = Math.max(1, Number(e.target.value));
                                    setQtyOverrides((prev) => ({ ...prev, [row.key]: v }));
                                  }}
                                  className={cn(
                                    "w-12 rounded-md border border-slate-200 bg-white px-2 py-1 text-center text-xs font-semibold text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500",
                                    "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
                                  )}
                                />

                                {/* Plus */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const cur = qtyOverrides[row.key] ?? row.quantity;
                                    setQtyOverrides((prev) => ({ ...prev, [row.key]: cur + 1 }));
                                  }}
                                  className="flex size-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-500 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-blue-500 dark:hover:bg-blue-950/30 dark:hover:text-blue-400"
                                >
                                  <span className="text-sm font-bold leading-none">+</span>
                                </button>
                              </div>
                              <div className="mt-1 text-[10px] text-slate-400 dark:text-slate-500">
                                {row.unit}
                              </div>
                            </td>
                          )}

                          {/* Vendor */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">
                                {bid.submission.vendor.name}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                              <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold", ss.bg, ss.text)}>
                                {ss.label}
                              </span>
                              {bid.submission.vendor.email && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {bid.submission.vendor.email}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Unit Price */}
                          <td className="px-4 py-3.5 align-top">
                            {hasBid ? (
                              <div>
                                <div className="flex flex-wrap items-center gap-1">
                                  <span
                                    className={cn(
                                      "text-sm font-bold",
                                      isLow
                                        ? "text-emerald-700 dark:text-emerald-400"
                                        : "text-slate-900 dark:text-slate-100",
                                    )}
                                  >
                                    {fmt(bid.unitPrice)}
                                  </span>
                                  {isLow && (
                                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                                      LOWEST
                                    </span>
                                  )}
                                </div>
                                {bid.itemTotal != null && (
                                  <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                    Total: <span className="font-medium">{fmt(bid.itemTotal)}</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Expected Delivery */}
                          <td className="px-4 py-3.5 align-top">
                            {hasBid && bid.deliveryDate ? (
                              <div className="flex items-start gap-1">
                                <Clock className="mt-0.5 size-3 shrink-0 text-slate-400" />
                                <span className="text-[11px] font-medium leading-tight text-slate-700 dark:text-slate-300">
                                  {bid.deliveryDate}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )}
                          </td>

                          {/* Action */}
                          <td className="px-4 py-3.5 align-top">
                            <div className="flex items-center justify-start gap-1.5">
                              <AppButton
                                type="button"
                                size="sm"
                                variant="primary"
                                loading={purchasingKey === `${row.key}-${bid.submission.vendor.id}`}
                                disabled={purchasingKey != null}
                                onClick={() => void handlePurchase(row, bid, qtyOverrides[row.key] ?? row.quantity)}
                                className="h-7 px-2.5 text-xs font-semibold"
                                title={`Create Purchase Order for ${row.name}`}
                              >
                                <ShoppingCart className="mr-1 size-3.5" />
                                Purchase
                              </AppButton>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  });

                  if (rows.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                          {search.trim()
                            ? <>No items matched &ldquo;{search}&rdquo;</>
                            : "No vendor quotations match the selected filters."}
                        </td>
                      </tr>
                    );
                  }

                  return rows;
                })()}
              </tbody>
            </table>
          </div>
        )}
      </DetailPanelCard>

      <QuotationSendVendorsModal
        open={sendModalOpen}
        quotationId={quotationId}
        quoteName={quoteName}
        onClose={() => setSendModalOpen(false)}
        onSuccess={() => { setSendModalOpen(false); onSent?.(); void handleRefresh(); }}
      />
      <BidDetailModal open={bidModal.open} sub={bidModal.sub} scope={rfqItems} onClose={() => setBidModal({ open: false, sub: null })} />
      <SigDialog open={sigDlg.open} url={sigDlg.url} name={sigDlg.name} onClose={() => setSigDlg({ open: false, url: null, name: "" })} />
    </div>
  );
}
