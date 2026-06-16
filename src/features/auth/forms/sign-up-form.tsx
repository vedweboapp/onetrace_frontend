"use client";
import { cn } from "@/core/utils/http.util";
import { SurfacePhoneField } from "@/shared/ui";
import { Eye, EyeClosed, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { OTPInput } from "input-otp";
import { Link, useRouter } from "@/i18n/navigation";
import { sendOtp, signUpHandler, verifyOtp } from "../api/auth.api";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

// Matches: local@domain.tld
// Rejects: missing @, double dots, spaces, no TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

type SignUpInput = {
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone_number: string;
  otp: string;
  password: string;
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

const SignUpForm = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailSending, setEmailSending] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<SignUpInput>({
    defaultValues: { otp: "" },
  });
  const route = useRouter();
  const t = useTranslations("Auth.signUpForm");
  const p = useTranslations("Auth.signUpForm.placeholders");
  const e = useTranslations("Auth.signUpForm.errors");

  const onSubmit: SubmitHandler<SignUpInput> = async (data) => {
    try {
      const payload = {
        first_name: data.first_name.trim(),
        ...(data.middle_name?.trim() && { middle_name: data.middle_name.trim() }),
        last_name: data.last_name.trim(),
        email: data.email.trim().toLowerCase(),
        phone_number: data.phone_number,
        otp: data.otp,
        password: data.password,
      };
      await signUpHandler(payload);
      route.push("/login")
    } catch (error) {
      console.error("i got these errors", error)
    }
  };
  const emaildata = watch("email");

  const sendEmail = async () => {
    try {
      if (emaildata && EMAIL_REGEX.test(emaildata)) {
        setEmailSending(true);
        const payload: sendOtpBody = {
          email: emaildata,
          purpose: "email_verify",
        };
        await sendOtp(payload);
        toastSuccess(t("toasts.Sent"));
        setOtpSent(true);
        setEmailSending(false);
      }
    } catch (error) {
      toastError(t("toasts.Failed"));
      setOtpSent(false);
      setEmailVerified(false);
      setEmailSending(false);
    }
  };
  const VerifyOtp = async () => {
    try {
      if (emaildata && EMAIL_REGEX.test(emaildata) && otpSent) {
        setVerifyingOtp(true);
        const payload: verifyOtpType = {
          email: emaildata,
          purpose: "email_verify",
          otp: getValues("otp"),
        };
        await verifyOtp(payload);
        toastSuccess(t("toasts.verified"));
        setEmailVerified(true);
        setVerifyingOtp(false);
      }
    } catch (error) {
      toastError(t("toasts.Failed"));
      setEmailVerified(false);
      setVerifyingOtp(false);
    }
  };
  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";

  const errorClass =
    "border-red-400 bg-red-50 focus:border-red-500 focus:ring-red-500/15";

  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-slate-900 text-3xl font-bold">{t("title")}</h1>
      </div>

      <div className="w-full bg-white rounded-xl border border-slate-200 space-y-4 border-t-slate-900 border-t-4 p-4">
        {/* First + Middle Name */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.1fr] gap-3 ">
          <div className="space-y-1.5 min-w-0">
            <label className="text-sm font-semibold text-slate-700 block">
              {t("firstName")} <span className="text-red-500 font-bold">*</span>
            </label>
            <input
              type="text"
              {...register("first_name", {
                required: e("firstNameRequired"),
              })}
              className={cn(inputClass, "w-full", errors.first_name && errorClass)}
              placeholder={p("firstName")}
            />
            {errors.first_name && (
              <p className="text-xs text-red-500">
                {errors.first_name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5 min-w-0">
            <label className="text-sm font-semibold flex items-center justify-between text-slate-700">
              {t("middleName")}
              <span className="text-slate-400 text-xs ml-1 whitespace-nowrap">
                {t("optional")}
              </span>
            </label>
            <input
              type="text"
              {...register("middle_name")}
              className={cn(inputClass,"w-full")}
              placeholder={p("middleName")}
            />
          </div>
        </div>

        {/* Last Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            {t("lastName")} <span className="text-red-500 font-bold">*</span>
          </label>
          <input
            type="text"
            {...register("last_name", {
              required: e("lastNameRequired"),
            })}
            className={cn(inputClass, errors.last_name && errorClass)}
            placeholder={p("lastName")}
          />
          {errors.last_name && (
            <p className="text-xs text-red-500">{errors.last_name.message}</p>
          )}
        </div>

        {/* Email + OTP */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            {t("email")}
          </label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              {...register("email", {
                required: e("emailRequired"),
                pattern: {
                  value: EMAIL_REGEX,
                  message: e("emailInvalid"),
                },
              })}
              type="email"
              autoComplete="email"
              placeholder={p("email")}
              className={cn(
                inputClass,
                "pl-10 pr-20",
                errors.email && errorClass,
              )}
            />
            <button
              type="button"
              onClick={sendEmail}
              disabled={emailSending}
              className="absolute cursor-pointer hover:underline right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors"
            >
              {emailSending ? t("sendingOtp") : t("sendOtp")}
            </button>
          </div>
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}

          {/* OTP slots */}
          {otpSent && (
            <div className="space-y-1.5">
              <Controller
                control={control}
                name="otp"
                rules={{
                  required: e("otpRequired"),
                  minLength: { value: 6, message: e("otpLength") },
                }}
                render={({ field }) => (
                  <div className="pt-1">
                    <OTPInput
                      value={field.value}
                      onChange={field.onChange}
                      maxLength={6}
                      render={({ slots }) => (
                        <div className="flex items-center justify-evenly mt-2 gap-2">
                          {slots.map((slot, index) => (
                            <div
                              key={index}
                              className={cn(
                                "h-12 w-12 border rounded-md flex items-center justify-center text-base font-semibold text-slate-900 transition-all select-none",
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
                      <p className="text-xs text-red-500 mt-1 text-center">
                        {errors.otp.message}
                      </p>
                    )}
                  </div>
                )}
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={VerifyOtp}
                  className=" mt-0.5 cursor-pointer hover:underline text-sm font-medium"
                >
                  {verifyingOtp ? t("verifyingOtp") : t("verifyOtp")}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-slate-700">
            {t("phone")}
          </label>
          <SurfacePhoneField name="phone_number" control={control} />
        </div>

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
              {passwordVisible ? (
                <EyeClosed className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !emailVerified}
          className={cn(
            "w-full h-12 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
            (isSubmitting || !emailVerified) &&
              "pointer-events-none opacity-25",
          )}
        >
          {isSubmitting ? t("signingUp") : t("signUp")}
        </button>
      </div>

      <div className="text-center text-sm text-slate-600">
        {t("backToLogin")}{" "}
        <Link
          href="/login"
          className="text-slate-900 font-bold hover:underline"
        >
          {t("login")}
        </Link>
      </div>
    </form>
  );
};

export default SignUpForm;
