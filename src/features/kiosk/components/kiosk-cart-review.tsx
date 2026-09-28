"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Trash2,
  Minus,
  Plus,
  Loader2,
  ShoppingBag,
} from "lucide-react";
import type { KioskConfig, KioskOption } from "../types/kiosk.types";
import type { LiveBuildScene } from "../utils/kiosk-live-build";

export interface KioskCartReviewProps {
  config: KioskConfig;
  answers: Record<string, any>;
  scene: LiveBuildScene;
  payload?: any;
  onBack: () => void;
  onContinueToInvoice: () => void;
  isSubmitting?: boolean;
}

export const KioskCartReview: React.FC<KioskCartReviewProps> = ({
  config,
  answers,
  scene,
  payload,
  onBack,
  onContinueToInvoice,
  isSubmitting = false,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [isChecked, setIsChecked] = useState(true);

  // Compute pricing dynamically from the actual configured options and submission payload
  const rawBasePrice =
    typeof payload?.total_price === "number" && payload.total_price > 0
      ? payload.total_price
      : scene.totalPrice > 0
      ? scene.totalPrice
      : 0;

  const basePrice = Math.max(0, rawBasePrice);
  const subtotal = isChecked ? basePrice * quantity : 0;
  const deliveryFee = isChecked && subtotal > 0 ? 10.0 : 0;
  const vat = subtotal > 0 ? subtotal * 0.2 : 0;
  const grandTotal = subtotal + deliveryFee + vat;

  // Selected options summary
  const optionList = scene.summaries.map((s) => s.option);
  const detailParts = scene.summaries
    .map((s) => {
      if (s.resolvedColor) {
        return `${s.option.label || "Color"} · ${s.resolvedColor.toUpperCase()}`;
      }
      return s.option.sub_label || s.option.label;
    })
    .filter(Boolean);

  const productCode =
    config.slug ||
    (config.name
      ? config.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")
      : "DF-CONFIGURED_PRODUCT");

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition"
            aria-label="Back to configure"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold tracking-tight select-none">
              <span className="font-extrabold text-slate-900 dark:text-white">Sim</span>
              <span className="font-extrabold text-[#dc2626]">Ho</span>
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              My Cart
            </span>
          </div>
        </div>

        <div className="flex items-center">
          <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 shadow-2xs">
            {quantity} {quantity === 1 ? "item" : "items"}
          </span>
        </div>
      </header>

      {/* Hero Banner (Burgundy/Maroon) */}
      <div className="w-full bg-[#701524] px-4 py-8 sm:px-8 lg:px-12 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-rose-200/90">
              SIMHO · CHECKOUT · COMPLIANT SUPPLY
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-white">
              Review your cart.
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-rose-100/90 max-w-md sm:text-right leading-relaxed">
            Confirm quantities and line items, then continue to invoice details
            and secure payment.
          </p>
        </div>
      </div>

      {/* Main Cart Body */}
      <main className="flex-1 w-full px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Cart Items (8 cols) */}
          <section className="lg:col-span-8 rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {/* Header row */}
            <div className="flex items-center justify-between pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Cart Items
              </span>
              <button
                type="button"
                onClick={() => setIsChecked(!isChecked)}
                className="text-xs font-semibold text-[#701524] hover:underline dark:text-rose-400"
              >
                {isChecked ? "Deselect all" : "Select all"}
              </button>
            </div>

            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Your configured products
            </h2>

            {/* Ready for checkout alert */}
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Ready for checkout
                </span>
              </div>
              <p className="mt-0.5 pl-4 text-xs text-emerald-700 dark:text-emerald-400">
                Review quantities, then continue to invoice details for secure payment.
              </p>
            </div>

            {/* Configured Product Line Item */}
            <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => setIsChecked(e.target.checked)}
                  className="mt-1.5 size-4.5 rounded border-slate-300 text-[#701524] accent-[#701524] cursor-pointer"
                />

                {/* Product Thumbnail / Canvas image */}
                <div className="relative size-20 sm:size-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-800/80 flex items-center justify-center">
                  {scene.canvasImage ? (
                    <img
                      src={scene.canvasImage}
                      alt={config.name || "Configured Product"}
                      className="size-full object-contain"
                    />
                  ) : (
                    <ShoppingBag className="size-8 text-slate-400" />
                  )}
                </div>

                {/* Product Meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1">
                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
                        {config.name || "Configured Product"}
                      </h3>
                      <p className="text-[11px] font-mono uppercase text-slate-400 mt-0.5">
                        {productCode}
                      </p>
                    </div>
                    <span className="text-sm sm:text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                      £{basePrice.toFixed(2)}
                    </span>
                  </div>

                  {/* Summary string */}
                  {detailParts.length > 0 && (
                    <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {detailParts.join(" · ")}
                    </p>
                  )}
                </div>
              </div>

              {/* Badges / Selected Options Grid */}
              {optionList.length > 0 && (
                <div className="mt-4 sm:ml-10 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {optionList.map((opt, idx) => {
                    const rawOptPrice = opt.price ?? (opt as any).selling_price;
                    const optPrice =
                      typeof rawOptPrice === "number"
                        ? rawOptPrice
                        : parseFloat(String(rawOptPrice || 0).replace(/[^0-9.-]/g, "")) || 0;

                    return (
                      <div
                        key={opt.uid || opt.o_id || idx}
                        className="flex flex-col items-center justify-center rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 text-center dark:border-slate-800 dark:bg-slate-800/50"
                      >
                        <CheckCircle2 className="size-3.5 text-slate-400 shrink-0 mb-1" />
                        <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 line-clamp-2 leading-tight">
                          {opt.label}
                        </span>
                        {optPrice > 0 && (
                          <span className="mt-1 text-[10px] font-bold font-mono text-emerald-600 dark:text-emerald-400">
                            +£{optPrice.toFixed(2)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quantity Controls & Delete */}
              <div className="mt-5 sm:ml-10 flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
                <div className="flex items-center rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="flex size-7 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity(quantity + 1)}
                    className="flex size-7 items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={onBack}
                  className="p-1.5 text-slate-400 hover:text-red-600 transition"
                  title="Remove item or re-configure"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </div>
          </section>

          {/* Right Column: Order Summary (4 cols) */}
          <aside className="lg:col-span-4 rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 sticky top-20">
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Order Summary
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#701524] dark:text-rose-400">
                Live Total
              </span>
            </div>

            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {quantity} {quantity === 1 ? "item" : "items"} in cart
            </p>

            {/* Calculations */}
            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  £{subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Delivery</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  £{deliveryFee.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>VAT (20%)</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">
                  £{vat.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="my-5 border-t border-slate-200 dark:border-slate-800" />

            {/* Indicative Total */}
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Indicative Total
              </span>
              <div className="mt-1 text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-mono">
                £{grandTotal.toFixed(2)}
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Including VAT · subject to technical review
              </p>
            </div>

            {/* Continue to invoice button */}
            <button
              type="button"
              disabled={isSubmitting || !isChecked}
              onClick={onContinueToInvoice}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#701524] py-3.5 px-4 text-sm font-semibold text-white shadow-sm hover:bg-[#5a101c] active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Processing Invoice...</span>
                </>
              ) : (
                <>
                  <span>Continue to invoice</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </aside>
        </div>
      </main>
    </div>
  );
};
