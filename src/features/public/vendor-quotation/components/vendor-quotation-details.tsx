"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  MessageSquare,
  Search,
  X,
  XCircle,
} from "lucide-react";
import {
  initialVendorQuotation,
  type VendorQuotation,
  type VendorQuotationItemGroup,
} from "../data/vendor-quotation.data";

/* ── Dynamic SignaturePad ── */

const SignaturePad = dynamic(
  () => import("@/shared/form/components/signature-pad").then((mod) => mod.default ?? mod),
  { ssr: false },
);

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

function InfoRow({ label, value }: { label: string; value: string }) {
  if (!value || value.trim() === "") return null;
  return (
    <div className="flex items-start gap-2">
      <dt className="w-28 shrink-0 text-xs font-medium text-slate-400 pt-0.5">{label}</dt>
      <dd className="text-slate-800 font-medium min-w-0 break-words text-sm">{value}</dd>
    </div>
  );
}

/* ── Signature Section on Quotation Document ── */

function ClientSignSection({
  signatureUrl,
  signedAt,
  isApproved,
  clientName,
}: {
  signatureUrl: string | null;
  signedAt: string | null;
  isApproved: boolean;
  clientName: string;
}) {
  const showSignature = Boolean(signatureUrl) && isApproved;

  return (
    <div className="mt-8 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-3.5 gap-3">
        <div className="text-sm font-bold text-slate-900">Client Sign</div>
        {isApproved ? (
          <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wider uppercase">
            Approved
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        {/* Signature Box */}
        <div className="border border-slate-200 rounded-lg bg-slate-50/70 p-3.5 min-h-[130px] flex flex-col">
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            Signature
          </div>
          <div className="flex-1 flex items-center justify-center bg-white border border-dashed border-slate-300 rounded min-h-[80px] p-2">
            {showSignature ? (
              <img
                src={signatureUrl!}
                alt="Client signature"
                className="max-w-full max-h-20 object-contain"
              />
            ) : (
              <span className="text-xs text-slate-400">
                {isApproved ? "Approved without a drawn signature" : "Awaiting client signature"}
              </span>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t border-slate-200 text-xs text-slate-700 font-semibold">
            {clientName || "Client"}
          </div>
        </div>

        {/* Date & Print Name Box */}
        <div className="border border-slate-200 rounded-lg bg-white p-3.5 text-xs text-slate-700 flex flex-col gap-3">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Date signed
            </div>
            <div className="border-b border-slate-200 pb-1 font-semibold text-slate-900 min-h-[20px]">
              {showSignature || isApproved ? fmtDate(signedAt) : ""}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Print name
            </div>
            <div className="border-b border-slate-200 pb-1 font-semibold text-slate-900 min-h-[20px]">
              {isApproved ? clientName || "—" : ""}
            </div>
          </div>
          <div className="mt-auto text-[10px] text-slate-400 leading-normal">
            By signing, the client confirms acceptance of this quotation and authorises the work to proceed.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Collapsible Collective Item Group (Document Table) ── */

interface CollapsibleItemGroupProps {
  group: VendorQuotationItemGroup;
  isOpen: boolean;
  onToggle: () => void;
  currencySymbol: string;
  searchQuery: string;
  onUpdateItemPrice: (groupId: string, itemId: string, newPrice: number) => void;
  onUpdateItemDeliveryDate: (groupId: string, itemId: string, newDate: string) => void;
}

function CollapsibleItemGroup({
  group,
  isOpen,
  onToggle,
  currencySymbol,
  searchQuery,
  onUpdateItemPrice,
  onUpdateItemDeliveryDate,
}: CollapsibleItemGroupProps) {
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return group.items;
    const q = searchQuery.toLowerCase();
    return group.items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.specification.toLowerCase().includes(q) ||
        group.groupName.toLowerCase().includes(q),
    );
  }, [group.items, group.groupName, searchQuery]);

  const groupTotal = useMemo(() => {
    return group.items.reduce((sum, item) => sum + item.quantity * item.quotedPrice, 0);
  }, [group.items]);

  const totalQuantity = useMemo(() => {
    return group.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [group.items]);

  if (searchQuery.trim() && filteredItems.length === 0) {
    return null;
  }

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white mb-4">
      {/* Group Header */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between gap-4 text-left border-b border-slate-200 cursor-pointer select-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-6 rounded bg-white border border-slate-300 flex items-center justify-center text-slate-700 shrink-0">
            {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </div>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="text-xs font-bold text-slate-900">{group.groupName}</span>
            <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 text-slate-700 font-semibold">
              {group.groupCode}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-200/70 text-slate-700">
              {group.items.length} {group.items.length === 1 ? "Item" : "Items"}
            </span>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span className="text-xs font-bold text-slate-900 tabular-nums">
            {fmtMoney(groupTotal, currencySymbol)}
          </span>
        </div>
      </button>

      {/* Group Items Table */}
      {isOpen && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/60 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th scope="col" className="py-2.5 px-3 min-w-[240px]">
                  Itmes
                </th>
                <th scope="col" className="py-2.5 px-3 text-center min-w-[100px]">
                  quanity
                </th>
                <th scope="col" className="py-2.5 px-3 text-right min-w-[140px]">
                  qutoted Price
                </th>
                <th scope="col" className="py-2.5 px-3 min-w-[160px]">
                  Expected dilivery date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredItems.map((item) => {
                const lineTotal = item.quantity * item.quotedPrice;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Items Column */}
                    <td className="py-3 px-3 align-middle">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-mono text-[10px]">
                          {item.sku}
                        </span>
                      </div>
                    </td>

                    {/* Quantity Column */}
                    <td className="py-3 px-3 align-middle text-center">
                      <div className="inline-flex flex-col items-center">
                        <span className="font-bold text-slate-900 tabular-nums text-xs">
                          {item.quantity.toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.unit}</span>
                      </div>
                    </td>

                    {/* Quoted Price Column */}
                    <td className="py-3 px-3 align-middle text-right">
                      <div className="space-y-0.5">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-400 text-xs">{currencySymbol}</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.quotedPrice}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              onUpdateItemPrice(group.id, item.id, val);
                            }}
                            className="w-20 text-right text-xs font-semibold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none tabular-nums"
                          />
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 tabular-nums">
                          Total: {fmtMoney(lineTotal, currencySymbol)}
                        </p>
                      </div>
                    </td>

                    {/* Expected Delivery Date Column */}
                    <td className="py-3 px-3 align-middle">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-slate-400 shrink-0" />
                        <input
                          type="date"
                          value={item.expectedDeliveryDate}
                          onChange={(e) => onUpdateItemDeliveryDate(group.id, item.id, e.target.value)}
                          className="text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:bg-white focus:ring-1 focus:ring-slate-900 outline-none"
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-700">
                <td className="py-2 px-3">Subtotal {group.groupName}</td>
                <td className="py-2 px-3 text-center tabular-nums">{totalQuantity.toLocaleString()} Units</td>
                <td className="py-2 px-3 text-right font-bold text-slate-900 tabular-nums">
                  {fmtMoney(groupTotal, currencySymbol)}
                </td>
                <td className="py-2 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

/* ── Acceptance / Signature Dialog (Matching Public Quotation) ── */

function AcceptanceDialog({
  open,
  onClose,
  onConfirmAcceptance,
  clientName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirmAcceptance: (signatureData: string | null) => void;
  clientName: string;
}) {
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSignatureChange = (value: string) => {
    setSignature(value || null);
  };

  const handleSubmit = () => {
    setSubmitted(true);
    onConfirmAcceptance(signature);
  };

  const handleClose = () => {
    setSignature(null);
    setSubmitted(false);
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
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white text-lg font-bold leading-snug">Accept Quotation</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
              aria-label="Close"
            >
              <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {submitted ? (
          /* Success state */
          <div className="px-6 py-10 flex flex-col items-center gap-4 text-center">
            <div className="size-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <svg className="size-7 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-base">Quotation Accepted!</p>
              <p className="text-slate-500 text-sm mt-1">
                Thank you for accepting. The quotation signature has been attached.
              </p>
            </div>
            {signature && (
              <div className="mt-2 w-full">
                <p className="text-xs text-slate-500 mb-1">Signed by {clientName}:</p>
                <img
                  src={signature}
                  alt="Acceptance signature"
                  className="max-w-full h-24 object-contain border border-slate-200 rounded-lg mx-auto"
                />
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          /* Form */
          <div className="px-6 py-5">
            {/* Info */}
            <div className="mb-5 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 flex items-start gap-3">
              <CheckCircle className="size-5 text-emerald-500 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-800 leading-relaxed">
                By accepting this quotation, you confirm the pricing and scope of work are satisfactory and authorise the work to proceed.
              </p>
            </div>

            {/* Signature Pad */}
            <div className="mb-5">
              <SignaturePad
                name="acceptance-signature"
                label="Signature (draw below)"
                value={signature ?? ""}
                onChange={handleSignatureChange}
                height={130}
                placeholder="Draw your signature here..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                Accept &amp; Sign
              </button>
            </div>
          </div>
        )}
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
        <div className="bg-gray-800 px-6 py-5 flex items-center justify-between">
          <h2 className="text-white text-lg font-bold leading-snug">Raise a Question</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="px-6 py-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">
            Your Question or Query
          </label>
          <textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your question regarding terms, scope, line items, or pricing..."
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
              Submit Question
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main Vendor Quotation Component ── */

export function VendorQuotationDetails() {
  const [quotation, setQuotation] = useState<VendorQuotation>(initialVendorQuotation);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    initialVendorQuotation.itemGroups.forEach((g) => {
      initial[g.id] = true;
    });
    return initial;
  });
  const [searchQuery, setSearchQuery] = useState("");

  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    quotation.itemGroups.forEach((g) => {
      next[g.id] = true;
    });
    setOpenGroups(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    quotation.itemGroups.forEach((g) => {
      next[g.id] = false;
    });
    setOpenGroups(next);
  };

  const handleUpdateItemPrice = (groupId: string, itemId: string, newPrice: number) => {
    setQuotation((prev) => ({
      ...prev,
      itemGroups: prev.itemGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, quotedPrice: newPrice };
          }),
        };
      }),
    }));
  };

  const handleUpdateItemDeliveryDate = (groupId: string, itemId: string, newDate: string) => {
    setQuotation((prev) => ({
      ...prev,
      itemGroups: prev.itemGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          items: g.items.map((item) => {
            if (item.id !== itemId) return item;
            return { ...item, expectedDeliveryDate: newDate };
          }),
        };
      }),
    }));
  };

  const handleConfirmAcceptance = (signatureData: string | null) => {
    setQuotation((prev) => ({
      ...prev,
      status: "Approved",
      signatureUrl: signatureData,
      signedAt: new Date().toISOString(),
      signerName: prev.primaryContact.name,
    }));
  };

  /* Calculated Financials */
  const subtotal = useMemo(() => {
    return quotation.itemGroups.reduce((groupSum, group) => {
      return (
        groupSum +
        group.items.reduce((itemSum, item) => itemSum + item.quantity * item.quotedPrice, 0)
      );
    }, 0);
  }, [quotation.itemGroups]);

  const vatAmount = useMemo(() => {
    return subtotal * quotation.taxRate;
  }, [subtotal, quotation.taxRate]);

  const grandTotal = useMemo(() => {
    return subtotal + vatAmount;
  }, [subtotal, vatAmount]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* ── Top Header (Sticky) ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="border border-slate-700 px-2.5 py-1.5 rounded shrink-0 bg-black">
              <span className="text-slate-400 font-bold text-base tracking-tight leading-none">
                RED<span className="text-white">5</span>
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-500 font-medium hidden sm:block">Quotation Review</p>
              <p className="text-sm font-semibold text-black truncate">{quotation.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-slate-500" />
              <span className="text-xs text-slate-400 font-mono">#{quotation.quotationNumber}</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── Page Body ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-32 sm:pb-28">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* ═══════════════════════════════════════════════════════════════
              LEFT COLUMN: Quotation Document Sheet (Matching Image 1)
             ═══════════════════════════════════════════════════════════════ */}
          <div className="flex-1 min-w-0 w-full">
            <div className="w-full bg-white shadow-xl border border-slate-200 rounded-none overflow-hidden">
              {/* Document Header with RED5 box and Company address */}
              <div className="flex items-start justify-between p-6 sm:p-8 border-b border-slate-100">
                <div className="bg-[#0f172a] border border-slate-700 px-3 py-1.5 rounded">
                  <span className="text-slate-400 text-xl font-bold tracking-tight">
                    RED<span className="text-white">5</span>
                  </span>
                </div>
                <div className="text-right text-xs text-slate-600 leading-relaxed">
                  <div className="font-bold text-sm text-slate-900 mb-0.5">Red 05 Limited</div>
                  Unit C, Norton Road Business Park<br />
                  Newhaven, East Sussex, BN9 0FN<br />
                  Tel. 01273 525525 · www.red5.ltd
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {/* Title */}
                <div className="text-right text-base font-bold text-slate-900 mb-5">
                  CUSTOMER ESTIMATE NO. {quotation.quotationNumber}
                </div>

                {/* Customer Address & Grey Quote Info Box */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 mb-6">
                  {/* Left: Customer */}
                  <div className="text-xs text-slate-700 leading-relaxed space-y-0.5">
                    <div className="font-bold text-slate-900 text-sm">{quotation.customer.name}</div>
                    <div>{quotation.customer.addressLine1}</div>
                    <div>{quotation.customer.city}</div>
                    <div>{quotation.customer.country}</div>
                  </div>

                  {/* Right: Grey Info Table Box */}
                  <div className="min-w-[240px] bg-slate-100 rounded-lg p-3 text-xs text-slate-700">
                    <table className="w-full border-collapse">
                      <tbody>
                        <tr>
                          <td className="font-semibold py-0.5 pr-2 whitespace-nowrap text-slate-600">Quote No:</td>
                          <td className="font-medium text-slate-900">{quotation.quotationNumber}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 pr-2 whitespace-nowrap text-slate-600">Site:</td>
                          <td className="font-medium text-slate-900">{quotation.site.name}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 pr-2 whitespace-nowrap text-slate-600">Phone:</td>
                          <td className="font-medium text-slate-900">{quotation.customer.phone}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 pr-2 whitespace-nowrap text-slate-600">Date:</td>
                          <td className="font-medium text-slate-900">{fmtDate(quotation.submissionDate)}</td>
                        </tr>
                        <tr>
                          <td className="font-semibold py-0.5 pr-2 whitespace-nowrap text-slate-600">Valid For:</td>
                          <td className="font-medium text-slate-900">{quotation.validFor}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* ── Collapsible Collective Items Toolbar ── */}
                <div className="mb-4 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-slate-500" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Quotation Collective Items
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="size-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search items..."
                        className="text-xs pl-8 pr-2 py-1 bg-slate-50 border border-slate-200 rounded text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={expandAll}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                    >
                      Expand All
                    </button>
                    <button
                      type="button"
                      onClick={collapseAll}
                      className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                    >
                      Collapse All
                    </button>
                  </div>
                </div>

                {/* ── Collective Items List (Collapsible Accordions) ── */}
                <div className="space-y-3 mb-6">
                  {quotation.itemGroups.map((group) => (
                    <CollapsibleItemGroup
                      key={group.id}
                      group={group}
                      isOpen={!!openGroups[group.id]}
                      onToggle={() => toggleGroup(group.id)}
                      currencySymbol={quotation.currencySymbol}
                      searchQuery={searchQuery}
                      onUpdateItemPrice={handleUpdateItemPrice}
                      onUpdateItemDeliveryDate={handleUpdateItemDeliveryDate}
                    />
                  ))}
                </div>

                {/* ── Document Totals Summary Box (Matching Image 1) ── */}
                <div className="flex justify-end pt-2 border-t border-slate-100">
                  <div className="min-w-[240px] border border-slate-200 rounded overflow-hidden text-xs">
                    <div className="flex justify-between py-1.5 px-3 bg-slate-50 text-slate-600 font-medium">
                      <span>Sub-Total ex VAT</span>
                      <span className="tabular-nums font-semibold">{fmtMoney(subtotal, quotation.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 px-3 bg-white text-slate-600 font-medium border-t border-slate-200">
                      <span>VAT (20%)</span>
                      <span className="tabular-nums font-semibold">{fmtMoney(vatAmount, quotation.currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between py-2 px-3 bg-slate-800 text-white font-bold border-t border-slate-200">
                      <span>Total inc VAT</span>
                      <span className="tabular-nums">{fmtMoney(grandTotal, quotation.currencySymbol)}</span>
                    </div>
                  </div>
                </div>

                {/* ── Signature Section on Quotation Document ── */}
                <ClientSignSection
                  signatureUrl={quotation.signatureUrl}
                  signedAt={quotation.signedAt}
                  isApproved={quotation.status === "Approved"}
                  clientName={quotation.signerName || quotation.primaryContact.name}
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              RIGHT COLUMN: Exact 3 Sidebar Cards from Image 1
             ═══════════════════════════════════════════════════════════════ */}
          <aside className="w-full lg:w-80 xl:w-96 shrink-0 lg:sticky lg:top-16 space-y-4">
            {/* 1. Identity Card */}
            <div className="border border-slate-200 bg-white p-5 shadow-sm w-full">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Quotation</p>
                  <h2 className="text-base font-bold text-slate-900 leading-snug break-words">
                    {quotation.title}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">#{quotation.quotationNumber}</p>
                </div>
                <span className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold bg-[#dcfce7] text-[#166534]">
                  {quotation.status}
                </span>
              </div>

              <dl className="grid grid-cols-1 gap-3 text-sm">
                <InfoRow label="Customer" value={quotation.customer.name} />
                <InfoRow label="Site" value={quotation.site.name} />
                <InfoRow label="Start Date" value={fmtDate(quotation.startDate)} />
                <InfoRow label="Order Ref" value={quotation.orderRef} />
              </dl>
            </div>

            {/* 2. People & Roles Card */}
            <div className="border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                People &amp; Roles
              </p>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <InfoRow label="Primary Contact" value={quotation.primaryContact.name} />
              </dl>
            </div>

            {/* 3. Quotation Pricing Card */}
            <div className="border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">
                Quotation Pricing
              </p>
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Sub-Total ex VAT</span>
                  <span className="font-medium tabular-nums">{fmtMoney(subtotal, quotation.currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>VAT (20%)</span>
                  <span className="font-medium tabular-nums">{fmtMoney(vatAmount, quotation.currencySymbol)}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-bold text-slate-900">
                  <span>Total inc VAT</span>
                  <span className="tabular-nums">{fmtMoney(grandTotal, quotation.currencySymbol)}</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ── Bottom Fixed Action Bar (Matching Image 1) ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-400 sm:text-left">
            This is a secure, read-only quotation review link issued by{" "}
            <span className="font-semibold text-slate-600">Red 05 Limited</span>.
            Please do not share this link publicly.
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsAcceptDialogOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-sm cursor-pointer font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              Approve
            </button>
            <button
              type="button"
              onClick={() => setIsQuestionDialogOpen(true)}
              className="px-3.5 py-1.5 rounded-lg text-sm cursor-pointer font-semibold bg-transparent border border-slate-900 text-slate-600 hover:bg-slate-200/50 transition-colors"
            >
              Raise a Question
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Decline this quotation?")) {
                  setQuotation((prev) => ({ ...prev, status: "Rejected" }));
                }
              }}
              className="px-3.5 py-1.5 rounded-lg text-sm cursor-pointer font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </footer>

      {/* ── Dialog Modals ── */}
      <AcceptanceDialog
        open={isAcceptDialogOpen}
        onClose={() => setIsAcceptDialogOpen(false)}
        onConfirmAcceptance={handleConfirmAcceptance}
        clientName={quotation.primaryContact.name}
      />

      <QuestionDialog
        open={isQuestionDialogOpen}
        onClose={() => setIsQuestionDialogOpen(false)}
        onSubmit={(text) => {
          alert(`Inquiry submitted: "${text}"`);
        }}
      />
    </div>
  );
}
