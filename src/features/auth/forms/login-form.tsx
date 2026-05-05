"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { LayoutDashboard, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import {
  loginSchema,
  type AuthValidationMessageKey,
  type LoginFormValues,
} from "@/features/auth/schemas/login-schema";
import { useLogin } from "@/features/auth/hooks/use-login";
import { RhfTextField, SubmitButton } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";


export function LoginForm() {
  const t = useTranslations("Auth");
  const tVal = useTranslations("validation");
  const { submit, isSubmitting } = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const translateError = (key: string) =>
    tVal(key as AuthValidationMessageKey);

  return (
    <form
      className="w-full space-y-8"
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-xl bg-[#111111] text-white shadow-md dark:bg-white dark:text-[#111111]"
          aria-hidden
        >
          <LayoutDashboard className="size-6" strokeWidth={1.75} />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            {t("brandKicker")}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {t("title")}
          </h1>
          <p className="text-sm leading-relaxed text-slate-500">{t("subtitle")}</p>
        </div>
      </div>

      <div className="space-y-4">
        <RhfTextField
          control={form.control}
          name="email"
          id="login-email"
          label={t("email")}
          type="email"
          autoComplete="email"
          placeholder={t("emailPlaceholder")}
          translateError={translateError}
          appearance="default"
        />
        <RhfTextField
          control={form.control}
          name="password"
          id="login-password"
          label={t("password")}
          type="password"
          autoComplete="current-password"
          placeholder={t("passwordPlaceholder")}
          translateError={translateError}
          appearance="default"
          passwordToggle
          passwordToggleAria={{
            show: t("showPassword"),
            hide: t("hidePassword"),
          }}
        />
      </div>

      <SubmitButton
        loading={isSubmitting}
        appearance="default"
        className={cn(isSubmitting && "cursor-wait")}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            {t("submitting")}
          </>
        ) : (
          t("submit")
        )}
      </SubmitButton>

      <div className="space-y-3 border-t border-slate-100 pt-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <Link
          href={routes.auth.forgotPassword}
          className="block font-medium text-slate-700 underline-offset-4 hover:text-slate-900 hover:underline dark:text-slate-300 dark:hover:text-white"
        >
          {t("forgotPasswordLink")}
        </Link>
        <p>
          {t("noAccount")}{" "}
          <Link
            href={routes.auth.register}
            className="font-semibold text-slate-900 underline-offset-4 hover:underline dark:text-white"
          >
            {t("signUpLink")}
          </Link>
        </p>
      </div>
    </form>
  );
}
