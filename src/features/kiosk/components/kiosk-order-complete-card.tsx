"use client";

import * as React from "react";
import { CheckCircle, Copy, Check } from "lucide-react";
import {
  formatKioskOrderAmount,
  type KioskOrderCompleteInfo,
} from "@/features/kiosk/utils/kiosk-order-summary.util";

export function KioskOrderCompleteCard({
  order,
  email,
  productName,
  configureHref,
}: {
  order: KioskOrderCompleteInfo | null;
  email?: string | null;
  productName?: string | null;
  configureHref: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const formattedTotal = formatKioskOrderAmount(order?.totalAmount ?? null);
  const orderNumber = order?.orderNumber?.trim() || "";
  const titleName = productName?.trim() || order?.productName?.trim() || "";

  async function copyOrderNumber() {
    if (!orderNumber || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(orderNumber);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f5f7] px-4 py-10 dark:bg-slate-950">
      <div className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-400">
        <CheckCircle className="size-8" />
      </div>
      <h2 className="mt-6 text-center text-2xl font-bold text-slate-900 dark:text-slate-100">
        Order complete
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-slate-600 dark:text-slate-300">
        Payment is confirmed
        {titleName ? (
          <>
            {" "}for <span className="font-semibold text-slate-800 dark:text-slate-100">{titleName}</span>
          </>
        ) : null}
        . Keep your order number for reference.
      </p>

      <div className="mt-6 w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Your order
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Paid
          </span>
        </div>
        <dl className="divide-y divide-slate-100 px-5 dark:divide-slate-800">
          {orderNumber ? (
            <div className="flex items-center justify-between gap-3 py-4">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Order number</dt>
              <dd className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-mono text-base font-bold text-slate-900 dark:text-slate-100">
                  {orderNumber}
                </span>
                <button
                  type="button"
                  onClick={() => void copyOrderNumber()}
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800"
                  aria-label="Copy order number"
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                </button>
              </dd>
            </div>
          ) : null}
          {formattedTotal ? (
            <div className="flex items-center justify-between gap-3 py-4">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Amount paid</dt>
              <dd className="font-mono text-lg font-extrabold text-slate-900 dark:text-white">
                {formattedTotal}
              </dd>
            </div>
          ) : null}
          {email ? (
            <div className="flex items-start justify-between gap-3 py-4">
              <dt className="text-sm text-slate-500 dark:text-slate-400">Receipt</dt>
              <dd className="max-w-[60%] break-all text-right text-sm font-medium text-slate-800 dark:text-slate-200">
                {email}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <a
        href={configureHref}
        className="mt-8 rounded-lg bg-[#701524] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#5a101c] transition"
      >
        Configure another product
      </a>
    </div>
  );
}
