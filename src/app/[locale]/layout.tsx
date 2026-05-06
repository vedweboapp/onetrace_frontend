import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { Toaster } from "sonner";
import { ApiErrorI18nBridge } from "@/app/providers/api-error-i18n-bridge";
import { LocaleHtmlLang } from "@/app/providers/locale-html-lang";
import { routing } from "@/i18n/routing";

type Props = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <NextIntlClientProvider key={locale} locale={locale} messages={messages}>
      <ApiErrorI18nBridge />
      <LocaleHtmlLang />
      {children}
      <Toaster
        richColors
        closeButton
        expand
        visibleToasts={4}
        position="top-center"
        toastOptions={{
          className: "app-sonner-toast",
          descriptionClassName: "app-sonner-description",
          duration: 3500,
        }}
      />
    </NextIntlClientProvider>
  );
}
