"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams, useRouter, useParams } from "next/navigation";
import {
  loadQuotationScopePinDetails,
  type QuotationScopePinDetailPayload,
} from "@/features/quotations/utils/quotation-composite-scope-pins.util";
import {
  fetchPublicPinDetails,
  fetchPublicQuotationByToken,
  fetchPublicQuotationRejectionReasons,
  submitPublicQuotationResponse,
} from "@/features/public/quotation/api/public-pin.api";
import { fetchQuotation } from "@/features/quotations/api/quotation.api";
import { formatContactName } from "@/features/contacts/utils/contact-name.util";
import { toastApiError, toastSuccess } from "@/shared/feedback/app-toast";
import type { DrawingPlot, DrawingPin } from "@/features/projects/types/drawing.types";
import type {
  QuotationDetail,
  QuotationQuoteSection,
  QuotationQuoteSectionPin,
  QuotationQuoteSectionPlot,
  QuotationQuoteSectionSourcePin,
} from "@/features/quotations/types/quotation.types";
import {
  generateQuotationPinSnapshots,
  extractPinSnapshotTasks,
} from "@/features/quotations/utils/quotation-pin-snapshot.util";
import { DocumentBody } from "@/features/quotations/components/quotation-pdf-preview-modal";
import {
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { formatOrgMoneyValue } from "@/shared/money/format-money.util";
import { getOrgCurrencySettings } from "@/shared/money/org-currency.store";
import { CheckmarkSelect, type CheckmarkSelectOption } from "@/shared/ui";

/* ── Dynamic imports ─────────────────────────────────── */

const DrawingPinPreviewModal = dynamic(
  () => import("./quotation-drawing-pin-preview-modal").then((mod) => mod.DrawingPinPreviewModal),
  { ssr: false },
);

const SignaturePad = dynamic(
  () => import("@/shared/form/components/signature-pad").then((mod) => mod.default ?? mod),
  { ssr: false },
);

/* ── Helpers ─────────────────────────────────────────── */

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

function getCustomerName(detail: QuotationDetail): string {
  const c = detail.customer;
  if (!c) return "—";
  if (typeof c === "number") return `Customer #${c}`;
  if (typeof c === "object" && "name" in c) return (c as any).name ?? "—";
  return "—";
}

function getSiteName(detail: QuotationDetail): string {
  if (detail.sites && detail.sites.length > 0) {
    return detail.sites.map((s) => s.site_name).join(", ");
  }
  const s = detail.site;
  if (!s) return "—";
  if (typeof s === "number") return `Site #${s}`;
  if (typeof s === "object" && "site_name" in s) return (s as any).site_name ?? "—";
  return "—";
}

function getProjectName(detail: QuotationDetail): string {
  const p = (detail as any).project;
  if (!p) return "—";
  if (typeof p === "number") return `Project #${p}`;
  if (typeof p === "object" && "name" in p) return (p as any).name ?? "—";
  return "—";
}

function getTagNames(detail: QuotationDetail): string {
  const tags = (detail as any).tags;
  if (!Array.isArray(tags) || tags.length === 0) return "—";
  return tags
    .map((t: any) => (typeof t === "object" ? (t.tag_name ?? t.name ?? `#${t.id}`) : `#${t}`))
    .join(", ");
}

function getSiteAddress(detail: QuotationDetail): string | null {
  const snap =
    (detail as any).site_snapshots?.[0] ??
    (detail as any).site_snapshot ??
    null;
  if (!snap) return null;
  const parts = [
    snap.address_line_1,
    snap.address_line_2,
    snap.city,
    snap.state,
    snap.pincode,
    snap.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function getWhat3Words(detail: QuotationDetail): string | null {
  const snap =
    (detail as any).site_snapshots?.[0] ??
    (detail as any).site_snapshot ??
    null;
  return snap?.what3words ?? null;
}

function getUserName(user: unknown): string {
  if (!user) return "—";
  if (typeof user === "string" && user.trim()) return user.trim();
  if (typeof user === "number") return `#${user}`;
  if (typeof user === "object") {
    const u = user as any;
    return u.name ?? u.full_name ?? u.username ?? u.email ?? "—";
  }
  return "—";
}

function getContactName(contact: unknown): string {
  if (!contact) return "—";
  if (typeof contact === "number") return `#${contact}`;
  if (typeof contact === "object") {
    const label = formatContactName(contact as Parameters<typeof formatContactName>[0]);
    return label || "—";
  }
  return "—";
}

function getStatusMeta(status: string | null | undefined): { label: string; bg: string; text: string } {
  switch ((status ?? "").toLowerCase()) {
    case "approved":
    case "accepted":
      return { label: "Approved", bg: "#dcfce7", text: "#166534" };
    case "rejected":
      return { label: "Rejected", bg: "#fee2e2", text: "#991b1b" };
    case "sent":
      return { label: "Sent", bg: "#dbeafe", text: "#1e40af" };
    case "draft":
      return { label: "Draft", bg: "#f1f5f9", text: "#475569" };
    default:
      return {
        label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Draft",
        bg: "#f1f5f9",
        text: "#475569",
      };
  }
}

function fmtMoney(value: number | string | null | undefined): string {
  return formatOrgMoneyValue(value ?? 0, getOrgCurrencySettings());
}

function getTotals(detail: QuotationDetail): { subtotal: number; vat: number; total: number } | null {
  const sections = detail.quote_sections;
  if (!sections || sections.length === 0) {
    if (detail.grand_total != null) {
      const total = Number(detail.grand_total);
      return { subtotal: total / 1.2, vat: total - total / 1.2, total };
    }
    return null;
  }
  const subtotal = sections.reduce((s, sec) => s + (sec.section_total ?? 0), 0);
  const vat = subtotal * 0.2;
  return { subtotal, vat, total: subtotal + vat };
}

/* ── State types ─────────────────────────────────────── */

type PinState = {
  payload: QuotationScopePinDetailPayload | null;
  loading: boolean;
  error: string | null;
};

type PinAction =
  | { type: "start" }
  | { type: "success"; payload: QuotationScopePinDetailPayload }
  | { type: "failure"; error: string }
  | { type: "reset" };

function pinReducer(state: PinState, action: PinAction): PinState {
  switch (action.type) {
    case "start": return { payload: null, loading: true, error: null };
    case "success": return { payload: action.payload, loading: false, error: null };
    case "failure": return { payload: null, loading: false, error: action.error };
    case "reset": return { payload: null, loading: false, error: null };
    default: return state;
  }
}

type SnapshotStatus = "idle" | "generating" | "success" | "error";

/* ── Sub-components ──────────────────────────────────── */

function LoadingScreen({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 px-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="size-10 animate-spin text-[#334155]" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-24 shrink-0 text-xs font-medium text-slate-400 pt-0.5">{label}</dt>
      <dd className="text-slate-800 font-medium min-w-0 break-words">{value}</dd>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  style,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  style: "accept" | "question" | "decline";
  onClick?: () => void;
}) {
  const styles = {
    accept: "bg-emerald-600 hover:bg-emerald-700 text-white",
    question: "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200",
    decline: "bg-white hover:bg-red-50 text-red-600 border border-red-200",
  };
  return (
    <button
      type="button"
      className={`flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${styles[style]}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

function SnapshotProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="flex flex-col items-center gap-3 py-12">
      <Loader2 className="size-7 animate-spin text-[#334155]" />
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold text-slate-700">Preparing document snapshots…</p>
        <p className="text-xs text-slate-400">{completed} of {total} completed</p>
      </div>
      <div className="w-48 bg-slate-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-[#334155] h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/* ── Rejection dialog ────────────────────────────────── */

function RejectionDialog({
  open,
  onClose,
  onRefresh,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh?: () => void;
  token?: string | null;
}) {
  const [selectedReasonId, setSelectedReasonId] = useState("");
  const [reasonOptions, setReasonOptions] = useState<CheckmarkSelectOption[]>([]);
  const [reasonsLoading, setReasonsLoading] = useState(false);
  const [reasonsError, setReasonsError] = useState<string | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setReasonsLoading(true);
    setReasonsError(null);
    fetchPublicQuotationRejectionReasons(token)
      .then((rows) => {
        if (cancelled) return;
        setReasonOptions(rows.map((row) => ({ value: String(row.id), label: row.label })));
      })
      .catch((err) => {
        if (cancelled) return;
        setReasonsError("Failed to load rejection reasons.");
        toastApiError(err, "Failed to load rejection reasons");
      })
      .finally(() => {
        if (!cancelled) setReasonsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, token]);

  const handleSignatureChange = (value: string) => {
    setSignature(value || null);
  };

  const handleSubmit = async () => {
    const rejectionReasonId = Number(selectedReasonId);
    if (!token || !Number.isFinite(rejectionReasonId) || rejectionReasonId <= 0) return;
    setIsSubmitting(true);
    try {
      await submitPublicQuotationResponse(token, {
        status: "rejected",
        rejection_reason_ids: rejectionReasonId,
      });
      setSubmitted(true);
      toastSuccess("Response submitted successfully");
    } catch (err) {
      toastApiError(err, "Failed to submit response");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      onRefresh?.();
    }
    setSelectedReasonId("");
    setSignature(null);
    setSubmitted(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-[#DC2626] px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              {/* <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Quotation Response</p> */}
              <h2 className="text-white text-lg font-bold leading-snug">Reject Quotation</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
            <div className="size-14 rounded-full bg-red-50 flex items-center justify-center">
              <svg className="size-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-base">Response Recorded</p>
              <p className="text-slate-500 text-sm mt-1">Thank you for letting us know. We will be in touch shortly.</p>
            </div>
            {signature && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-1">Signature:</p>
                <img src={signature} alt="Signature" className="max-w-full h-20 object-contain border border-slate-200 rounded" />
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
            <p className="text-sm text-slate-500 mb-4">Please select the reason for declining this quotation:</p>
            <div className="mb-5">
              <CheckmarkSelect
                id="rejection-reason"
                label="Rejection Reason"
                options={reasonOptions}
                value={selectedReasonId}
                onChange={setSelectedReasonId}
                emptyLabel={reasonsLoading ? "Loading reasons..." : "Select a reason"}
                disabled={reasonsLoading || isSubmitting || reasonOptions.length === 0}
                invalid={Boolean(reasonsError)}
                listLabel="Rejection reasons"
                portaled
              />
              {reasonsError && (
                <p className="mt-1.5 text-xs font-medium text-red-600">{reasonsError}</p>
              )}
            </div>

            {/* Additional comments */}
            {/* <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Additional Comments (optional)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any additional feedback…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent resize-none transition-shadow"
              />
            </div> */}

            {/* Signature */}
            {/* <div className="mb-5">
              <SignaturePad
                name="rejection-signature"
                label="Signature (optional)"
                value={signature ?? ""}
                onChange={handleSignatureChange}
                height={130}
                placeholder="Draw your signature here..."
              />
            </div> */}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!selectedReasonId || isSubmitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#DC2626] text-white hover:bg-red-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Rejecting..." : "Reject"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Acceptance dialog ───────────────────────────────── */

function AcceptanceDialog({
  open,
  onClose,
  onSignatureCapture,
  onRefresh,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onSignatureCapture?: (sig: string | null) => void;
  onRefresh?: () => void;
  token?: string | null;
}) {
  const [note, setNote] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSignatureChange = (value: string) => {
    const sig = value || null;
    setSignature(sig);
    onSignatureCapture?.(sig);
  };

  const handleSubmit = async () => {
    if (!token) return;
    setIsSubmitting(true);
    try {
      await submitPublicQuotationResponse(token, {
        status: "approved",
        signature,
      });
      setSubmitted(true);
      toastSuccess("Quotation accepted successfully");
    } catch (err) {
      toastApiError(err, "Failed to accept quotation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      onRefresh?.();
    }
    setNote("");
    setSignature(null);
    setSubmitted(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              {/* <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Quotation Response</p> */}
              <h2 className="text-white text-lg font-bold leading-snug">Accept Quotation</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
              <p className="text-slate-500 text-sm mt-1">Thank you for accepting. We will begin work shortly and be in touch.</p>
            </div>
            {signature && (
              <div className="mt-2 w-full">
                <p className="text-xs text-slate-500 mb-1">Signed by:</p>
                <img src={signature} alt="Acceptance signature" className="max-w-full h-24 object-contain border border-slate-200 rounded-lg mx-auto" />
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

            {/* Signature */}
            <div className="mb-5">
              <SignaturePad
                name="acceptance-signature"
                label="Signature (optional)"
                value={signature ?? ""}
                onChange={handleSignatureChange}
                height={130}
                placeholder="Draw your signature here..."
              />
            </div>

            {/* Optional comments */}
            {/* <div className="mb-5">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                Comments (optional)
              </label>
              <textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Any notes or conditions for acceptance…"
                className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent resize-none transition-shadow"
              />
            </div> */}

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Confirm Acceptance"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Question dialog ─────────────────────────────────── */

function QuestionDialog({
  open,
  onClose,
  onSaveQuestion,
  onRefresh,
  token,
}: {
  open: boolean;
  onClose: () => void;
  onSaveQuestion?: (question: string) => void;
  onRefresh?: () => void;
  token?: string | null;
}) {
  const [questionText, setQuestionText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!questionText.trim() || !token) return;
    setIsSubmitting(true);
    try {
      await submitPublicQuotationResponse(token, {
        status: "questioned",
        comment: questionText.trim(),
      });
      setSubmitted(true);
      onSaveQuestion?.(questionText.trim());
      toastSuccess("Question submitted successfully");
    } catch (err) {
      toastApiError(err, "Failed to submit question");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (submitted) {
      onRefresh?.();
    }
    setQuestionText("");
    setSubmitted(false);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(2px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-gray-800 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              {/* <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-0.5">Quotation Response</p> */}
              <h2 className="text-white text-lg font-bold leading-snug">Raise a Question</h2>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
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
            <div className="size-14 rounded-full bg-slate-100 flex items-center justify-center">
              <MessageSquare className="size-7 text-slate-800" />
            </div>
            <div>
              <p className="text-slate-900 font-semibold text-base">Question Submitted!</p>
              <p className="text-slate-500 text-sm mt-1">Thank you for your inquiry. Our team will review your question and respond shortly.</p>
            </div>
            {questionText && (
              <div className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-left min-w-0">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your Question:</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{questionText}</p>
              </div>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="mt-2 px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <div className="px-6 py-5">
            <div className="mb-4">
              <label className="text-xs font-semibold uppercase tracking-widest text-slate-500 block mb-1.5">
                Your Question or Query
              </label>
              <textarea
                rows={5}
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                disabled={isSubmitting}
                placeholder="Type your question regarding terms, scope, line items, pricing, or timeline here..."
                className="w-full text-sm border border-slate-300 rounded-xl p-3 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none transition-shadow"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!questionText.trim() || isSubmitting}
                className="px-5 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Submitting..." : "Submit Question"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Info sidebar ─────────────────────────────────────── */

function QuotationInfoPanel({
  pinPayload,
  detail,
  sectionLabel,
  plotLabel,
}: {
  pinPayload?: QuotationScopePinDetailPayload | null;
  detail: QuotationDetail;
  sectionLabel?: string;
  plotLabel?: string;
}) {
  const statusMeta = getStatusMeta(detail.status);
  const totals = getTotals(detail);

  const displaySection = sectionLabel ?? pinPayload?.sectionLabel;
  const displayPlot = plotLabel ?? pinPayload?.plotLabel;

  return (
    <div className="flex flex-col w-full">

      {/* Identity card */}
      <div className="border border-slate-200 bg-white p-5 shadow-sm w-full">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Quotation</p>
            <h2 className="text-base font-bold text-slate-900 leading-snug break-words">
              {detail.quote_name}
            </h2>
            {detail.quotation_serial_number && (
              <p className="text-xs text-slate-500 mt-0.5">#{detail.quotation_serial_number}</p>
            )}
          </div>
          <span
            className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
            style={{ background: statusMeta.bg, color: statusMeta.text }}
          >
            {statusMeta.label}
          </span>
        </div>

        <dl className="grid grid-cols-1 gap-3 text-sm">
          <InfoRow label="Customer" value={getCustomerName(detail)} />
          <InfoRow label="Project" value={getProjectName(detail)} />
          <InfoRow label="Site" value={getSiteName(detail)} />
          <InfoRow label="Start Date" value={fmtDate(detail.created_at)} />
          {detail.due_date && <InfoRow label="Due Date" value={fmtDate(detail.due_date)} />}
          {detail.order_number?.trim() && <InfoRow label="Order Ref" value={detail.order_number} />}
          <InfoRow label="Tags" value={getTagNames(detail)} />
          {/* {displaySection && <InfoRow label="Level" value={displaySection} />}
          {displayPlot && <InfoRow label="Plot" value={displayPlot} />} */}
        </dl>
      </div>

      {/* Site address */}
      {getSiteAddress(detail) && (
        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Site Address</p>
          <p className="text-sm text-slate-700 leading-relaxed">{getSiteAddress(detail)}</p>
          {getWhat3Words(detail) && (
            <p className="text-xs text-slate-400 mt-1.5">
              <span className="font-semibold">what3words:</span> {getWhat3Words(detail)}
            </p>
          )}
        </div>
      )}

      {/* People & roles */}
      {(getUserName(detail.salesperson) !== "—" || getContactName(detail.primary_customer_contact) !== "—") && (
        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">People &amp; Roles</p>
          <dl className="grid grid-cols-1 gap-3 text-sm">
            {getUserName(detail.salesperson) !== "—" && (
              <InfoRow label="Salesperson" value={getUserName(detail.salesperson)} />
            )}
            {getUserName((detail as any).project_manager) !== "—" && (
              <InfoRow label="Project Mgr" value={getUserName((detail as any).project_manager)} />
            )}
            {getContactName(detail.primary_customer_contact) !== "—" && (
              <InfoRow label="Primary Contact" value={getContactName(detail.primary_customer_contact)} />
            )}
          </dl>
        </div>
      )}

      {/* Totals */}
      {totals && (
        <div className="border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Quotation Pricing</p>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Sub-Total ex VAT</span>
              <span className="font-medium tabular-nums">{fmtMoney(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>VAT (20%)</span>
              <span className="font-medium tabular-nums">{fmtMoney(totals.vat)}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-2 mt-2 font-bold text-slate-900">
              <span>Total inc VAT</span>
              <span className="tabular-nums">{fmtMoney(totals.total)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {/* <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Your Response</p>
        <div className="flex flex-col gap-2">
          <ActionButton icon={<CheckCircle className="size-4" />} label="Accept Quotation" style="accept" />
          <ActionButton icon={<MessageSquare className="size-4" />} label="Ask a Question" style="question" />
          <ActionButton icon={<XCircle className="size-4" />} label="Decline Quotation" style="decline" />
        </div>
      </div> */}

      {/* Description */}
      {detail.description?.trim() && (
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Description</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">{detail.description}</p>
        </div>
      )}
    </div>
  );
}

/* ── PDF column ──────────────────────────────────────── */

function PdfColumn({
  detail,
  pinSnapshots,
  snapStatus,
  snapProgress,
  onPinClick,
}: {
  detail: QuotationDetail;
  pinSnapshots: Map<string, string>;
  snapStatus: SnapshotStatus;
  snapProgress: { completed: number; total: number };
  onPinClick?: (pinId: number) => void;
}) {
  const sections = detail.quote_sections ?? [];

  return (
    <div className="flex-1 min-w-0">
      {/* Progress bar while generating snapshots */}
      {snapStatus === "generating" && (
        <SnapshotProgressBar completed={snapProgress.completed} total={snapProgress.total} />
      )}
      {snapStatus === "error" && (
        <div className="flex flex-col items-center gap-2 py-6">
          <AlertTriangle className="size-7 text-amber-500" />
          <p className="text-sm text-slate-600">
            Some snapshots failed to generate. Document may show placeholder images.
          </p>
        </div>
      )}

      {/* Document — renders at full natural height so the PAGE scrolls */}
      <div
        className="w-full bg-white shadow-xl border border-slate-200"
        style={{ display: snapStatus === "success" || snapStatus === "error" || snapStatus === "idle" ? "block" : "none" }}
      >
        <DocumentBody data={detail} pinSnapshots={pinSnapshots} sections={sections} onPinClick={onPinClick} />
      </div>
    </div>
  );
}

/* ── Main component ──────────────────────────────────── */

export function QuotationPinDetails() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();

  const rawRouteToken = params?.token ?? params?.id;
  const routeToken = typeof rawRouteToken === "string" ? rawRouteToken : Array.isArray(rawRouteToken) ? rawRouteToken[0] : null;

  const token =
    routeToken ??
    searchParams.get("token") ??
    searchParams.get("id") ??
    searchParams.get("quotationId") ??
    searchParams.get("pinDetailsKey");

  const pinParam = searchParams.get("pin") ?? searchParams.get("pinId");
  const pinDialogParam = searchParams.get("pinDialog");

  const [quotationDetail, setQuotationDetail] = useState<QuotationDetail | null>(null);
  const [pinPayload, setPinPayload] = useState<QuotationScopePinDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);

  useEffect(() => {
    if (pinDialogParam === "true" || pinDialogParam === "1") {
      setIsPinDialogOpen(true);
    }
  }, [pinDialogParam]);

  const numericId = useMemo(() => Number(token), [token]);
  const isNumericToken = useMemo(
    () =>
      typeof token === "string" &&
      token.trim().length > 0 &&
      Number.isFinite(numericId) &&
      String(numericId) === token.trim(),
    [token, numericId],
  );

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    // Primary: fetch using public quotation by token API (GET /public/quotations/:token/)
    fetchPublicQuotationByToken(token)
      .then((data) => {
        if (!cancelled) {
          setQuotationDetail(data);
          setLoading(false);
        }
      })
      .catch((tokenErr) => {
        console.warn("[QuotationPinDetails] fetchPublicQuotationByToken failed, trying fallback:", tokenErr);
        if (isNumericToken) {
          fetchQuotation(numericId)
            .then((data) => {
              if (!cancelled) {
                setQuotationDetail(data);
                setLoading(false);
              }
            })
            .catch(() => {
              fetchPublicPinDetails(numericId)
                .then((data) => {
                  if (!cancelled) {
                    setPinPayload(data);
                    if (data.quotationId) {
                      fetchQuotation(data.quotationId)
                        .then((qd) => { if (!cancelled) setQuotationDetail(qd); })
                        .catch(() => { });
                    }
                    setLoading(false);
                  }
                })
                .catch(() => {
                  if (!cancelled) {
                    setError("Unable to load quotation details.");
                    setLoading(false);
                  }
                });
            });
        } else {
          const stored = loadQuotationScopePinDetails(token);
          if (stored) {
            setPinPayload(stored);
            if (stored.quotationId) {
              fetchQuotation(stored.quotationId)
                .then((qd) => { if (!cancelled) setQuotationDetail(qd); })
                .catch(() => { });
            }
            setLoading(false);
          } else {
            if (!cancelled) {
              setError("This quotation link is invalid or has expired.");
              setLoading(false);
            }
          }
        }
      });

    return () => { cancelled = true; };
  }, [token, numericId, isNumericToken]);

  /* ── Construct effective QuotationDetail + Sections guaranteed ── */
  const effectiveQuotationDetail = useMemo<QuotationDetail | null>(() => {
    if (quotationDetail) return quotationDetail;

    if (pinPayload) {
      const sections: QuotationQuoteSection[] = [];
      const plots: QuotationQuoteSectionPlot[] = (pinPayload.plots ?? []).map((plot, pIdx) => {
        const pins: QuotationQuoteSectionPin[] = (plot.pins ?? []).map((pin, pinIdx) => {
          const sp: QuotationQuoteSectionSourcePin = {
            pin_id: pin.id,
            location: pin.location,
            name: pin.item_detail?.name || pin.description || `Item #${pin.id}`,
            quantity: pin.quantity ?? 1,
            variation: pin.variation ?? false,
            description: pin.description ?? "",
          };
          const unitPrice = (pin.item_detail as any)?.selling_price ? Number((pin.item_detail as any).selling_price) : 0;
          return {
            pins_order: pinIdx + 1,
            pin_id: pin.id,
            composite_item_id: null,
            name: sp.name || "Item",
            quantity: sp.quantity || 1,
            selling_price: unitPrice,
            pins_total: unitPrice * (sp.quantity || 1),
            source_pins: [sp],
          };
        });

        const plotTotal = pins.reduce((sum, p) => sum + (p.pins_total || p.selling_price * p.quantity), 0);
        return {
          plot_order: pIdx + 1,
          plot_id: plot.id,
          name: plot.name || `Plot ${pIdx + 1}`,
          pins,
          plot_total: plotTotal,
        };
      });

      const fallbackRows = (pinPayload.rows ?? []).map((row, rIdx) => ({
        pins_order: rIdx + 1,
        pin_id: row.pin_id,
        composite_item_id: null,
        name: row.name,
        quantity: row.quantity,
        selling_price: row.selling_price,
        pins_total: row.pins_total,
        source_pins: [
          {
            pin_id: row.pin_id,
            location: row.pin_id ? String(row.pin_id) : undefined,
            name: row.name,
            quantity: row.quantity,
            selling_price: row.selling_price,
          },
        ],
      }));

      const fallbackPlotTotal = fallbackRows.reduce(
        (sum, r) => sum + (r.pins_total || r.selling_price * r.quantity),
        0,
      );

      sections.push({
        section_order: 1,
        level_id: null,
        name: pinPayload.sectionLabel || pinPayload.drawingName || pinPayload.title || "Quotation Scope",
        drawing_file: pinPayload.drawingFile || undefined,
        drawing_file_type: pinPayload.drawingFileType || undefined,
        plots:
          plots.length > 0
            ? plots
            : [
              {
                plot_order: 1,
                plot_id: 1,
                name: pinPayload.plotLabel || "Plot 1",
                pins: fallbackRows,
                plot_total: fallbackPlotTotal,
              },
            ],
        section_total: plots.length > 0 ? plots.reduce((s, p) => s + p.plot_total, 0) : fallbackPlotTotal,
      });

      return {
        id: pinPayload.quotationId ?? numericId,
        quote_name: pinPayload.title || pinPayload.drawingName || `Quotation #${numericId}`,
        quotation_serial_number: String(pinPayload.quotationId ?? numericId),
        customer: null,
        site: null,
        created_at: new Date().toISOString(),
        due_date: null,
        order_number: null,
        description: null,
        quote_sections: sections,
        select_all_levels: false,
        is_deleted: false,
        deleted_at: null,
        is_active: true,
        organization: null,
        modified_at: null,
        modified_by: null,
        created_by: null,
        primary_customer_contact: null,
        additional_customer_contact: null,
        site_contact: null,
        salesperson: null,
        project_manager: null,
        project: null,
        tags: [],
      } as unknown as QuotationDetail;
    }

    return null;
  }, [quotationDetail, pinPayload, numericId]);

  /* ── Snapshot generation ── */
  const [snapStatus, setSnapStatus] = useState<SnapshotStatus>("idle");
  const [snapProgress, setSnapProgress] = useState({ completed: 0, total: 0 });
  const [pinSnapshots, setPinSnapshots] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!effectiveQuotationDetail) return;

    const tasks = extractPinSnapshotTasks(effectiveQuotationDetail.quote_sections ?? []);
    if (tasks.length === 0) {
      setPinSnapshots(new Map());
      setSnapStatus("success");
      return;
    }

    let cancelled = false;
    setPinSnapshots(new Map());
    setSnapStatus("generating");
    setSnapProgress({ completed: 0, total: tasks.length });

    generateQuotationPinSnapshots(
      effectiveQuotationDetail.quote_sections ?? [],
      (key, dataUrl) => {
        if (cancelled) return;
        setPinSnapshots((prev) => {
          const next = new Map(prev);
          next.set(key, dataUrl);
          return next;
        });
        setSnapProgress((prev) => ({ ...prev, completed: prev.completed + 1 }));
      },
      () => cancelled,
    )
      .then(() => { if (!cancelled) setSnapStatus("success"); })
      .catch(() => { if (!cancelled) setSnapStatus("error"); });

    return () => { cancelled = true; };
  }, [effectiveQuotationDetail]);

  /* ── Derived pin values ── */
  const sectionLabel = useMemo(() => {
    if (pinPayload?.sectionLabel) return pinPayload.sectionLabel;
    if (effectiveQuotationDetail?.quote_sections?.[0]?.name) return effectiveQuotationDetail.quote_sections[0].name;
    return undefined;
  }, [pinPayload, effectiveQuotationDetail]);

  const plotLabel = useMemo(() => {
    if (pinPayload?.plotLabel) return pinPayload.plotLabel;
    if (effectiveQuotationDetail?.quote_sections?.[0]?.plots?.[0]?.name)
      return effectiveQuotationDetail.quote_sections[0].plots[0].name;
    return undefined;
  }, [pinPayload, effectiveQuotationDetail]);

  const drawingFile = useMemo(() => {
    if (pinPayload?.drawingFile) return pinPayload.drawingFile;
    const sec = effectiveQuotationDetail?.quote_sections?.find((s) => s.drawing_file);
    return sec?.drawing_file ?? "";
  }, [pinPayload, effectiveQuotationDetail]);

  const drawingName = useMemo(() => {
    if (pinPayload?.drawingName) return pinPayload.drawingName;
    if (pinPayload?.title) return pinPayload.title;
    const sec = effectiveQuotationDetail?.quote_sections?.find((s) => s.drawing_file);
    return sec?.name ?? effectiveQuotationDetail?.quote_name ?? "Drawing";
  }, [pinPayload, effectiveQuotationDetail]);

  const plots = useMemo<DrawingPlot[]>(() => {
    if (pinPayload?.plots && pinPayload.plots.length > 0) return pinPayload.plots;
    const sec = effectiveQuotationDetail?.quote_sections?.find((s) => s.plots && s.plots.length > 0);
    if (!sec?.plots) return [];
    return sec.plots.map((p, idx) => ({
      id: p.plot_id ?? idx + 1,
      name: p.name || `Plot ${idx + 1}`,
      coordinates: p.coordinates ?? [],
      plot_border: p.plot_border ?? undefined,
      plot_bg: p.plot_bg ?? undefined,
      pins: (p.pins ?? []).map((pin: any, pinIdx: number) => ({
        id: pin.pin_id ?? pin.id ?? pinIdx + 1,
        x_coordinate: pin.x_coordinate ?? pin.source_pins?.[0]?.x_coordinate ?? 0,
        y_coordinate: pin.y_coordinate ?? pin.source_pins?.[0]?.y_coordinate ?? 0,
        location: pin.location ?? String(pin.pin_id ?? pin.id ?? pinIdx + 1),
        quantity: pin.quantity ?? 1,
        variation: pin.variation ?? false,
        status: pin.status ?? null,
        description: pin.description ?? "",
        item_detail: pin.item_detail ?? (pin.name ? { name: pin.name } : undefined),
        status_detail: pin.status_detail ?? undefined,
        attachments: pin.attachments ?? [],
      })),
    }));
  }, [pinPayload, effectiveQuotationDetail]);

  const selectedPin = useMemo(() => {
    const allPins = plots.flatMap((p: any) => p.pins ?? []);
    if (pinParam) {
      const found = allPins.find((p: any) => String(p.id) === String(pinParam));
      if (found) return found;
    }
    if (pinPayload?.selectedPin) return pinPayload.selectedPin;
    return allPins[0] ?? null;
  }, [plots, pinParam, pinPayload]);

  const handlePinClick = (pinId: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pin", String(pinId));
    params.set("pinDialog", "true");
    router.push(`?${params.toString()}`, { scroll: false });
    setIsPinDialogOpen(true);
  };

  const handleClosePinDialog = () => {
    setIsPinDialogOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("pinDialog");
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [acceptSignature, setAcceptSignature] = useState<string | null>(null);
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [savedQuestion, setSavedQuestion] = useState<string | null>(null);

  const refreshQuotation = () => {
    if (!token) return;
    fetchPublicQuotationByToken(token)
      .then((data) => setQuotationDetail(data))
      .catch(() => {});
  };

  /* ── Scroll lock: prevent body scroll while any dialog is open ── */
  useEffect(() => {
    const anyOpen = isPinDialogOpen || isRejectDialogOpen || isAcceptDialogOpen || isQuestionDialogOpen;
    if (anyOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isPinDialogOpen, isRejectDialogOpen, isAcceptDialogOpen, isQuestionDialogOpen]);

  /* ── Render states ── */

  if (!token) {
    return <ErrorScreen message="No quotation token was provided in the URL." />;
  }

  if (loading) {
    return <LoadingScreen message="Loading quotation details…" />;
  }

  if (error) {
    return <ErrorScreen message={error} />;
  }

  if (!effectiveQuotationDetail) {
    return <ErrorScreen message="This quotation link is invalid or has expired." />;
  }

  const quoteTitle = effectiveQuotationDetail.quote_name;
  const quoteSerial = effectiveQuotationDetail.quotation_serial_number;
  const quotationStatus = (effectiveQuotationDetail as any)?.status as string | undefined;
  const isAlreadyActioned = ["approved", "questioned", "rejected"].includes((quotationStatus ?? "").toLowerCase());

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ── Top nav bar — sticky ── */}
      <header className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 sm:px-6 lg:px-10">
        <div className="flex items-center gap-3 h-14">
          <div className="border border-slate-700 px-2.5 py-1.5 rounded shrink-0 bg-black">
            <span className="text-slate-400 font-bold text-base tracking-tight leading-none">
              RED<span className="text-white">5</span>
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 font-medium hidden sm:block">Quotation Review</p>
            <p className="text-sm font-semibold text-black truncate">{quoteTitle}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {quoteSerial && (
              <div className="flex items-center gap-2">
                <FileText className="size-4 text-slate-500" />
                <span className="text-xs text-slate-400 font-mono">#{quoteSerial}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Page body — page scrolls naturally ── */}
      <div className="px-4 sm:px-6 lg:px-10 pt-6 pb-32 sm:pb-28">
        <div className="flex gap-6 items-start">

          {/* Left: Quotation PDF — full natural height, PAGE scrolls */}
          <PdfColumn
            detail={effectiveQuotationDetail}
            pinSnapshots={pinSnapshots}
            snapStatus={snapStatus}
            snapProgress={snapProgress}
            onPinClick={handlePinClick}
          />

          {/* Right: Info panel — sticky below the nav bar */}
          <aside className="w-80 xl:w-96 shrink-0 sticky top-16">
            <QuotationInfoPanel
              pinPayload={pinPayload}
              detail={effectiveQuotationDetail}
              sectionLabel={sectionLabel}
              plotLabel={plotLabel}
            />
          </aside>
        </div>
      </div>

      {/* ── Rejection dialog ── */}
      <RejectionDialog open={isRejectDialogOpen} onClose={() => setIsRejectDialogOpen(false)} onRefresh={refreshQuotation} token={token} />

      {/* ── Acceptance dialog ── */}
      <AcceptanceDialog
        open={isAcceptDialogOpen}
        onClose={() => setIsAcceptDialogOpen(false)}
        onSignatureCapture={(sig) => setAcceptSignature(sig)}
        onRefresh={refreshQuotation}
        token={token}
      />

      {/* ── Question dialog ── */}
      <QuestionDialog
        open={isQuestionDialogOpen}
        onClose={() => setIsQuestionDialogOpen(false)}
        onSaveQuestion={(q) => setSavedQuestion(q)}
        onRefresh={refreshQuotation}
        token={token}
      />
      {selectedPin && (
        <DrawingPinPreviewModal
          open={isPinDialogOpen}
          onClose={handleClosePinDialog}
          pin={selectedPin}
          plots={plots}
          drawingFile={drawingFile}
          drawingName={drawingName}
          embedded={false}
          hideFormRow={true}
        />
      )}

      {/* ── Footer ── */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t border-slate-200 bg-white px-4 py-3 sm:px-6 lg:px-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-xs text-slate-400 sm:text-left">
            This is a secure, read-only quotation review link issued by{" "}
            <span className="font-semibold text-slate-600">Red 05 Limited</span>.
            Please do not share this link publicly.
          </p>
          {!isAlreadyActioned && (
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
                onClick={() => setIsRejectDialogOpen(true)}
                className="px-3.5 py-1.5 rounded-lg text-sm cursor-pointer font-semibold bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
