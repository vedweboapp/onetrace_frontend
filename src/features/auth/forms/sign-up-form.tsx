"use client";
import { cn } from "@/core/utils/http.util";
import { SurfacePhoneField } from "@/shared/ui";
import { ChevronRight, Eye, EyeClosed, Mail, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { OTPInput } from "input-otp";
import { Link, useRouter } from "@/i18n/navigation";
import { sendOtp, signUpHandler, verifyOtp } from "../api/auth.api";
import { toastApiError, toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { routes } from "@/shared/config/routes";
import { isApiBusinessError } from "@/core/errors/api-business-error";

// Matches: local@domain.tld
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const COMPANY_SIZE_OPTIONS = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
];

type SignUpInput = {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone_number: string;
  company_size: string;
  otp: string;
  password: string;
  confirm_password: string;
  terms_and_conditions: boolean;
};

interface sendOtpBody {
  email: string;
  purpose: string;
}
interface verifyOtpType {
  email: string;
  purpose: string;
  otp: string;
}

/** Steps: 1 = personal info, 2 = OTP verify, 3 = password */
type Step = 1 | 2 | 3;

const STEP_LABELS = [
  { icon: Mail,         label: "Your Info" },
  { icon: ShieldCheck,  label: "Verify Email" },
  { icon: Lock,         label: "Set Password" },
];

const SignUpForm = () => {
  const [step, setStep] = useState<Step>(1);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    setValue,
    trigger,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: { otp: "", company_size: "" },
  });

  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const route = useRouter();
  const t = useTranslations("Auth.signUpForm");
  const p = useTranslations("Auth.signUpForm.placeholders");
  const e = useTranslations("Auth.signUpForm.errors");

  useEffect(() => {
    const auth = localStorage.getItem("auth-storage");
    if (auth) {
      try {
        const authToken = JSON.parse(auth);
        if (authToken?.state?.accessToken) {
          route.push(routes.dashboard.root);
        }
      } catch (err) {
        console.error(err);
      }
    }
  }, []);

  const emailData = watch("email");

  const onSubmit: SubmitHandler<SignUpInput> = async (data) => {
    try {
      const payload = {
        first_name: data.first_name.trim(),
        last_name: data.last_name.trim(),
        company_name: data.company_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone_number: data.phone_number,
        company_size: data.company_size,
        otp: data.otp,
        password: data.password,
        terms_and_conditions: !!data.terms_and_conditions,
      };
      await signUpHandler(payload as any);
      toastSuccess("Account created! Please log in.");
      route.push("/login");
    } catch (error) {
      toastApiError(error, "Failed to create account. Please try again.");
    }
  };

  const sendEmail = async () => {
    try {
      const valid = await trigger(["first_name", "last_name", "company_name", "email", "phone_number", "company_size"]);
      if (!valid) return;
      if (emailData && EMAIL_REGEX.test(emailData)) {
        setEmailSending(true);
        const payload: sendOtpBody = { email: emailData, purpose: "email_verify" };
        await sendOtp(payload);
        toastSuccess(t("toasts.Sent"));
        setValue("otp", "");
        setOtpSent(true);
        setStep(2);
        setResendTimer(60);
        setEmailSending(false);
      }
    } catch (err) {
      setOtpSent(false);
      setEmailVerified(false);
      setEmailSending(false);
      toastApiError(err, "Failed to send OTP.");
    }
  };

  const VerifyOtp = async () => {
    try {
      if (emailData && EMAIL_REGEX.test(emailData) && otpSent) {
        setVerifyingOtp(true);
        const payload: verifyOtpType = {
          email: emailData,
          purpose: "email_verify",
          otp: getValues("otp"),
        };
        await verifyOtp(payload);
        clearErrors("otp");
        toastSuccess(t("toasts.verified"));
        setEmailVerified(true);
        setVerifyingOtp(false);
        setStep(3);
      }
    } catch (err: any) {
      setEmailVerified(false);
      setVerifyingOtp(false);
      setValue("otp", "");

      // Extract error message from API response shape { message, errors: { otp: ["Invalid OTP"] } }
      let errorMsg = "Invalid OTP code";
      if (isApiBusinessError(err)) {
        if (err.errors && typeof err.errors === "object" && !Array.isArray(err.errors)) {
          const otpError = (err.errors as Record<string, unknown>).otp;
          if (Array.isArray(otpError) && otpError[0]) {
            errorMsg = String(otpError[0]);
          } else if (typeof otpError === "string") {
            errorMsg = otpError;
          }
        }
        if (err.message && errorMsg === "Invalid OTP code") {
          errorMsg = err.message;
        }
      } else if (err?.response?.data) {
        const d = err.response.data;
        if (d.errors?.otp?.[0]) {
          errorMsg = d.errors.otp[0];
        } else if (d.message) {
          errorMsg = d.message;
        }
      }

      setError("otp", { type: "manual", message: errorMsg });
    }
  };
  const agreementChecked = watch("terms_and_conditions")
  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";

  const errorClass =
    "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/15";

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-slate-900 text-3xl font-bold">{t("title")}</h1>
      </div>

      {/* Step Progress */}
      <div className="flex items-center justify-center gap-2">
        {STEP_LABELS.map((s, i) => {
          const stepNum = (i + 1) as Step;
          const done = step > stepNum;
          const active = step === stepNum;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all",
                  done
                    ? "bg-emerald-100 text-emerald-700"
                    : active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {done ? (
                  <CheckCircle2 className="size-3.5" />
                ) : (
                  <s.icon className="size-3.5" />
                )}
                {s.label}
              </div>
              {i < STEP_LABELS.length - 1 && (
                <ChevronRight className="size-3.5 text-slate-300" />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full bg-white rounded-xl border border-slate-200 border-t-slate-900 border-t-4 p-5 space-y-4">

        {/* ── STEP 1: Personal Info ── */}
        {step === 1 && (
          <>
            {/* First Name + Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  First Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  {...register("first_name", { required: "First name is required" })}
                  className={cn(inputClass, errors.first_name && errorClass)}
                  placeholder="John"
                />
                {errors.first_name && (
                  <p className="text-xs text-red-500">{errors.first_name.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 block">
                  Last Name <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  {...register("last_name", { required: "Last name is required" })}
                  className={cn(inputClass, errors.last_name && errorClass)}
                  placeholder="Smith"
                />
                {errors.last_name && (
                  <p className="text-xs text-red-500">{errors.last_name.message}</p>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 block">
                Company Name <span className="text-red-500 font-bold">*</span>
              </label>
              <input
                type="text"
                {...register("company_name", { required: "Company name is required" })}
                className={cn(inputClass, errors.company_name && errorClass)}
                placeholder="e.g. Acme Corp"
              />
              {errors.company_name && (
                <p className="text-xs text-red-500">{errors.company_name.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {t("email")} <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  {...register("email", {
                    required: e("emailRequired"),
                    pattern: { value: EMAIL_REGEX, message: e("emailInvalid") },
                  })}
                  type="email"
                  autoComplete="email"
                  placeholder={p("email")}
                  className={cn(inputClass, "pl-10", errors.email && errorClass)}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {t("phone")}
              </label>
              <SurfacePhoneField name="phone_number" control={control} id="sign-up-phone_number" label="" />
            </div>

            {/* Company Size */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 block">
                Company Size <span className="text-red-500 font-bold">*</span>
              </label>
              <select
                {...register("company_size", { required: "Company size is required" })}
                className={cn(
                  inputClass,
                  "appearance-none cursor-pointer",
                  errors.company_size && errorClass,
                )}
              >
                <option value="">Select company size…</option>
                {COMPANY_SIZE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {errors.company_size && (
                <p className="text-xs text-red-500">{errors.company_size.message}</p>
              )}
            </div>

            {/* Terms and Conditions (Optional) */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="terms_and_conditions"
                {...register("terms_and_conditions")}
                className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
              />
              <label htmlFor="terms_and_conditions" className="text-xs text-slate-600 cursor-pointer select-none">
                I agree to the Terms &amp; Conditions
              </label>
            </div>

            {/* Next → Send OTP */}
            <button
              type="button"
              onClick={sendEmail}
              disabled={emailSending || !agreementChecked}
              className={cn(
                "w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2",
              )}
            >
              {emailSending ? (
                t("sendingOtp")
              ) : (
                <>
                  Continue &amp; Verify Email
                  <ChevronRight className="size-4" />
                </>
              )}
            </button>
          </>
        )}

        {/* ── STEP 2: OTP Verification ── */}
        {step === 2 && (
          <>
            <div className="text-center space-y-1 pb-1">
              <p className="text-sm font-semibold text-slate-700">Check your inbox</p>
              <p className="text-xs text-slate-500">
                We sent a 6-digit code to <span className="font-bold text-slate-800">{emailData}</span>
              </p>
            </div>

            <Controller
              control={control}
              name="otp"
              rules={{
                required: e("otpRequired"),
                minLength: { value: 6, message: e("otpLength") },
              }}
              render={({ field }) => (
                <div>
                  <OTPInput
                    value={field.value}
                    onChange={(val) => {
                      field.onChange(val);
                      if (errors.otp) clearErrors("otp");
                    }}
                    maxLength={6}
                    render={({ slots }) => (
                      <div className="flex items-center justify-evenly mt-2 gap-2">
                        {slots.map((slot, index) => (
                          <div
                            key={index}
                            className={cn(
                              "h-14 w-14 border rounded-xl flex items-center justify-center text-xl font-bold text-slate-900 transition-all select-none",
                              slot.isActive
                                ? "border-slate-900 ring-2 ring-slate-900/10 bg-white"
                                : "border-slate-300 bg-slate-50",
                              errors.otp && "border-red-400 bg-red-50",
                            )}
                          >
                            {slot.char ?? (
                              <span className="w-2 h-0.5 bg-slate-300 rounded-full block" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  />
                  {errors.otp && (
                    <p className="text-xs text-red-500 mt-2 text-center">
                      {errors.otp.message}
                    </p>
                  )}
                </div>
              )}
            />

            <button
              type="button"
              onClick={sendEmail}
              disabled={emailSending || resendTimer > 0}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              {emailSending
                ? "Resending…"
                : resendTimer > 0
                ? `Resend OTP in ${resendTimer}s`
                : "Didn't receive it? Resend OTP"}
            </button>

            <button
              type="button"
              onClick={VerifyOtp}
              disabled={verifyingOtp}
              className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {verifyingOtp ? (
                t("verifyingOtp")
              ) : (
                <>
                  Verify &amp; Continue
                  <ChevronRight className="size-4" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </>
        )}

        {/* ── STEP 3: Password ── */}
        {step === 3 && (
          <>
            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                {t("password")} <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type={passwordVisible ? "text" : "password"}
                  {...register("password", {
                    required: e("passwordRequired"),
                    minLength: { value: 8, message: e("passwordMinLength") },
                  })}
                  className={cn(inputClass, "pr-10", errors.password && errorClass)}
                  placeholder={p("password")}
                />
                <button
                  type="button"
                  onClick={() => setPasswordVisible((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {passwordVisible ? <EyeClosed className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Confirm Password <span className="text-red-500 font-bold">*</span>
              </label>
              <div className="relative">
                <input
                  type={confirmPasswordVisible ? "text" : "password"}
                  {...register("confirm_password", {
                    required: "Please confirm your password",
                    validate: (val) =>
                      val === watch("password") || "Passwords do not match",
                  })}
                  className={cn(inputClass, "pr-10", errors.confirm_password && errorClass)}
                  placeholder="Re-enter your password"
                />
                <button
                  type="button"
                  onClick={() => setConfirmPasswordVisible((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {confirmPasswordVisible ? <EyeClosed className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {errors.confirm_password && (
                <p className="text-xs text-red-500">{errors.confirm_password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className={cn(
                "w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                isSubmitting && "pointer-events-none opacity-25",
              )}
            >
              {isSubmitting ? t("signingUp") : t("signUp")}
            </button>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </>
        )}
      </div>

      <div className="text-center text-sm text-slate-600">
        {t("backToLogin")}{" "}
        <Link href="/login" className="text-slate-900 font-bold hover:underline">
          {t("login")}
        </Link>
      </div>
    </form>
  );
};

export default SignUpForm;
