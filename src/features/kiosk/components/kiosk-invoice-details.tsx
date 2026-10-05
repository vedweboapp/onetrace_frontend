"use client";

import React, { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  Loader2,
} from "lucide-react";
import type { KioskConfig } from "../types/kiosk.types";
import type { LiveBuildScene } from "../utils/kiosk-live-build";

export interface KioskBillingDetails {
  fullName: string;
  companyName?: string;
  email: string;
  phone: string;
  vatRegistered: boolean;
  vatNumber?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
}

export interface KioskInvoiceDetailsProps {
  config: KioskConfig;
  answers: Record<string, unknown>;
  scene: LiveBuildScene;
  payload?: { total_price?: number; [key: string]: unknown };
  /** Pre-computed totals passed from the cart to ensure price consistency */
  cartTotals?: { grandTotal: number; subtotal: number; deliveryFee: number; vat: number; quantity: number };
  onBack: () => void;
  onSubmitInvoice: (billingDetails: KioskBillingDetails) => Promise<void> | void;
  isSubmitting?: boolean;
}

export const KioskInvoiceDetails: React.FC<KioskInvoiceDetailsProps> = ({
  config,
  answers,
  scene,
  payload,
  cartTotals,
  onBack,
  onSubmitInvoice,
  isSubmitting = false,
}) => {
  const [formData, setFormData] = useState<KioskBillingDetails>({
    fullName: "",
    companyName: "",
    email: "",
    phone: "",
    vatRegistered: false,
    vatNumber: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postcode: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const configListRef = React.useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const checkScroll = React.useCallback(() => {
    const el = configListRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 2);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 2);
  }, []);

  React.useEffect(() => {
    checkScroll();
    const el = configListRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll, scene.summaries]);

  const handleScrollUp = () => {
    configListRef.current?.scrollBy({ top: -75, behavior: "smooth" });
  };

  const handleScrollDown = () => {
    configListRef.current?.scrollBy({ top: 75, behavior: "smooth" });
  };

  // Use cart-computed totals when available (ensures price consistency between cart & invoice)
  const rawBasePrice =
    typeof payload?.total_price === "number" && payload.total_price > 0
      ? payload.total_price
      : scene.totalPrice > 0
      ? scene.totalPrice
      : 0;
  const basePrice = Math.max(0, rawBasePrice);

  const subtotal    = cartTotals?.subtotal    ?? basePrice;
  const deliveryFee = cartTotals?.deliveryFee ?? (basePrice > 0 ? 10.0 : 0);
  const vat         = cartTotals?.vat         ?? (basePrice > 0 ? basePrice * 0.2 : 0);
  const grandTotal  = cartTotals?.grandTotal  ?? (subtotal + (basePrice > 0 ? 10.0 : 0) + (basePrice > 0 ? basePrice * 0.2 : 0));
  const quantity    = cartTotals?.quantity    ?? 1;

  const productCode =
    config.slug ||
    (config.name
      ? config.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")
      : "DF-CONFIGURED_PRODUCT");

  // Summary parts
  const detailParts = scene.summaries
    .map((s) => {
      if (s.resolvedColor) {
        return `${s.option.label || "Color"} · ${s.resolvedColor.toUpperCase()}`;
      }
      return s.option.sub_label || s.option.label;
    })
    .filter(Boolean);

  const handleInputChange = (field: keyof KioskBillingDetails, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.addressLine1.trim()) newErrors.addressLine1 = "Address line 1 is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (!formData.postcode.trim()) newErrors.postcode = "Postcode is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    if (validate()) {
      void onSubmitInvoice(formData);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f4f5f7] dark:bg-slate-950 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8 lg:px-12 dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex size-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Back to cart"
          >
            <ArrowLeft className="size-5" />
          </button>
          <div className="flex items-center gap-3">
            <span className="text-xl sm:text-2xl font-bold tracking-tight select-none">
              <span className="font-extrabold text-slate-900 dark:text-white">Sim</span>
              <span className="font-extrabold text-[#dc2626]">Ho</span>
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Invoice details
            </span>
          </div>
        </div>
      </header>

      {/* Hero Banner (Burgundy/Maroon) */}
      <div className="w-full bg-[#701524] text-white px-4 py-6 sm:px-8 lg:px-12 sm:py-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-red-200/90 select-none">
              SIMHO · CHECKOUT · INVOICE
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl text-white">
              Confirm billing details.
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-red-100/90 max-w-md sm:text-right leading-relaxed font-normal">
            Enter the contact and address for your invoice, then continue to secure payment.
          </p>
        </div>
      </div>

      {/* Main Body */}
      <main className="flex-1 w-full px-4 py-6 sm:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-12 items-start">
          {/* Left Column: Billing Contact Form (7 cols) */}
          <section className="lg:col-span-7 rounded-xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <form onSubmit={handleSubmit} noValidate>
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  BILLING CONTACT
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  REQUIRED
                </span>
              </div>

              <h2 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">
                Invoice details
              </h2>

              {/* Secure Checkout Alert */}
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3.5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                    Secure checkout
                  </span>
                </div>
                <p className="mt-0.5 pl-4 text-xs text-emerald-700 dark:text-emerald-400">
                  These details appear on your invoice and payment confirmation.
                </p>
              </div>

              {/* Form Fields */}
              <div className="mt-6 space-y-4">
                {/* Full name */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange("fullName", e.target.value)}
                    placeholder="Enter full name"
                    className={`h-10 w-full rounded-lg border ${
                      errors.fullName ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                    } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                  />
                  {errors.fullName && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.fullName}</p>
                  )}
                </div>

                {/* Company name (optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Company name (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.companyName}
                    onChange={(e) => handleInputChange("companyName", e.target.value)}
                    placeholder="Enter company name"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange("email", e.target.value)}
                    placeholder="name@example.com"
                    className={`h-10 w-full rounded-lg border ${
                      errors.email ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                    } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                  />
                  {errors.email && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.email}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="+44 7123 456789"
                    className={`h-10 w-full rounded-lg border ${
                      errors.phone ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                    } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                  />
                  {errors.phone && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.phone}</p>
                  )}
                </div>

                {/* VAT registered switch */}
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200">
                    VAT registered
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={formData.vatRegistered}
                    onClick={() => handleInputChange("vatRegistered", !formData.vatRegistered)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#701524] focus:ring-offset-2 ${
                      formData.vatRegistered ? "bg-[#701524]" : "bg-slate-300 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        formData.vatRegistered ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {formData.vatRegistered && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      VAT number (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.vatNumber || ""}
                      onChange={(e) => handleInputChange("vatNumber", e.target.value)}
                      placeholder="GB123456789"
                      className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                    />
                  </div>
                )}

                {/* Address line 1 */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Address line 1
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine1}
                    onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                    placeholder="Street address or P.O. Box"
                    className={`h-10 w-full rounded-lg border ${
                      errors.addressLine1 ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                    } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                  />
                  {errors.addressLine1 && (
                    <p className="mt-1 text-[11px] text-red-500">{errors.addressLine1}</p>
                  )}
                </div>

                {/* Address line 2 (optional) */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Address line 2 (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.addressLine2}
                    onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    placeholder="Apartment, suite, unit, building, floor, etc."
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>

                {/* City & Postcode (2 columns) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                      placeholder="City or town"
                      className={`h-10 w-full rounded-lg border ${
                        errors.city ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                      } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                    />
                    {errors.city && (
                      <p className="mt-1 text-[11px] text-red-500">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => handleInputChange("postcode", e.target.value)}
                      placeholder="Postcode / ZIP"
                      className={`h-10 w-full rounded-lg border ${
                        errors.postcode ? "border-red-500 focus:ring-red-500" : "border-slate-200 dark:border-slate-700"
                      } bg-white px-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100`}
                    />
                    {errors.postcode && (
                      <p className="mt-1 text-[11px] text-red-500">{errors.postcode}</p>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </section>

          {/* Right Column: Order Details & Configuration Summary (5 cols) */}
          <section className="lg:col-span-5 lg:sticky lg:top-20 lg:self-start rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            {/* Header */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                ORDER DETAILS
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#701524] dark:text-red-400">
                NEXT STEP
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              1 cart item
            </p>

            {/* Product Item Snippet */}
            <div className="mt-3.5 flex items-start justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="min-w-0">
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {config.name || "Configured Door"}
                </h3>
                <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
                  {productCode}
                </p>
                {detailParts.length > 0 && (
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    {detailParts.join(" · ")}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                  £{subtotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Configuration Items List */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  CONFIGURATION
                </h4>
                {scene.summaries.length > 3 && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={handleScrollUp}
                      disabled={!canScrollUp}
                      className="flex size-5.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      title="Scroll up"
                      aria-label="Scroll up configuration list"
                    >
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleScrollDown}
                      disabled={!canScrollDown}
                      className="flex size-5.5 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs transition hover:bg-slate-50 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                      title="Scroll down"
                      aria-label="Scroll down configuration list"
                    >
                      <ChevronDown className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
              <div
                ref={configListRef}
                onScroll={checkScroll}
                className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-[260px] overflow-y-auto pr-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
              >
                {scene.summaries.length === 0 ? (
                  <p className="py-2 text-xs text-slate-400">Standard configuration</p>
                ) : (
                  scene.summaries.map((s, idx) => {
                    const price = Number(s.option.price) || 0;
                    const color = s.resolvedColor || s.option.color;

                    return (
                      <div
                        key={s.option.uid || s.option.o_id || idx}
                        className="flex items-center justify-between py-2 text-xs gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {color ? (
                            <span
                              className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-2xs"
                              style={{ backgroundColor: color }}
                            />
                          ) : (
                            <CheckCircle2 className="size-3.5 shrink-0 text-blue-500/80" />
                          )}
                          <div className="min-w-0">
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">
                              {s.questionLabel}
                            </p>
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                              {s.option.label || s.option.sub_label || "Selected"}
                            </p>
                          </div>
                        </div>

                        {price > 0 && (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400 text-xs shrink-0">
                            +£{price.toFixed(0)}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Price Breakdown — identical to cart summary */}
            <div className="mt-5 space-y-2 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Subtotal</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">£{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>Delivery</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">£{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-300">
                <span>VAT (20%)</span>
                <span className="font-semibold font-mono text-slate-900 dark:text-slate-100">£{vat.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</span>
                <span className="text-base font-extrabold font-mono text-slate-900 dark:text-white">£{grandTotal.toFixed(2)}</span>
              </div>
              {quantity > 1 && (
                <p className="text-[10px] text-slate-400">× {quantity} items</p>
              )}
            </div>

            {/* Right Card Action */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#701524] py-3 text-sm font-semibold text-white shadow-xs hover:bg-[#5a101c] active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Redirecting to Stripe…</span>
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5 opacity-80" />
                    <span>Pay securely with Stripe</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
              {/* Stripe trust badge */}
              <p className="mt-2 flex items-center justify-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
                <Lock className="size-3" />
                Payments are processed securely by{" "}
                <span className="font-semibold text-[#635bff]">Stripe</span>.
                Your card details never touch our servers.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
