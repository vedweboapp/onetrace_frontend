"use client";
import { cn } from "@/core/utils/http.util";
import { SurfacePhoneField } from "@/shared/ui";
import { Input } from "@base-ui/react";
import { error } from "console";
import { Eye, EyeClosed, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { OTPInput } from "input-otp";
import { Link } from "@/i18n/navigation";

type Input = {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  phone: number;
  otp: string;
  password: string;
};
const SignUpForm = () => {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<Input>(
    {
      defaultValues: {
        otp: "",
      }
    }
  );
  const onSubmit: SubmitHandler<Input> = (data) => console.log(data);
  const t = useTranslations("Auth.signUpForm");
  const p = useTranslations("Auth.signUpForm.placeholders");
  const inputClass =
    "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-[14px] text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/8";
  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-center gap-3">
        <h1 className="text-slate-900 text-3xl font-bold">{t("title")}</h1>
      </div>
      <div className=" w-full bg-white rounded-xl border border-slate-200  space-y-4 border-t-slate-900 border-t-4 rounded- p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="" className="text-">
              {t("firstName")}
            </label>
            <input
              type="text"
              {...register("first_name",{
                required: t("firstName") + " is required."
              })}
              className={inputClass}
              placeholder={p("firstName")}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="" className="">
              {t("middleName")}
              <span className="text-slate-400 text-md">{t("optional")}</span>
            </label>
            <input
              type="text"
              className={inputClass}
              placeholder={p("middleName")}
            />
          </div>
        </div>
        <div>
          <label htmlFor="">{t("lastName")}</label>
          <input
            type="text"
            className={inputClass}
            placeholder={p("lastName")}
          />
        </div>
        <div>
          <label htmlFor="">{t("email")}</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder={p("email")}
              className={cn(
                inputClass,
                "pl-10",
                errors.email
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "",
              )}
            />
            <button onClick={() => setOtpSent(true)} type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-900 hover:text-slate-700 transition-colors">
              {t("sendOtp")}
            </button>
          </div>
          {
            otpSent && (
              <div>
                <Controller
                  control={control}
                  name="otp"
                  rules={{
                    required: "OTP is required."
                  }}
                  render={({ field }) => (
                    <>
                      <OTPInput
                        value={field.value}
                        onChange={field.onChange}
                        maxLength={6}
                        render={({ slots }) => (
                          <div className="flex items-center justify-evenly mt-4">
                            {
                              slots.map((slot, index) => (
                                <div
                                  key={index}
                                  className="h-12 w-12 border border-slate-300 rounded-md flex items-center justify-center"
                                >
                                  {slot.char}
                                </div>
                              ))
                            }
                          </div>
                        )}
                      />
                    </>

                  )}

                />

              </div>)
          }
        </div>
        <div>
          <label htmlFor="">{t("phone")}</label>
          <SurfacePhoneField
            name="phone"
            control={control}

          />
        </div>
        <div>
          <label htmlFor="">{t("password")}</label>
          <div className="relative">
            <input type={passwordVisible ? "text" : "password"} {
              ...register("password", {
                required: t("errors.passwordRequired")
              })
            }
              className={cn(
                inputClass,
                errors.password
                  ? "border-red-400 focus:border-red-500 focus:ring-red-500/15"
                  : "",
              )}
              placeholder={p("password")}
            />
            <button type="button" onClick={() => setPasswordVisible((prev) => !prev)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              {passwordVisible ? <EyeClosed /> : <Eye />}
            </button>
          </div>
        </div>
        <button className="w-full h-12 rounded-xl bg-slate-900 text-white text-sm mt-4 font-medium hover:bg-slate-700 transition-colors">
          {t("signUp")}
        </button>
      </div>
      <div className="text-center text-sm text-slate-600">
        {t("backToLogin")} <Link href="/login" className="text-slate-900 font-bold hover:underline">{t("login")}</Link>
      </div>
    </form>
  );
};

export default SignUpForm;
