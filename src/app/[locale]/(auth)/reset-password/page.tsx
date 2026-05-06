import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/features/auth/forms/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.resetPassword");
  return { title: t("title") };
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  // Support multiple common token parameter names from the backend reset email link.
  const rawToken =
    searchParams.token ??
    searchParams.reset_token ??
    searchParams.resetToken ??
    searchParams.code ??
    searchParams.uid ??
    undefined;

  const token = Array.isArray(rawToken) ? rawToken[0] : rawToken;

  return <ResetPasswordForm token={token ?? ""} />;
}

