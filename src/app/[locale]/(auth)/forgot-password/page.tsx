import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgotPassword");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.forgotPassword");

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-sm text-slate-600">{t("body")}</p>
      </div>
      <p className="text-center">
        <Link
          href={routes.auth.login}
          className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          {t("backToLogin")}
        </Link>
      </p>
    </div>
  );
}
