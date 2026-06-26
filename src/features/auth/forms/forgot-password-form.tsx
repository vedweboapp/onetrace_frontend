"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslations } from "next-intl";
import { Mail, Loader2, Eye, EyeClosed } from "lucide-react";
import { AUTH_OTP_PURPOSE, requestForgotPasswordOtp, resetPasswordConfirm, verifyOtp } from "@/features/auth/api/auth.api";
import { cn } from "@/core/utils/http.util";
import { Link, useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { AppButton } from "@/shared/ui";


const forgotPasswordSchema = z.object({
  email: z.string().min(1, "emailRequired").email("emailInvalid"),
  otp: z.string(),
  new_password: z.string().min(1, "New password is required").min(8, "Password must be at least 8 characters"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const tVal = useTranslations("validation");

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "", otp: "", new_password: "" },
  });
  const router = useRouter();
  const otpRefs = React.useRef<Array<HTMLInputElement | null>>([]);
  const resendPressedRef = React.useRef(false);
  function handleOtpDigit(index: number, raw: string) {
    const val = raw.replace(/\D/g, "").slice(-1);
    const current = form.getValues("otp") ?? "";
    const digits = current.split("");
    digits[index] = val;
    form.setValue("otp", digits.join(""));
    if (val && index < 5) otpRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !e.currentTarget.value && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [curerntStep, setCurrentStep] = React.useState<string>("send-otp");
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [mode] = React.useState<"password" | "otp">("password"); // visual only (matches screenshot)
  const [showPassword, setShowPassword] = React.useState(false);
  const [resendVisible, setResendVisible] = React.useState(false)
  const [resendPressed, setResendPressed] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState<number>();
  async function onSubmit(values: ForgotPasswordValues) {
    setApiError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);
    try {

      const ApiCalls: { key: string, call: () => Promise<void> }[] = [
        {
          key: "send-otp",
          call: () => requestForgotPasswordOtp({
            email: values.email,
            purpose: AUTH_OTP_PURPOSE.passwordReset,
          }),
        },
        {
          key: "verify-otp",
          call: () => verifyOtp({
            email: values.email,
            otp: values.otp,
            purpose: AUTH_OTP_PURPOSE.passwordReset,
          })
        },
        {
          key: "reset-password",
          call: () => resetPasswordConfirm({
            email: values.email,
            new_password: values.new_password,
            new_password_confirm: values.new_password
          })
        }
      ]
      if (curerntStep == "verify-otp" && resendPressedRef.current == true) {
        await requestForgotPasswordOtp({
          email: values.email,
          purpose: AUTH_OTP_PURPOSE.passwordReset,
        })
        setResendVisible(false)
      } else {
        await ApiCalls.find((call) => call.key === curerntStep)?.call();

      }
      if (curerntStep == "reset-password") {
        router.push(routes.auth.login);
        return;
      }

      setCurrentStep(curerntStep == "send-otp" ? "verify-otp" : (curerntStep == "verify-otp" && !resendPressedRef.current) ? "reset-password" : "verify-otp")
      setResendPressed(false);
      resendPressedRef.current = false;
      setSuccessMessage(t("otpSent", { email: values.email }));
    } catch {
      setApiError(t("otpSendError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  React.useEffect(() => {
    if (curerntStep != "verify-otp") return;
    setTimeLeft(50)
    const timeUntillResend = Date.now() + 50 * 1000;
    console.log("called the fucntion after resend")
    const Intervel = setInterval(() => {
      const CurrentTime = Date.now();
      const TimeLeft = Math.max(0, Math.floor((timeUntillResend - CurrentTime) / 1000));
      setTimeLeft(TimeLeft);
      console.log("So this is the time left" + TimeLeft);
      if (TimeLeft <= 0) {
        setResendVisible(true)
        clearInterval(Intervel)
      }
    }, 1000)
    return () => clearInterval(Intervel);
  }, [curerntStep, resendPressed])

  function formatTime(totalSeconds: number): string {
    const safeSeconds = Math.floor(totalSeconds); // force whole number first
    const minutes = Math.floor(safeSeconds / 60);
    const seconds = safeSeconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
          {
            curerntStep === "send-otp" && (
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
            )
          }
          {
            curerntStep === "verify-otp" && (
              <div className="space-y-3">
                <label className="block text-[13px] font-semibold text-slate-700" style={{ letterSpacing: "0.01em" }}>
                  Enter the 6-digit code sent to your email
                </label>
                <div className="flex gap-2 justify-center">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      ref={(el) => { otpRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      className="h-12 w-12 rounded-xl border border-slate-200 bg-slate-50 text-center text-lg font-semibold text-slate-900 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8"
                      onChange={(e) => handleOtpDigit(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-end">
                  {
                    resendVisible ? (
                      <button className="text-md font-semibold text-slate-800 hover:underline cursor-pointer" onClick={() => { setResendPressed(true), resendPressedRef.current = true, void form.handleSubmit(onSubmit)() }}>
                        {t("forgotPassword.resend")}
                      </button>
                    ) : (
                      <div>
                        <span className="font-medium text-slate-600">
                          {
                            t("resendIn")
                          }
                        </span>
                        <span className="font-semibold text-slate-800">{formatTime(timeLeft)}</span>
                      </div>
                    )
                  }


                </div>

              </div>
            )
          }
          {
            curerntStep === "reset-password" && (
              <div className="space-y-4">
                <label htmlFor="">
                  New Password
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} placeholder="Enter new password" className={cn(inputCls, "")} {...form.register("new_password", {
                    required: "New password is required",

                  })} />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <Eye size={18} /> : <EyeClosed size={18} />}
                  </button>
                </div>
                {form.formState.errors.new_password ? (
                  <p className="text-[12px] text-red-500">
                    {form.formState.errors.new_password.message}
                  </p>
                ) : null}

              </div>
            )
          }
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
      <div className="flex items-center justify-center p-2 gap-3">
        <span className="mt-1.5 text-[14px] text-slate-500 ">
          {t("forgotPassword.rememberThePassword")}
        </span>
        <Link href={routes.auth.login} className="mt-1.5 text-[14px] hover:underline text-slate-900 font-bold">{t("forgotPassword.backToLogin")}</Link>
      </div>
    </div>
  );
}

