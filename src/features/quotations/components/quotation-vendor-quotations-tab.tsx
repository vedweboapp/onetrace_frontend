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
  TrendingDown,
  X,
} from "lucide-react";
import type {
  QuotationDetail,
  QuotationVendorItem,
  QuotationVendorSubmission,
} from "@/features/quotations/types/quotation.types";
import { QuotationSendVendorsModal } from "@/features/quotations/components/quotation-send-vendors-modal";
import { fetchQuotation, updateQuotationItemsStatus } from "@/features/quotations/api/quotation.api";
import { DetailPanelCard } from "@/shared/components/layout/detail-metric-card";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastError, toastApiError } from "@/shared/feedback/app-toast";
import { AppButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

export interface VendorRfqLineItem {
  key: string;
  itemId?: number | null;
  compositeId: number | null;
  name: string;
  sku: string;
  groupName: string | null;
  quantity: number;
  unit: string;
  costPrice?: string | number | null;
  sellingPrice?: string | number | null;
}

interface VendorBidRow {
  submission: QuotationVendorSubmission;
  unitPrice: number | null;
  itemTotal: number | null;
  deliveryDate: string | null;
  comments: string | null;
  matchedItem?: QuotationVendorItem;
}

interface GridRow extends VendorRfqLineItem {
  bids: VendorBidRow[];
}

function extractVendorRfqItems(
  detail: QuotationDetail,
  vendors?: QuotationVendorSubmission[],
): VendorRfqLineItem[] {
  const map = new Map<
    string,
    {
      itemId: number | null;
      compositeId: number | null;
      name: string;
      sku: string;
      groupName: string | null;
      unit: string;
      quantity: number;
      costPrice?: string | number | null;
      sellingPrice?: string | number | null;
    }
  >();

  // 1. Primary: Extract items from vendor_items / items across all vendor submissions
  if (Array.isArray(vendors) && vendors.length > 0) {
    vendors.forEach((sub) => {
      const vItems = sub.vendor_items ?? sub.items ?? [];
      vItems.forEach((vi: any) => {
        const itemObj = vi.item && typeof vi.item === "object" ? vi.item : null;
        const itemId =
          itemObj?.id != null
            ? Number(itemObj.id)
            : vi.item_id != null
            ? Number(vi.item_id)
            : typeof vi.item === "number"
            ? vi.item
            : null;

        const name = (
          itemObj?.name ??
          vi.name ??
          vi.item_name ??
          (itemId ? `Item #${itemId}` : "Unknown Item")
        ).trim();

        const sku = (itemObj?.sku ?? vi.sku ?? vi.item_sku ?? "").trim();
        const qty = Number(vi.quantity ?? 1);

        let unit = "PCS";
        if (itemObj?.unit_type) {
          if (typeof itemObj.unit_type === "object") {
            unit = itemObj.unit_type.short_form || itemObj.unit_type.name || "PCS";
          } else if (typeof itemObj.unit_type === "string") {
            unit = itemObj.unit_type;
          }
        } else if (vi.unit || vi.unit_type) {
          unit = vi.unit ?? vi.unit_type;
        }

        const groupName = itemObj?.group_name ?? vi.group_name ?? null;
        const costPrice = itemObj?.cost_price ?? vi.cost_price ?? null;
        const sellingPrice = itemObj?.selling_price ?? vi.selling_price ?? null;

        const compId =
          vi.composite_itmes != null
            ? Number(vi.composite_itmes)
            : vi.composite_items != null
            ? Number(vi.composite_items)
            : vi.composite_item != null
            ? Number(vi.composite_item)
            : vi.composite_item_id != null
            ? Number(vi.composite_item_id)
            : null;

        const key =
          itemId != null
            ? `item_${itemId}`
            : sku
            ? `sku_${sku.toLowerCase()}`
            : `name_${name.toLowerCase().replace(/\s+/g, "_")}`;

        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.quantity = Math.max(existing.quantity, qty);
          if (!existing.sku && sku) existing.sku = sku;
          if (!existing.groupName && groupName) existing.groupName = groupName;
          if (existing.itemId == null && itemId != null) existing.itemId = itemId;
          if (existing.compositeId == null && compId != null) existing.compositeId = compId;
          if (!existing.costPrice && costPrice) existing.costPrice = costPrice;
          if (!existing.sellingPrice && sellingPrice) existing.sellingPrice = sellingPrice;
        } else {
          map.set(key, {
            itemId,
            compositeId: compId,
            name,
            sku,
            groupName,
            unit,
            quantity: qty,
            costPrice,
            sellingPrice,
          });
        }
      });
    });

    if (map.size > 0) {
      return Array.from(map.entries()).map(([key, d]) => ({
        key,
        itemId: d.itemId,
        compositeId: d.compositeId,
        name: d.name,
        sku: d.sku,
        groupName: d.groupName,
        quantity: d.quantity,
        unit: d.unit,
        costPrice: d.costPrice,
        sellingPrice: d.sellingPrice,
      }));
    }
  }

  // 2. Secondary: Extract from direct items or vendor_items on quotation detail
  const detailItems =
    (detail as any).vendor_items ??
    (detail as any).items ??
    (detail as any).line_items;
  if (Array.isArray(detailItems) && detailItems.length > 0) {
    detailItems.forEach((vi: any) => {
      const itemObj = vi.item && typeof vi.item === "object" ? vi.item : null;
      const itemId =
        itemObj?.id != null
          ? Number(itemObj.id)
          : vi.item_id != null
          ? Number(vi.item_id)
          : typeof vi.item === "number"
          ? vi.item
          : null;

      const name = (
        itemObj?.name ??
        vi.name ??
        vi.item_name ??
        (itemId ? `Item #${itemId}` : "Unknown Item")
      ).trim();

      const sku = (itemObj?.sku ?? vi.sku ?? vi.item_sku ?? "").trim();
      const qty = Number(vi.quantity ?? 1);

      let unit = "PCS";
      if (itemObj?.unit_type) {
        if (typeof itemObj.unit_type === "object") {
          unit = itemObj.unit_type.short_form || itemObj.unit_type.name || "PCS";
        } else if (typeof itemObj.unit_type === "string") {
          unit = itemObj.unit_type;
        }
      } else if (vi.unit || vi.unit_type) {
        unit = vi.unit ?? vi.unit_type;
      }

      const groupName = itemObj?.group_name ?? vi.group_name ?? null;
      const costPrice = itemObj?.cost_price ?? vi.cost_price ?? null;
      const sellingPrice = itemObj?.selling_price ?? vi.selling_price ?? null;

      const compId =
        vi.composite_itmes != null
          ? Number(vi.composite_itmes)
          : vi.composite_items != null
          ? Number(vi.composite_items)
          : vi.composite_item != null
          ? Number(vi.composite_item)
          : vi.composite_item_id != null
          ? Number(vi.composite_item_id)
          : null;

      const key =
        itemId != null
          ? `item_${itemId}`
          : sku
          ? `sku_${sku.toLowerCase()}`
          : `name_${name.toLowerCase().replace(/\s+/g, "_")}`;

      if (map.has(key)) {
        const existing = map.get(key)!;
        existing.quantity = Math.max(existing.quantity, qty);
        if (!existing.sku && sku) existing.sku = sku;
        if (!existing.groupName && groupName) existing.groupName = groupName;
      } else {
        map.set(key, {
          itemId,
          compositeId: compId,
          name,
          sku,
          groupName,
          unit,
          quantity: qty,
          costPrice,
          sellingPrice,
        });
      }
    });

    if (map.size > 0) {
      return Array.from(map.entries()).map(([key, d]) => ({
        key,
        itemId: d.itemId,
        compositeId: d.compositeId,
        name: d.name,
        sku: d.sku,
        groupName: d.groupName,
        quantity: d.quantity,
        unit: d.unit,
        costPrice: d.costPrice,
        sellingPrice: d.sellingPrice,
      }));
    }
  }

  // 3. Extract and group items from composite_items array
  let compositeItems = (detail as any).composite_items ?? (detail as any).compositeItems;
  if (typeof compositeItems === "string") {
    try {
      compositeItems = JSON.parse(compositeItems);
    } catch {
      compositeItems = null;
    }
  }

  if (Array.isArray(compositeItems) && compositeItems.length > 0) {
    compositeItems.forEach((compEntry: any) => {
      const compId =
        compEntry.composite_item_id != null
          ? Number(compEntry.composite_item_id)
          : compEntry.id != null
          ? Number(compEntry.id)
          : null;

      const items = Array.isArray(compEntry.items)
        ? compEntry.items
        : Array.isArray(compEntry.item_list)
        ? compEntry.item_list
        : [];

      items.forEach((item: any) => {
        const itemId =
          item.id != null
            ? Number(item.id)
            : item.item_id != null
            ? Number(item.item_id)
            : null;

        const name = (item.name ?? item.item_name ?? (itemId ? `Item #${itemId}` : "Unknown Item")).trim();
        const sku = (item.sku ?? item.item_sku ?? "").trim();
        const qty = Number(item.quantity ?? item.qty ?? 1);
        const unit = item.unit ?? item.unit_type ?? "PCS";
        const groupName = item.group_name ?? item.groupName ?? compEntry.group_name ?? null;

        const key =
          itemId != null
            ? `item_${itemId}`
            : sku
            ? `sku_${sku.toLowerCase()}`
            : `name_${name.toLowerCase().replace(/\s+/g, "_")}`;

        if (map.has(key)) {
          const existing = map.get(key)!;
          existing.quantity += qty;
          if (!existing.sku && sku) existing.sku = sku;
          if (!existing.groupName && groupName) existing.groupName = groupName;
        } else {
          map.set(key, {
            itemId,
            compositeId: compId,
            name,
            sku,
            groupName,
            unit,
            quantity: qty,
          });
        }
      });
    });

    if (map.size > 0) {
      return Array.from(map.entries()).map(([key, d]) => ({
        key,
        itemId: d.itemId,
        compositeId: d.compositeId,
        name: d.name,
        sku: d.sku,
        groupName: d.groupName,
        quantity: d.quantity,
        unit: d.unit,
      }));
    }
  }

  // 4. Fallback: Extract from quote_sections
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

  rawPins.forEach((pin: any) => {
    const compId: number | null = pin.composite_item_id != null ? Number(pin.composite_item_id) : null;
    const itemId: number | null = pin.item_id != null ? Number(pin.item_id) : (pin.item?.id != null ? Number(pin.item.id) : null);
    const name: string = pin.item?.name ?? pin.name ?? pin.item_name ?? (itemId ? `Item #${itemId}` : compId ? `Composite Item #${compId}` : "Item");
    const key: string = itemId != null ? `item_${itemId}` : compId != null ? `cmp_${compId}` : `name_${name.toLowerCase().trim().replace(/\s+/g, "_")}`;
    const qty = Number(pin.quantity ?? 1);
    const groupName: string | null = pin.group_name ?? null;
    const sku: string = pin.item?.sku ?? pin.sku ?? (compId ? `CMP-${compId}` : "");
    const unit: string = pin.item?.unit_type?.short_form ?? pin.unit ?? "PCS";
    if (map.has(key)) {
      const e = map.get(key)!;
      e.quantity += qty;
      if (!e.groupName && groupName) e.groupName = groupName;
      if (!e.sku && sku) e.sku = sku;
    } else {
      map.set(key, { itemId, name, sku, groupName, unit, quantity: qty, compositeId: compId });
    }
  });

  return Array.from(map.entries()).map(([key, d]) => ({
    key,
    itemId: d.itemId,
    compositeId: d.compositeId,
    name: d.name,
    sku: d.sku,
    groupName: d.groupName,
    quantity: d.quantity,
    unit: d.unit,
  }));
}

function isVendorSubmitted(status?: string): boolean {
  const s = (status ?? "").toLowerCase().trim();
  return s === "submit" || s === "submitted";
}

function matchBidItem(vi: any, si: VendorRfqLineItem): boolean {
  if (!vi) return false;
  const viItem = vi.item && typeof vi.item === "object" ? vi.item : null;
  const viItemId =
    viItem?.id != null
      ? Number(viItem.id)
      : vi.item_id != null
      ? Number(vi.item_id)
      : typeof vi.item === "number"
      ? vi.item
      : null;
  const siItemId = si.itemId != null ? Number(si.itemId) : null;
  if (viItemId != null && siItemId != null && viItemId === siItemId) return true;

  const viSku = (viItem?.sku ?? vi.sku ?? vi.item_sku ?? "").toLowerCase().trim();
  const siSku = (si.sku ?? "").toLowerCase().trim();
  if (viSku && siSku && viSku === siSku) return true;

  const bidCompId =
    vi.composite_itmes != null
      ? Number(vi.composite_itmes)
      : vi.composite_items != null
      ? Number(vi.composite_items)
      : vi.composite_item != null
      ? Number(vi.composite_item)
      : vi.composite_item_id != null
      ? Number(vi.composite_item_id)
      : null;
  if (bidCompId != null && si.compositeId != null && bidCompId === si.compositeId) return true;

  const viName = (viItem?.name ?? vi.name ?? vi.item_name ?? "").toLowerCase().trim();
  const siName = (si.name ?? "").toLowerCase().trim();
  if (viName && siName && viName === siName) return true;

  return false;
}

function buildGridRows(scope: VendorRfqLineItem[], vendors: QuotationVendorSubmission[]): GridRow[] {
  return scope.map((si) => ({
    ...si,
    bids: vendors.map((sub) => {
      const isSub = isVendorSubmitted(sub.status);
      const subItems = sub.vendor_items ?? sub.items ?? [];
      const m = subItems.find((vi: QuotationVendorItem) => matchBidItem(vi, si));
      const unitPrice =
        m?.unit_price != null && m.unit_price !== ""
          ? Number(m.unit_price)
          : null;
      const qty = Number(m?.quantity ?? si.quantity ?? 1);
      const itemTotal =
        m?.item_total != null && m.item_total !== ""
          ? Number(m.item_total)
          : unitPrice != null
          ? Number((unitPrice * qty).toFixed(2))
          : null;
      const deliveryDate =
        m?.lead_time_days != null && m.lead_time_days !== ""
          ? String(m.lead_time_days)
          : m?.date_of_delivery ?? m?.delivery_date ?? null;

      const comments =
        m?.comments != null && m.comments !== ""
          ? String(m.comments)
          : (m as any)?.comment != null && (m as any).comment !== ""
          ? String((m as any).comment)
          : (m as any)?.notes != null && (m as any).notes !== ""
          ? String((m as any).notes)
          : null;

      return {
        submission: sub,
        unitPrice,
        itemTotal,
        deliveryDate,
        comments,
        matchedItem: m,
      };
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
  const items = sub.vendor_items ?? sub.items ?? [];
  const ss = statusStyle(sub.status);
  const sentAt = sub.sent_at ? new Date(sub.sent_at).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : null;
  const grandTotal = items.reduce((s: number, it: any) => {
    const total = it.item_total != null && it.item_total !== "" ? Number(it.item_total) : (it.unit_price != null ? Number(it.unit_price) * Number(it.quantity ?? 1) : 0);
    return s + total;
  }, 0);
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
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-600 dark:text-slate-400">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {items.map((it: any, idx: number) => {
                  const ms = scope.find((s) => matchBidItem(it, s));
                  const nm = it?.item?.name ?? ms?.name ?? it.name ?? it.item_name ?? "—";
                  const qty = it.quantity ?? ms?.quantity ?? "—";
                  const unitPrice = it.unit_price != null && it.unit_price !== "" ? Number(it.unit_price) : null;
                  const itemTotal = it.item_total != null && it.item_total !== "" ? Number(it.item_total) : (unitPrice != null ? unitPrice * Number(qty || 1) : null);
                  const delivery = it.lead_time_days ?? it.date_of_delivery ?? it.delivery_date ?? "—";
                  const comments = it.comments ?? it.comment ?? it.notes ?? "—";
                  return (
                    <tr key={idx} className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono text-slate-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        <div>{nm}</div>
                        {it?.item?.sku && <div className="font-mono text-[10px] text-slate-400">{it.item.sku}</div>}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700 dark:text-slate-300">{qty}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{unitPrice != null ? fmt(unitPrice) : "—"}</td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">{itemTotal != null ? fmt(itemTotal) : "—"}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{delivery}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{comments}</td>
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

export function parseVendorsList(input: any): QuotationVendorSubmission[] {
  if (!input) return [];
  let val = input;
  if (typeof val === "string") {
    try {
      val = JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (Array.isArray(val)) {
    return val;
  }
  if (typeof val === "object") {
    const candidate =
      val.vendors ??
      val.vendors_quote_details ??
      val.vendor_quotations ??
      val.vendor_submissions ??
      val.quotation_vendors ??
      val.vendor_quotes ??
      val.vendor_responses ??
      val.vendors_data ??
      val.data ??
      val.results;
    if (candidate && candidate !== val) {
      return parseVendorsList(candidate);
    }
  }
  return [];
}

type Props = { quotationId: number; quoteName?: string; detail: QuotationDetail; onGoToPricingTab?: () => void; onSent?: () => void; };

export function QuotationVendorQuotationsTab({ quotationId, quoteName, detail, onGoToPricingTab, onSent }: Props) {
  const [sendModalOpen, setSendModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [vendorFilter, setVendorFilter] = React.useState("all");
  const [refreshing, setRefreshing] = React.useState(false);
  const [vendors, setVendors] = React.useState<QuotationVendorSubmission[]>(() =>
    parseVendorsList(detail),
  );
  const [bidModal, setBidModal] = React.useState<{ open: boolean; sub: QuotationVendorSubmission | null }>({ open: false, sub: null });
  const [sigDlg, setSigDlg] = React.useState<{ open: boolean; url: string | null; name: string }>({ open: false, url: null, name: "" });

  // Sync state whenever detail prop changes
  React.useEffect(() => {
    const fromDetail = parseVendorsList(detail);
    if (fromDetail.length > 0) {
      setVendors(fromDetail);
    }
  }, [detail]);

  // Initial fetch with ?include=vendors if not already in detail or if empty
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fromDetail = parseVendorsList(detail);
        if (fromDetail.length > 0) {
          setVendors(fromDetail);
          return;
        }
        const fresh: any = await fetchQuotation(quotationId, { include: "vendors" });
        const vList = parseVendorsList(fresh);
        if (!cancelled && vList.length > 0) {
          setVendors(vList);
          return;
        }
        const rawFresh: any = await fetchQuotation(quotationId);
        const rawList = parseVendorsList(rawFresh);
        if (!cancelled && rawList.length > 0) {
          setVendors(rawList);
        }
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quotationId, detail]);

  const rfqItems = React.useMemo(() => extractVendorRfqItems(detail, vendors), [detail, vendors]);
  const gridRows = React.useMemo(() => buildGridRows(rfqItems, vendors), [rfqItems, vendors]);

  const uniqueVendors = React.useMemo(() => {
    const seen = new Map<number, string>();
    vendors.forEach((v) => {
      if (v?.vendor?.id != null && !seen.has(v.vendor.id)) {
        seen.set(v.vendor.id, v.vendor.name);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [vendors]);

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return gridRows;
    return gridRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.sku.toLowerCase().includes(q) ||
        (r.groupName?.toLowerCase().includes(q) ?? false) ||
        r.bids.some((b) => b.submission.vendor.name.toLowerCase().includes(q)),
    );
  }, [gridRows, search]);

  function getFilteredBids(row: GridRow): VendorBidRow[] {
    return row.bids.filter((b) => {
      if (vendorFilter !== "all" && String(b.submission.vendor.id) !== vendorFilter) return false;
      return true;
    });
  }

  const submitted = vendors.filter((v) => isVendorSubmitted(v.status)).length;

  const lowestTotal = React.useMemo(() => {
    const vals: number[] = [];
    vendors.forEach((v) => {
      if (!isVendorSubmitted(v.status)) return;
      const vItems = v.vendor_items ?? v.items ?? [];
      const sum = vItems.reduce((s: number, it: any) => {
        const lineTot = it.item_total != null && it.item_total !== "" ? Number(it.item_total) : (it.unit_price != null ? Number(it.unit_price) * Number(it.quantity ?? 1) : 0);
        return s + lineTot;
      }, 0);
      if (sum > 0) vals.push(sum);
    });
    return vals.length ? Math.min(...vals) : null;
  }, [vendors]);

  const lowestVendorId = React.useMemo(() => {
    const m = new Map<number, number>();
    vendors.forEach((v) => {
      if (!isVendorSubmitted(v.status)) return;
      const vItems = v.vendor_items ?? v.items ?? [];
      const sum = vItems.reduce((s: number, it: any) => {
        const lineTot = it.item_total != null && it.item_total !== "" ? Number(it.item_total) : (it.unit_price != null ? Number(it.unit_price) * Number(it.quantity ?? 1) : 0);
        return s + lineTot;
      }, 0);
      if (sum > 0) m.set(v.vendor.id, sum);
    });
    if (!m.size) return null;
    let minId: number | null = null;
    let minVal = Infinity;
    m.forEach((val, id) => {
      if (val < minVal) {
        minVal = val;
        minId = id;
      }
    });
    return minId;
  }, [vendors]);

  const lowestPricePerItem = React.useMemo(() => {
    const m = new Map<string, number>();
    gridRows.forEach((r) => {
      const prices = r.bids
        .filter((b) => b.unitPrice != null && Number(b.unitPrice) > 0 && isVendorSubmitted(b.submission.status))
        .map((b) => Number(b.unitPrice!));
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
    try {
      const fresh: any = await fetchQuotation(quotationId, { include: "vendors" });
      const vList = parseVendorsList(fresh);
      if (vList.length > 0) {
        setVendors(vList);
      } else {
        const rawFresh: any = await fetchQuotation(quotationId);
        const rawList = parseVendorsList(rawFresh);
        setVendors(rawList);
      }
    } finally {
      setRefreshing(false);
    }
  }, [quotationId, refreshing]);

  const hasVendors = vendors.length > 0;
  const visibleVendors = vendorFilter === "all" ? vendors : vendors.filter((v) => String(v.vendor.id) === vendorFilter);

  const [updatingStatusKey, setUpdatingStatusKey] = React.useState<string | null>(null);

  const handleApprove = React.useCallback(
    async (row: GridRow, bid: VendorBidRow) => {
      const rowKey = `${row.key}-${bid.submission.vendor.id}`;
      if (updatingStatusKey) return;

      const isSubmitted = isVendorSubmitted(bid.submission.status);
      const hasValidPrice = bid.unitPrice != null && Number(bid.unitPrice) > 0;
      if (!isSubmitted || !hasValidPrice) {
        toastError("Cannot approve: Vendor quotation is not submitted or unit price is missing.");
        return;
      }

      const nestedItemId =
        typeof bid.matchedItem?.item === "object"
          ? bid.matchedItem.item?.id
          : bid.matchedItem?.item;
      const itemId = nestedItemId ?? bid.matchedItem?.item_id ?? row.itemId;
      if (itemId == null) {
        toastError("Cannot approve: item ID is missing.");
        return;
      }

      const quotationVendorId = bid.submission.quotation_vendor_id;
      if (quotationVendorId == null) {
        toastError("Cannot approve: vendor quotation ID is missing.");
        return;
      }

      setUpdatingStatusKey(rowKey);
      try {
        const res = await updateQuotationItemsStatus(quotationId, {
          quotation_vendor_id: Number(quotationVendorId),
          item_ids: [Number(itemId)],
          status: "approved",
        });
        toastSuccess(res.message ?? `${row.name} approved`);
        await handleRefresh();
        onSent?.();
      } catch (err: any) {
        toastApiError(err, "Failed to approve quotation item");
      } finally {
        setUpdatingStatusKey(null);
      }
    },
    [updatingStatusKey, quotationId, handleRefresh, onSent],
  );

  return (
    <div className="space-y-4">
      {/* Vendor Quotations Grid */}
      <DetailPanelCard
        title="Vendor Quotations"
        headerRight={
          <div className="flex flex-wrap items-center gap-2">
            <AppButton
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setSendModalOpen(true)}
              className="h-8 text-xs font-medium"
            >
              <Building2 className="mr-1.5 size-3.5" />
              Send to Vendors
            </AppButton>
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
                  <option value="all">All Vendors ({uniqueVendors.length})</option>
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
              Add sections, plots, and items in the Scope &amp; Pricing tab to generate RFQ line items for vendors.
            </p>
            {onGoToPricingTab && (
              <AppButton type="button" variant="secondary" size="sm" className="mt-4" onClick={onGoToPricingTab}>
                Go to Scope &amp; Pricing
                <ArrowRight className="ml-1.5 size-3.5" />
              </AppButton>
            )}
          </div>
        ) : (
          <div>
            {/* Flat grid: grouped by item, with vendors, prices, expected delivery, and actions */}
            <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60">
                    <th className="sticky left-0 z-10 min-w-[200px] border-r border-slate-200/60 bg-slate-50 px-4 py-3 font-semibold text-slate-600 dark:border-slate-800/60 dark:bg-slate-900/60 dark:text-slate-400">
                      Item Name
                    </th>
                    <th className="min-w-[180px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                      Vendor
                    </th>
                    <th className="min-w-[130px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                      Unit Price
                    </th>
                    <th className="min-w-[150px] px-4 py-3 font-semibold text-slate-600 dark:text-slate-400">
                      Expected Delivery
                    </th>
                    <th className="min-w-[130px] px-4 py-3 text-left font-semibold text-slate-600 dark:text-slate-400">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {(() => {
                    const rows = filteredRows.flatMap((row, ri) => {
                      const bids = getFilteredBids(row);
                      const lowPrice = lowestPricePerItem.get(row.key);
                      const rowBg = ri % 2 === 0 ? "bg-white dark:bg-slate-950/20" : "bg-slate-50/40 dark:bg-slate-900/20";

                      if (bids.length === 0) {
                        return [
                          <tr
                            key={row.key}
                            className={cn(
                              "group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-950/10",
                              rowBg,
                              ri > 0 && "border-t-2 border-slate-200/80 dark:border-slate-800",
                            )}
                          >
                            <td
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
                            <td className="px-4 py-3.5 align-top text-slate-400 dark:text-slate-600">—</td>
                            <td className="px-4 py-3.5 align-top text-slate-400 dark:text-slate-600">—</td>
                            <td className="px-4 py-3.5 align-top text-slate-400 dark:text-slate-600">—</td>
                            <td className="px-4 py-3.5 align-top text-slate-400 dark:text-slate-600">—</td>
                          </tr>,
                        ];
                      }

                      return bids.map((bid, bi) => {
                        const isSubmitted = isVendorSubmitted(bid.submission.status);
                        const hasValidPrice = bid.unitPrice != null && Number(bid.unitPrice) > 0;
                        const isApproved = bid.matchedItem?.status?.toLowerCase() === "approved";
                        const isLow =
                          hasValidPrice &&
                          lowPrice != null &&
                          bid.unitPrice === lowPrice &&
                          isSubmitted;
                        const hasBid = bid.unitPrice != null || bid.deliveryDate != null;
                        const ss = statusStyle(bid.submission.status);
                        const isFirstBid = bi === 0;
                        const isApprovalEnabled = isSubmitted && hasValidPrice && !isApproved && updatingStatusKey == null;

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
                                {hasValidPrice && <AppButton
                                  type="button"
                                  size="sm"
                                  variant={isApproved ? "secondary" : "primary"}
                                  loading={updatingStatusKey === `${row.key}-${bid.submission.vendor.id}`}
                                  disabled={!isApprovalEnabled}
                                  onClick={() => void handleApprove(row, bid)}
                                  className={cn(
                                    "h-7 px-2.5 text-xs font-semibold",
                                    isApproved && "border-emerald-200 bg-emerald-50 text-emerald-700 opacity-90 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
                                  )}
                                  title={
                                    isApproved
                                      ? "This item has already been approved"
                                      : !isSubmitted
                                        ? "Vendor quotation must be submitted to approve"
                                        : !hasValidPrice
                                          ? "No valid unit price provided by vendor"
                                          : `Approve ${row.name}`
                                  }
                                >
                                  {isApproved ? (
                                    <>
                                      <Check className="mr-1 size-3.5 text-emerald-600 dark:text-emerald-400" />
                                      Approved
                                    </>
                                  ) : (
                                    <>
                                      <Check className="mr-1 size-3.5" />
                                      Approve
                                    </>
                                  )}
                                </AppButton>}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    });

                    if (rows.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            {search.trim()
                              ? <>No items matched &ldquo;{search}&rdquo;</>
                              : "No items or vendor quotations match the selected filters."}
                          </td>
                        </tr>
                      );
                    }

                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
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
