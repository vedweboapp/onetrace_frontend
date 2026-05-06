"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Mail, Loader2 } from "lucide-react";
import { requestForgotPasswordOtp } from "@/features/auth/api/auth.api";
import { cn } from "@/core/utils/http.util";

const forgotPasswordSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const tVal = useTranslations("validation");

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [mode] = React.useState<"password" | "otp">("password"); // visual only (matches screenshot)

  async function onSubmit(values: ForgotPasswordValues) {
    setApiError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {
      await requestForgotPasswordOtp({ email: values.email });
      setSuccessMessage(t("otpSent", { email: values.email }));
    } catch {
      // Reuse the existing OTP send error key for consistent UX.
      setApiError(t("otpSendError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* ── Title (outside card) ── */}
      <div className="mb-7 text-center">
        <h1
          className="text-slate-900"
          style={{
            fontSize: "30px",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            lineHeight: 1.15,
          }}
        >
          {t("forgotPassword.title")}
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500" style={{ fontWeight: 400 }}>
          {t("forgotPassword.body")}
        </p>
      </div>

      {/* ── Card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18)]">
        {/* Top accent bar */}
        <div className="h-[3px] w-full bg-[#0f172a]" />

        <div className="space-y-5 p-6">
          {/* ── Mode toggle (visual, matches screenshot) ── */}
          <div className="grid grid-cols-2 rounded-xl p-1" style={{ background: "#f1f5f9" }}>
            {(["password", "otp"] as const).map((m) => {
              const selected = mode === m;
              return (
                <button
                  key={m}
                  type="button"
                  className="transition-all"
                  style={{
                    height: "38px",
                    borderRadius: "10px",
                    fontSize: "13.5px",
                    fontWeight: 600,
                    background: selected ? "#0f172a" : "transparent",
                    color: selected ? "#ffffff" : "#64748b",
                    border: "none",
                    cursor: "default",
                    letterSpacing: "0.01em",
                    transition: "background 0.2s ease, color 0.2s ease",
                  }}
                >
                  {m === "password" ? t("password") : t("otpLogin")}
                </button>
              );
            })}
          </div>

          {/* ── Fields ── */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-700" style={{ letterSpacing: "0.01em" }}>
              {t("workEmail")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                {...form.register("email")}
                type="email"
                autoComplete="email"
                placeholder={t("emailPlaceholder")}
                className={cn(inputCls, "pl-10")}
                onBlur={() => void form.trigger("email")}
              />
            </div>
            {form.formState.errors.email ? (
              <p className="text-[12px] text-red-500">
                {tVal(form.formState.errors.email.message ?? "")}
              </p>
            ) : null}
            {apiError ? <p className="text-[12px] text-red-500">{apiError}</p> : null}
            {successMessage ? (
              <p className="text-[12px] text-emerald-600">{successMessage}</p>
            ) : null}
          </div>

          {/* ── CTA button ── */}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void form.handleSubmit(onSubmit)()}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-70"
            style={{
              background: "#0f172a",
              letterSpacing: "0.01em",
              cursor: isSubmitting ? "wait" : "pointer",
            }}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("sendOtp")}
          </button>
        </div>
      </div>
    </div>
  );
}

