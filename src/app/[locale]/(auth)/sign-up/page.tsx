import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import SignUpForm from "@/features/auth/forms/sign-up-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.register");
  return { title: t("title") };
}

export default async function RegisterPage() {
  const t = await getTranslations("Auth.register");

  return (
    <div className="space-y-4">
      <SignUpForm/>
    </div>
  );
}
