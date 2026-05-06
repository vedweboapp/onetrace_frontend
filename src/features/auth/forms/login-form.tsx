"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { ArrowLeft, Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  loginSchema,
  type AuthValidationMessageKey,
  type LoginFormValues,
} from "@/features/auth/schemas/login-schema";
import { useLogin } from "@/features/auth/hooks/use-login";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

export function LoginForm() {
  const t = useTranslations("Auth");
  const tVal = useTranslations("validation");
  const { submit, isSubmitting, sendOtp, submitOtp, isOtpSubmitting, isOtpVerifying } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const translateError = (key: string) => tVal(key as AuthValidationMessageKey);

  const [mode, setMode] = React.useState<"password" | "otp">("password");
  const [keepSignedIn, setKeepSignedIn] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [otpStep, setOtpStep] = React.useState<"email" | "verify">("email");
  const [otpEmail, setOtpEmail] = React.useState("");
  const [otpDigits, setOtpDigits] = React.useState(["", "", "", "", "", ""]);
  const [otpEmailError, setOtpEmailError] = React.useState<string | null>(null);
  const [otpCodeError, setOtpCodeError] = React.useState<string | null>(null);
  const [resendIn, setResendIn] = React.useState(59);
  const otpRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  React.useEffect(() => {
    if (mode !== "otp" || otpStep !== "verify" || resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [mode, otpStep, resendIn]);

  function resetOtpState() {
    setOtpStep("email");
    setOtpDigits(["", "", "", "", "", ""]);
    setOtpEmailError(null);
    setOtpCodeError(null);
    setResendIn(59);
  }

  function maskEmail(v: string) {
    const [name, domain] = v.split("@");
    if (!name || !domain) return v;
    const shown =
      name.length <= 2
        ? (name[0] ?? "*")
        : `${name[0]}${"*".repeat(Math.max(1, name.length - 2))}${name[name.length - 1]}`;
    return `${shown}@${domain}`;
  }

  async function handleRequestOtp() {
    const email = otpEmail.trim();
    if (!/\S+@\S+\.\S+/.test(email)) {
      setOtpEmailError(tVal("emailInvalid"));
      return;
    }
    setOtpEmailError(null);
    try {
      await sendOtp(email);
      setOtpStep("verify");
      setResendIn(59);
      toastSuccess(t("otpSent", { email: maskEmail(email) }));
      window.setTimeout(() => otpRefs.current[0]?.focus(), 50);
    } catch { toastError(t("otpSendError")); }
  }

  async function handleVerifyOtp() {
    const otp = otpDigits.join("");
    if (otp.length !== 6) {
      setOtpCodeError(t("otpRequired"));
      return;
    }
    setOtpCodeError(null);
    try { await submitOtp(otpEmail.trim(), otp); }
    catch { toastError(t("otpVerifyError")); }
  }

  async function handleResendOtp() {
    if (resendIn > 0) return;
    try { await sendOtp(otpEmail.trim()); setResendIn(59); toastSuccess(t("otpResent")); }
    catch { toastError(t("otpSendError")); }
  }

  function setOtpDigit(index: number, raw: string) {
    const val = raw.replace(/\D/g, "").slice(-1);
    setOtpDigits((prev) => { const next = [...prev]; next[index] = val; return next; });
    if (otpCodeError) setOtpCodeError(null);
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  }

  // Shared input class
  const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";

  return (
    <form
      className="w-full"
      style={{ fontFamily: "'Inter', sans-serif" }}
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      {/* ── Title (outside card) ── */}
      <div className="mb-7 text-center">
        <h1
          className="text-slate-900"
          style={{ fontSize: "30px", fontWeight: 800, letterSpacing: "-0.025em", lineHeight: 1.15 }}
        >
          {t("title")}
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500" style={{ fontWeight: 400 }}>
          {t("subtitle")}
        </p>
      </div>

      {/* ── Card ── */}
      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18)]"
      >
        {/* Top accent bar */}
        <div className="h-[3px] w-full bg-gradient-to-r from-slate-900 via-slate-700 to-slate-500" />

        <div className="space-y-5 p-6">

          {/* ── Mode toggle ── */}
          <div
            className="grid grid-cols-2 rounded-xl p-1"
            style={{ background: "#f1f5f9" }}
          >
            {(["password", "otp"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); if (m === "password") resetOtpState(); }}
                className="transition-all"
                style={{
                  height: "38px",
                  borderRadius: "10px",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  background: mode === m ? "#0f172a" : "transparent",
                  color: mode === m ? "#ffffff" : "#64748b",
                  border: "none",
                  cursor: "pointer",
                  letterSpacing: "0.01em",
                  transition: "background 0.2s ease, color 0.2s ease",
                }}
              >
                {m === "password" ? t("password") : t("otpLogin")}
              </button>
            ))}
          </div>

          {/* ── Fields ── */}
          {mode === "password" ? (
            <div className="space-y-4">
              {/* Email */}
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
                    className={cn(
                      inputCls,
                      "pl-10",
                      form.formState.errors.email ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "",
                    )}
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-[12px] text-red-500">{translateError(form.formState.errors.email.message ?? "")}</p>
                )}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-semibold text-slate-700" style={{ letterSpacing: "0.01em" }}>
                  {t("password")} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    {...form.register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={cn(
                      inputCls,
                      "pl-10 pr-11",
                      form.formState.errors.password ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "",
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                    aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-[12px] text-red-500">{translateError(form.formState.errors.password.message ?? "")}</p>
                )}
              </div>
            </div>

          ) : otpStep === "email" ? (
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-slate-700">
                {t("workEmail")} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={otpEmail}
                  onChange={(e) => {
                    setOtpEmail(e.target.value);
                    if (otpEmailError) setOtpEmailError(null);
                  }}
                  type="email"
                  autoComplete="email"
                  placeholder={t("emailPlaceholder")}
                  className={cn(
                    inputCls,
                    "pl-10",
                    otpEmailError ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "",
                  )}
                />
              </div>
              {otpEmailError ? <p className="text-[12px] text-red-500">{otpEmailError}</p> : null}
            </div>

          ) : (
            <div className="space-y-3">
              <label className="block text-[13px] font-semibold text-slate-700">
                {t("otpLabel")} <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => setOtpDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Backspace" && !otpDigits[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                    className={cn(
                      "h-12 flex-1 rounded-xl border border-slate-200 bg-slate-50 text-center text-[18px] font-bold text-slate-900 outline-none transition focus:border-slate-900 focus:bg-white focus:ring-2 focus:ring-slate-900/10",
                      otpCodeError ? "border-red-400 focus:border-red-500 focus:ring-red-500/15" : "",
                    )}
                    style={{ minWidth: 0 }}
                  />
                ))}
              </div>
              {otpCodeError ? <p className="text-[12px] text-red-500">{otpCodeError}</p> : null}
              <div className="text-right text-[13px] text-slate-500">
                {t("resendIn")}{" "}
                {resendIn > 0 ? (
                  <span className="font-semibold text-slate-800">00:{String(resendIn).padStart(2, "0")}</span>
                ) : (
                  <button type="button" className="font-semibold text-slate-800 underline-offset-4 hover:underline" onClick={() => void handleResendOtp()}>
                    {t("resendNow")}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── Keep signed in + forgot password ── */}
          {mode === "password" && (
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-slate-500 select-none">
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  className="size-4 rounded border-slate-300 accent-slate-900"
                />
                {t("keepSignedIn")}
              </label>
              <Link
                href={routes.auth.forgotPassword}
                className="text-[13px] font-semibold text-slate-800 underline-offset-4 hover:underline"
              >
                {t("forgotPasswordLink")}
              </Link>
            </div>
          )}

          {/* ── CTA button ── */}
          {mode === "password" ? (
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-70"
              style={{
                background: "#0f172a",
                letterSpacing: "0.01em",
                cursor: isSubmitting ? "wait" : "pointer",
              }}
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("submit")}
            </button>

          ) : otpStep === "email" ? (
            <button
              type="button"
              onClick={() => void handleRequestOtp()}
              disabled={isOtpSubmitting}
              className="inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-70"
              style={{ background: "#0f172a" }}
            >
              {isOtpSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("continue")}
            </button>

          ) : (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleVerifyOtp()}
                disabled={isOtpVerifying}
                className="inline-flex h-12 w-full items-center justify-center rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-70"
                style={{ background: "#0f172a" }}
              >
                {isOtpVerifying ? <Loader2 className="size-4 animate-spin" /> : t("submit")}
              </button>
              <button
                type="button"
                onClick={resetOtpState}
                className="inline-flex w-full items-center justify-center gap-2 text-[13px] font-medium text-slate-600 transition hover:text-slate-900"
              >
                <ArrowLeft className="size-4" /> {t("backToLogin")}
              </button>
            </div>
          )}

        </div>
      </div>
    </form>
  );
}