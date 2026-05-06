"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Circle, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { resetPasswordConfirm } from "@/features/auth/api/auth.api";
import { routes } from "@/shared/config/routes";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(1, "passwordRequired"),
    confirmPassword: z.string().min(1, "passwordRequired"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "passwordsDoNotMatch",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

function passwordChecks(password: string) {
  const lengthOk = password.length >= 8;
  const upperOk = /[A-Z]/.test(password);
  const lowerOk = /[a-z]/.test(password);
  const numberOk = /[0-9]/.test(password);
  const specialOk = /[!@#$%^&*]/.test(password);
  return { lengthOk, upperOk, lowerOk, numberOk, specialOk };
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const t = useTranslations("Auth");
  const validation = useTranslations("validation");

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [apiError, setApiError] = React.useState<string | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [newPasswordValue, setNewPasswordValue] = React.useState("");
  const checks = passwordChecks(newPasswordValue);

  async function onSubmit(values: ResetPasswordValues) {
    setApiError(null);
    if (!token) {
      setApiError(t("resetPassword.tokenMissing"));
      return;
    }
    setIsSubmitting(true);
    try {
      await resetPasswordConfirm({
        token,
        new_password: values.newPassword,
        confirm_password: values.confirmPassword,
      });
      router.push(routes.auth.login);
    } catch {
      setApiError(t("resetPassword.error"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputCls =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";

  const toggleBtnClass = cn(
    "absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600",
  );

  const criteriaItem = (ok: boolean, label: string) => {
    return (
      <li className="flex items-center gap-2 text-[13px]">
        {ok ? <CheckCircle2 className="size-4 text-emerald-500" /> : <Circle className="size-4 text-slate-300" />}
        <span className={ok ? "text-emerald-600" : "text-slate-500"}>{label}</span>
      </li>
    );
  };

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
          {t("resetPassword.title")}
        </h1>
        <p className="mt-1.5 text-[14px] text-slate-500" style={{ fontWeight: 400 }}>
          {t("resetPassword.body")}
        </p>
      </div>

      {/* ── Card ── */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_-8px_rgba(15,23,42,0.18)]">
        <div className="h-[3px] w-full bg-[#0f172a]" />

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-5 p-6"
          noValidate
        >
          {/* ── Mode toggle (visual only) ── */}
          <div className="grid grid-cols-2 rounded-xl p-1" style={{ background: "#f1f5f9" }}>
            {(["password", "otp"] as const).map((m) => {
              const selected = m === "otp"; // matches screenshot styling
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

          {/* ── New password ── */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-700" style={{ letterSpacing: "0.01em" }}>
              {t("resetPassword.newPassword")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                {...form.register("newPassword")}
                onChange={(e) => { setNewPasswordValue(e.target.value); form.setValue("newPassword", e.target.value, { shouldValidate: true }); }}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className={cn(inputCls, "pl-10 pr-11")}
              />
              <button
                type="button"
                className={toggleBtnClass}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.newPassword ? (
              <p className="text-[12px] text-red-500">{validation(form.formState.errors.newPassword.message ?? "")}</p>
            ) : null}
          </div>

          {/* ── Confirm password ── */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-slate-700" style={{ letterSpacing: "0.01em" }}>
              {t("resetPassword.confirmPassword")} <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                {...form.register("confirmPassword")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="••••••••"
                className={cn(inputCls, "pl-10 pr-11")}
              />
              <button
                type="button"
                className={toggleBtnClass}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword ? (
              <p className="text-[12px] text-red-500">
                {form.formState.errors.confirmPassword.message === "passwordsDoNotMatch"
                  ? t("resetPassword.passwordsDoNotMatch")
                  : validation(form.formState.errors.confirmPassword.message ?? "")}
              </p>
            ) : null}
          </div>

          {/* ── Requirements checklist ── */}
          <ul className="space-y-2 pt-1">
            {criteriaItem(checks.lengthOk, t("resetPassword.requirements.atLeast8"))}
            {criteriaItem(checks.upperOk, t("resetPassword.requirements.atLeastUpper"))}
            {criteriaItem(checks.lowerOk, t("resetPassword.requirements.atLeastLower"))}
            {criteriaItem(checks.numberOk, t("resetPassword.requirements.atLeastNumber"))}
            {criteriaItem(checks.specialOk, t("resetPassword.requirements.atLeastSpecial"))}
          </ul>

          {/* ── CTA button ── */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold text-white transition-all disabled:opacity-70"
            style={{ background: "#0f172a", cursor: isSubmitting ? "wait" : "pointer" }}
          >
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : t("resetPassword.cta")}
          </button>

          {apiError ? <p className="text-center text-[12px] text-red-500">{apiError}</p> : null}

        </form>
      </div>
    </div>
  );
}

