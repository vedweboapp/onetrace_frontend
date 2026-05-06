import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ForgotPasswordForm } from "@/features/auth/forms/forgot-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgotPassword");
  return { title: t("title") };
}

export default async function ForgotPasswordPage() {
  // The form component renders the title/subtitle and card UI.
  return <ForgotPasswordForm />;
}
