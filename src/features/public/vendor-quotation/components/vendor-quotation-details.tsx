"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useParams, useSearchParams } from "next/navigation";
import {
  Calendar,
  CheckCircle2,
  FileText,
  Loader2,
  AlertTriangle,
  MessageSquare,
  Search,
  X,
  Send,
} from "lucide-react";
import {
  fetchPublicQuotationByToken,
  submitPublicQuotationResponse,
} from "@/features/public/quotation/api/public-pin.api";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import SignaturePad from "@/shared/form/components/signature-pad";

export const STANDARD_DELIVERY_DURATIONS = [
  "Immediate (In Stock)",
  "1 - 2 Business Days",
  "3 - 5 Business Days",
  "5 Days",
  "1 Week",
  "2 Weeks",
  "1 - 2 Weeks",
  "2 - 3 Weeks",
  "More",
];

/* ── Types ── */

interface VendorLineItem {
  key: string;
  itemId?: number | null;
  compositeId: number | null;
  compositeIds?: number[];
  name: string;
  sku: string;
  groupName: string | null;
  quantity: number;
  unit: string;
  costPrice?: string | null;
  sellingPrice?: string | null;
  quotedPrice: string;
  deliveryDate: string;
}

/* ── Helpers ── */

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtMoney(amount: number, symbol = "$"): string {
  return `${symbol} ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "—") return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1 text-xs">
      <dt className="w-28 shrink-0 font-medium text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-900 text-right min-w-0 break-words">{value}</dd>
    </div>
  );
}

function getCustomerName(detail: QuotationDetail): string {
  const d = detail as any;
  const c = d.customer ?? d.customer_name ?? d.client ?? d.client_name;
  if (!c) return "—";
  if (typeof c === "string") return c.trim() || "—";
  if (typeof c === "number") return `Customer #${c}`;
  if (typeof c === "object" && "name" in c) return c.name ?? "—";
  return "—";
}

function getSiteName(detail: QuotationDetail): string {
  const d = detail as any;
  if (d.sites && Array.isArray(d.sites) && d.sites.length > 0) {
    return d.sites
      .map((s: any) => (typeof s === "object" ? s.site_name ?? s.name : `Site #${s}`))
      .join(", ");
  }
  const s = d.site ?? d.site_name;
  if (!s) return "—";
  if (typeof s === "string") return s.trim() || "—";
  if (typeof s === "number") return `Site #${s}`;
  if (typeof s === "object" && "site_name" in s) return s.site_name ?? "—";
  if (typeof s === "object" && "name" in s) return s.name ?? "—";
  return "—";
}

function getProjectName(detail: QuotationDetail): string {
  const d = detail as any;
  const p = d.project ?? d.project_name;
  if (!p) return "—";
  if (typeof p === "string") return p.trim() || "—";
  if (typeof p === "number") return `Project #${p}`;
  if (typeof p === "object" && "name" in p) return p.name ?? "—";
  return "—";
}

function getContactName(detail: QuotationDetail): string {
  const d = detail as any;
  const c = d.primary_customer_contact ?? d.contact ?? d.primary_contact;
  if (!c) return "—";
  if (typeof c === "string") return c.trim() || "—";
  if (typeof c === "number") return `#${c}`;
  if (typeof c === "object") {
    return c.name ?? c.full_name ?? c.first_name ?? "—";
  }
  return "—";
}

function getVendorName(detail: QuotationDetail): string | null {
  const d = detail as any;
  const ac = d.access_context;
  if (ac && typeof ac === "object") {
    if (ac.vendor_name) return ac.vendor_name;
    if (ac.name) return ac.name;
    if (ac.recipient_name) return ac.recipient_name;
  }
  if (d.vendor_name) return d.vendor_name;
  if (d.vendor && typeof d.vendor === "object") return d.vendor.name ?? d.vendor.vendor_name ?? null;
  if (d.vendor && typeof d.vendor === "string") return d.vendor;
  return null;
}

function getResolvedStatus(detail: QuotationDetail | null | undefined): string {
  if (!detail) return "draft";
  const ac = (detail as any).access_context;
  let s: string | null = null;
  if (typeof ac === "string") {
    s = ac;
  } else if (ac && typeof ac === "object") {
    s = ac.status ?? ac.status_name ?? ac.value ?? ac.state;
  }
  s = s ?? (detail as any).vendor_status ?? detail.status ?? "sent";
  return String(s).toLowerCase().trim();
}

function getStatusMeta(status: string | null | undefined): { label: string; bg: string; text: string } {
  switch ((status ?? "").toLowerCase().trim()) {
    case "approved":
    case "accepted":
      return { label: "Approved", bg: "#dcfce7", text: "#166534" };
    case "submit":
    case "submitted":
      return { label: "Submitted", bg: "#dcfce7", text: "#166534" };
    case "rejected":
    case "declined":
      return { label: "Rejected", bg: "#fee2e2", text: "#991b1b" };
    case "sent":
    case "pending":
      return { label: "Sent", bg: "#e0f2fe", text: "#0369a1" };
    case "questioned":
      return { label: "Questioned", bg: "#fef3c7", text: "#92400e" };
    case "draft":
    default:
      return { label: "Draft", bg: "#f1f5f9", text: "#475569" };
  }
}

/* ── Group items across vendor_items, composite_items or quote_sections ── */

function extractGroupedItems(detail: QuotationDetail): VendorLineItem[] {
  // 1. Primary: Extract from vendor_items / items (new response structure)
  const vendorItems =
    (detail as any).vendor_items ??
    (detail as any).vendorItems ??
    (detail as any).items;
  if (Array.isArray(vendorItems) && vendorItems.length > 0) {
    const list: VendorLineItem[] = [];
    vendorItems.forEach((vi: any, idx: number) => {
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
        (itemId ? `Item #${itemId}` : `Item #${idx + 1}`)
      ).trim();

      const sku = (itemObj?.sku ?? vi.sku ?? vi.item_sku ?? "").trim();
      const qty = Number(vi.quantity ?? vi.qty ?? 1);

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
      const costPrice =
        itemObj?.cost_price != null
          ? String(itemObj.cost_price)
          : vi.cost_price != null
          ? String(vi.cost_price)
          : null;
      const sellingPrice =
        itemObj?.selling_price != null
          ? String(itemObj.selling_price)
          : vi.selling_price != null
          ? String(vi.selling_price)
          : null;

      const quotedPrice =
        vi.unit_price != null && vi.unit_price !== "" ? String(vi.unit_price) : "";
      const deliveryDate =
        vi.lead_time_days != null && vi.lead_time_days !== ""
          ? String(vi.lead_time_days)
          : vi.date_of_delivery ?? vi.delivery_date ?? "";
      const key =
        itemId != null ? `item_${itemId}` : vi.id != null ? `vi_${vi.id}` : `row_${idx}`;

      list.push({
        key,
        itemId,
        compositeId: vi.composite_item ?? vi.composite_item_id ?? null,
        compositeIds: vi.composite_item ? [Number(vi.composite_item)] : [],
        name,
        sku,
        groupName,
        quantity: qty,
        unit,
        costPrice,
        sellingPrice,
        quotedPrice,
        deliveryDate,
      });
    });

    if (list.length > 0) return list;
  }

  // 2. Secondary: Extract and group items from composite_items array
  let compositeItems = (detail as any).composite_items ?? (detail as any).compositeItems;
  if (typeof compositeItems === "string") {
    try {
      compositeItems = JSON.parse(compositeItems);
    } catch {
      compositeItems = null;
    }
  }

  if (Array.isArray(compositeItems) && compositeItems.length > 0) {
    const map = new Map<
      string,
      {
        itemId: number | null;
        compositeId: number | null;
        compositeIds: number[];
        name: string;
        sku: string;
        groupName: string | null;
        unit: string;
        quantity: number;
        costPrice?: string | null;
        sellingPrice?: string | null;
      }
    >();

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
        const unit = item.unit ?? item.unit_type ?? "Unit";
        const groupName = item.group_name ?? item.groupName ?? compEntry.group_name ?? null;

        // Group key: prefer item ID, then SKU, then normalized name
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
          if (compId != null && !existing.compositeIds.includes(compId)) {
            existing.compositeIds.push(compId);
          }
        } else {
          map.set(key, {
            itemId,
            compositeId: compId,
            compositeIds: compId != null ? [compId] : [],
            name,
            sku,
            groupName,
            unit,
            quantity: qty,
            costPrice: item.cost_price != null ? String(item.cost_price) : null,
            sellingPrice: item.selling_price != null ? String(item.selling_price) : null,
          });
        }
      });
    });

    if (map.size > 0) {
      return Array.from(map.entries()).map(([key, data]) => ({
        key,
        itemId: data.itemId,
        compositeId: data.compositeId,
        compositeIds: data.compositeIds,
        name: data.name,
        sku: data.sku,
        groupName: data.groupName,
        quantity: data.quantity,
        unit: data.unit,
        costPrice: data.costPrice,
        sellingPrice: data.sellingPrice,
        quotedPrice: "",
        deliveryDate: "",
      }));
    }
  }

  // 2. Fallback: Extract from quote_sections if composite_items is not available
  const sections = (detail as any).quote_sections ?? [];
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

  const map = new Map<
    string,
    {
      itemId: number | null;
      name: string;
      sku: string;
      groupName: string | null;
      unit: string;
      quantity: number;
      compositeId: number | null;
    }
  >();

  rawPins.forEach((pin: any) => {
    const compId: number | null =
      pin.composite_item_id != null
        ? Number(pin.composite_item_id)
        : null;

    const itemId: number | null =
      pin.item_id != null
        ? Number(pin.item_id)
        : null;

    const name: string =
      pin.name ?? pin.item_name ?? (compId ? `Composite Item #${compId}` : "Unknown Item");

    const key: string =
      itemId != null
        ? `item_${itemId}`
        : compId != null
        ? `cmp_${compId}`
        : `name_${name.toLowerCase().trim().replace(/\s+/g, "_")}`;

    const qty = Number(pin.quantity ?? 1);
    const groupName: string | null = pin.group_name ?? null;
    const sku: string = pin.sku ?? (compId ? `CMP-${compId}` : "");
    const unit: string = pin.unit ?? "Unit";

    if (map.has(key)) {
      const existing = map.get(key)!;
      existing.quantity += qty;
      if (!existing.groupName && groupName) existing.groupName = groupName;
      if (!existing.sku && sku) existing.sku = sku;
    } else {
      map.set(key, { itemId, name, sku, groupName, unit, quantity: qty, compositeId: compId });
    }
  });

  return Array.from(map.entries()).map(([key, data]) => ({
    key,
    itemId: data.itemId,
    compositeId: data.compositeId,
    name: data.name,
    sku: data.sku,
    groupName: data.groupName,
    quantity: data.quantity,
    unit: data.unit,
    quotedPrice: "",
    deliveryDate: "",
  }));
}

/* ── Loading / Error screens ── */

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <Loader2 className="size-10 animate-spin text-slate-700" />
      <p className="text-sm font-medium text-slate-600">Loading quotation request…</p>
    </div>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <div className="flex flex-col items-center gap-3 text-center max-w-sm">
        <div className="rounded-full bg-red-50 p-3">
          <AlertTriangle className="size-8 text-red-400" />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">Unable to load quotation</h1>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </div>
  );
}

function getAccessContextStatus(detail: QuotationDetail | null | undefined): string | null {
  if (!detail) return null;
  const ac = (detail as any).access_context;
  if (!ac) return null;
  if (typeof ac === "string") return ac.toLowerCase().trim();
  if (typeof ac === "object") {
    const s = ac.status ?? ac.status_name ?? ac.value ?? ac.state;
    if (typeof s === "string") return s.toLowerCase().trim();
  }
  return null;
}

function SubmittedScreen({ detail }: { detail?: QuotationDetail | null }) {
  const customerName = detail ? getCustomerName(detail) : null;
  const projectName = detail ? getProjectName(detail) : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center space-y-5">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <CheckCircle2 className="size-9" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            <span className="size-1.5 rounded-full bg-emerald-600" />
            Response Submitted
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Quotation Already Submitted
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            {detail?.quote_name ? (
              <>
                Your pricing and delivery response for{" "}
                <span className="font-semibold text-slate-800">
                  {detail.quote_name}
                </span>{" "}
                has already been submitted and received.
              </>
            ) : (
              "This quotation response has already been submitted and received."
            )}
          </p>
        </div>
{/* 
        {detail ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 text-left divide-y divide-slate-200/60 text-xs">
            {detail.quote_name && (
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Quotation</span>
                <span className="font-semibold text-slate-900 text-right truncate max-w-[240px]">
                  {detail.quote_name}
                </span>
              </div>
            )}
            {detail.quotation_serial_number && (
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Quotation #</span>
                <span className="font-mono font-medium text-slate-700">
                  #{detail.quotation_serial_number}
                </span>
              </div>
            )}
            {customerName && customerName !== "—" && (
              <div className="flex justify-between py-1.5">
                <span className="text-slate-500">Customer</span>
                <span className="font-medium text-slate-800 text-right">{customerName}</span>
              </div>
            )}
           
          </div>
        ) : null} */}

        <p className="text-[11px] text-slate-400">
          No further actions are required. If you need to revise your quotation, please contact the project manager directly.
        </p>
      </div>
    </div>
  );
}

/* ── Acceptance / Submit Dialog ── */

function AcceptanceDialog({
  open,
  onClose,
  onConfirmAcceptance,
  isSubmitting,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmAcceptance: (signature: string | null) => void;
  isSubmitting?: boolean;
}) {
  const [signature, setSignature] = useState<string | null>(null);

  const handleClose = () => {
    if (isSubmitting) return;
    setSignature(null);
    onClose();
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-emerald-600 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Submit Quotation</h2>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10 disabled:opacity-50"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-3">
            <CheckCircle2 className="size-5 text-emerald-500 mt-0.5 shrink-0" />
            <p className="text-sm text-emerald-800 leading-relaxed">
              By submitting, you confirm the provided prices and delivery dates are accurate and final.
            </p>
          </div>
          <div className="mb-5">
            <SignaturePad
              name="vendor-signature"
              label="Authorised Signature (optional)"
              value={signature ?? ""}
              onChange={(v) => setSignature(v || null)}
              height={120}
              appearance="light"
              placeholder="Draw signature here…"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => {
                onConfirmAcceptance(signature);
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="size-4 animate-spin" />}
              {isSubmitting ? "Submitting…" : "Submit Quotation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Question Dialog ── */

function QuestionDialog({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
}) {
  const [text, setText] = useState("");
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-800 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Raise a Query</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">
            Your Query
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ask about scope, specifications, quantities, or delivery…"
            className="w-full text-sm border border-slate-300 rounded-xl p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none mb-4"
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!text.trim()}
              onClick={() => {
                onSubmit(text);
                setText("");
                onClose();
              }}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
            >
              Submit Query
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Reject Dialog ── */

function RejectDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-red-600 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold">Decline Request</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 mb-4">
            Are you sure you want to decline this quotation request? This action cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-red-600 text-white hover:bg-red-700"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Vendor Quotation Component ── */

export function VendorQuotationDetails() {
  const params = useParams();
  const searchParams = useSearchParams();

  const token =
    (Array.isArray(params?.token) ? params.token[0] : params?.token) ??
    searchParams.get("token") ??
    null;

  /* ── API state ── */
  const [detail, setDetail] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError("No quotation token provided.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchPublicQuotationByToken(token)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Failed to load quotation. The link may be invalid or expired.");
          toastApiError(err, "Failed to load quotation");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  /* ── Grouped items from API ── */
  const baseItems = useMemo(() => (detail ? extractGroupedItems(detail) : []), [detail]);

  /* ── Line items state ── */
  const [lineItems, setLineItems] = useState<VendorLineItem[]>([]);
  useEffect(() => {
    setLineItems(baseItems);
  }, [baseItems]);

  const handlePriceChange = useCallback((key: string, value: string) => {
    setLineItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, quotedPrice: value } : it)),
    );
  }, []);

  const handleDateChange = useCallback((key: string, value: string) => {
    setLineItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, deliveryDate: value } : it)),
    );
  }, []);

  /* ── UI state ── */
  const [searchQuery, setSearchQuery] = useState("");
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  const currencySymbol = (detail as any)?.currency_symbol ?? "$";
  const resolvedStatus = getResolvedStatus(detail);
  const statusMeta = getStatusMeta(resolvedStatus);

  const filledCount = lineItems.filter(
    (it) =>
      it.quotedPrice.trim() !== "" &&
      (parseFloat(it.quotedPrice) || 0) > 0 &&
      it.deliveryDate.trim() !== "",
  ).length;
  const allFilled = lineItems.length > 0 && filledCount === lineItems.length;

  const totalQuantity = useMemo(
    () => lineItems.reduce((acc, it) => acc + (it.quantity || 0), 0),
    [lineItems],
  );

  const totalQuotedAmount = useMemo(
    () =>
      lineItems.reduce((acc, it) => {
        const price = parseFloat(it.quotedPrice) || 0;
        return acc + price * (it.quantity || 0);
      }, 0),
    [lineItems],
  );

  const isSubmitInAccessContext =
    resolvedStatus === "submit" || resolvedStatus === "submitted";

  /* ── Render states ── */
  if (loading) return <LoadingScreen />;
  if (error || !detail) return <ErrorScreen message={error ?? "Quotation not found."} />;
  if (isSubmitInAccessContext) return <SubmittedScreen detail={detail} />;

  const customerName = getCustomerName(detail);
  const siteName = getSiteName(detail);
  const projectName = getProjectName(detail);
  const contactName = getContactName(detail);
  const vendorName = getVendorName(detail);

  const quoteTitle =
    detail.quote_name?.trim() ||
    (detail as any).name?.trim() ||
    (detail as any).title?.trim() ||
    (detail as any).quotation_name?.trim() ||
    (detail.id ? `Quotation #${detail.id}` : "Quotation Details");

  const serialNumber =
    detail.quotation_serial_number?.trim() ||
    (detail as any).serial_number?.trim() ||
    (detail as any).quotation_number?.trim() ||
    (detail as any).reference_number?.trim() ||
    (detail.id ? `#${detail.id}` : null);

  const isActioned = ["approved", "accepted", "rejected", "submit", "submitted"].includes(resolvedStatus);

  const visibleItems = searchQuery.trim()
    ? lineItems.filter((it) => {
        const q = searchQuery.toLowerCase();
        return (
          it.name.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          (it.groupName ?? "").toLowerCase().includes(q)
        );
      })
    : lineItems;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* ── Document Container ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-36 mx-auto">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── LEFT COLUMN: Document Table View ── */}
          <div className="flex-1 min-w-0 w-full">
            {/* Section label & search bar */}
            <div className="flex items-center justify-between gap-3 mb-2 px-1">
              <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Quotation Items
              </div>
              <div className="relative">
                <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search items..."
                  className="text-xs pl-8 pr-3 py-1 bg-white border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 w-44"
                />
              </div>
            </div>

            {/* Table Container */}
            <div className="border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#334155] text-white">
                    <th className="py-2.5 px-3 text-left font-semibold w-12 text-center">#</th>
                    <th className="py-2.5 px-3 text-left font-semibold">Item / Description</th>
                    <th className="py-2.5 px-3 text-left font-semibold min-w-[140px]">
                      Your Unit Price {!isActioned && <span className="text-red-300">*</span>}
                    </th>
                    <th className="py-2.5 px-3 text-left font-semibold min-w-[150px]">
                      Expected Delivery {!isActioned && <span className="text-red-300">*</span>}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 text-xs">
                        No items found in this quotation.
                      </td>
                    </tr>
                  ) : (
                    visibleItems.map((item, idx) => {
                      const isEven = idx % 2 === 1;

                      return (
                        <tr
                          key={item.key}
                          className={`border-t border-slate-100 hover:bg-slate-50/80 transition-colors ${
                            isEven ? "bg-[#f8fafc]" : "bg-white"
                          }`}
                        >
                          {/* # */}
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">
                            #{idx + 1}
                          </td>

                          {/* Item / Description */}
                          <td className="py-3 px-3 align-middle">
                            <div className="font-semibold text-slate-900 text-xs">
                              {item.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {item.sku && (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                                  {item.sku}
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                                Qty: {item.quantity}
                              </span>
                              {item.groupName && (
                                <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px] font-medium">
                                  {item.groupName}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Your Unit Price Input */}
                          <td className="py-3 px-3 align-middle">
                            <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-1 focus-within:border-slate-800 focus-within:ring-1 focus-within:ring-slate-800 w-32 shadow-xs">
                              <span className="text-slate-400 font-mono text-xs">{currencySymbol}</span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                required
                                disabled={isActioned}
                                placeholder="0.00"
                                value={item.quotedPrice}
                                onChange={(e) => handlePriceChange(item.key, e.target.value)}
                                className="w-full text-right text-xs font-semibold text-slate-900 bg-transparent outline-none tabular-nums placeholder:text-slate-300 disabled:text-slate-500"
                              />
                            </div>
                          </td>

                          {/* Expected Delivery Duration Select */}
                          <td className="py-3 px-3 align-middle">
                            <select
                              required
                              disabled={isActioned}
                              value={item.deliveryDate}
                              onChange={(e) => handleDateChange(item.key, e.target.value)}
                              className="w-full text-xs font-medium text-slate-800 bg-white p-1.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-slate-800 disabled:text-slate-500 disabled:bg-slate-50 cursor-pointer"
                            >
                              <option value="">Select duration...</option>
                              {STANDARD_DELIVERY_DURATIONS.map((opt) => (
                                <option key={opt} value={opt}>
                                  {opt}
                                </option>
                              ))}
                            </select>
                          </td>

                        </tr>
                      );
                    })
                  )}

                  {visibleItems.length === 0 && searchQuery.trim() && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                        No items match &ldquo;{searchQuery}&rdquo;.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Sidebar (Identical to reference screenshot) ── */}
          <aside className="w-full lg:w-80 xl:w-88 shrink-0 lg:sticky lg:top-6 space-y-4">
            
            {/* 1. Identity Card */}
            <div className="border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-1">
                    QUOTATION
                  </p>
                  <h2 className="text-base font-bold text-slate-900 leading-snug break-words">
                    {quoteTitle}
                  </h2>
                  {serialNumber && (
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">
                      {serialNumber.startsWith("#") ? serialNumber : `#${serialNumber}`}
                    </p>
                  )}
                </div>
                <span
                  className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: statusMeta.bg, color: statusMeta.text }}
                >
                  {statusMeta.label}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-1 text-sm border-t border-slate-100 pt-3">
                {vendorName && <InfoRow label="Vendor" value={vendorName} />}
                <InfoRow label="Customer" value={customerName} />
                <InfoRow label="Project" value={projectName} />
                <InfoRow label="Site" value={siteName} />
                {detail.order_number?.trim() && (
                  <InfoRow label="Order Ref" value={detail.order_number} />
                )}
                {(detail as any).due_date && (
                  <InfoRow label="Due Date" value={fmtDate((detail as any).due_date)} />
                )}
                {(detail as any).created_at && (
                  <InfoRow label="Created" value={fmtDate((detail as any).created_at)} />
                )}
              </dl>
            </div>

            {/* 2. People & Roles */}
            {contactName !== "—" && (
              <div className="border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  PEOPLE &amp; ROLES
                </p>
                <dl className="grid grid-cols-1 gap-1 text-sm">
                  <InfoRow label="Primary Contact" value={contactName} />
                </dl>
              </div>
            )}

            {/* 3. Quotation Summary */}
            {lineItems.length > 0 && (
              <div className="border border-slate-200 bg-white p-5 shadow-xs">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">
                  SUMMARY
                </p>
                <dl className="grid grid-cols-1 gap-1 text-sm">
                  <InfoRow label="Total Items" value={String(lineItems.length)} />
                  <InfoRow label="Total Qty" value={String(totalQuantity)} />
                  {totalQuotedAmount > 0 && (
                    <InfoRow
                      label="Quoted Total"
                      value={`${currencySymbol}${totalQuotedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    />
                  )}
                </dl>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* ── Bottom Fixed Action Bar ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-10 shadow-md">
        <div className="max-w-[1400px] mx-auto flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-500 sm:text-left">
            {isActioned
              ? `This quotation has already been ${resolvedStatus === "rejected" || resolvedStatus === "declined" ? "declined" : "submitted"}.`
              : "Please enter your unit price and delivery duration for each item, then submit."}
          </p>
          {!isActioned && (
            <div className="flex shrink-0 items-center justify-center">
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={() => {
                  if (!allFilled) {
                    const missingCount = lineItems.length - filledCount;
                    toastApiError(
                      new Error(`Please fill in both unit price and delivery duration for all items (${missingCount} remaining).`),
                      "Incomplete Quotation",
                    );
                    return;
                  }
                  setIsAcceptDialogOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-1.5 rounded text-sm cursor-pointer font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-xs"
              >
                <Send className="size-3.5" />
                Submit Quotation
              </button>
            </div>
          )}
        </div>
      </footer>

      {/* ── Dialogs ── */}
      <AcceptanceDialog
        open={isAcceptDialogOpen}
        isSubmitting={isSubmittingApproval}
        onClose={() => setIsAcceptDialogOpen(false)}
        onConfirmAcceptance={async (signatureData) => {
          if (!token || isSubmittingApproval) return;
          try {
            setIsSubmittingApproval(true);
            const items = lineItems.map((item) => {
              const price = parseFloat(item.quotedPrice) || 0;
              return {
                item_id: Number(item.itemId ?? item.compositeId ?? 0),
                unit_price: Number(price.toFixed(2)),
                lead_time_days: item.deliveryDate.trim(),
              };
            });

            await submitPublicQuotationResponse(token, {
              status: "submitted",
              items: JSON.stringify(items),
              signature: signatureData || undefined,
            });
            setIsAcceptDialogOpen(false);
            toastSuccess("Quotation submitted successfully");
            refresh();
          } catch (err) {
            toastApiError(err, "Failed to submit quotation");
          } finally {
            setIsSubmittingApproval(false);
          }
        }}
      />

      <QuestionDialog
        open={isQuestionDialogOpen}
        onClose={() => setIsQuestionDialogOpen(false)}
        onSubmit={async (text) => {
          if (!token) return;
          try {
            await submitPublicQuotationResponse(token, {
              status: "questioned",
              comment: text,
            });
            toastSuccess("Question submitted successfully");
          } catch (err) {
            toastApiError(err, "Failed to submit question");
          }
        }}
      />

      <RejectDialog
        open={isRejectDialogOpen}
        onClose={() => setIsRejectDialogOpen(false)}
        onConfirm={async () => {
          if (!token) return;
          try {
            await submitPublicQuotationResponse(token, { status: "rejected" });
            toastSuccess("Quotation declined");
            refresh();
            setIsRejectDialogOpen(false);
          } catch (err) {
            toastApiError(err, "Failed to decline quotation");
          }
        }}
      />
    </div>
  );
}
