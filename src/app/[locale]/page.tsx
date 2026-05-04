import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { LocaleSwitcher } from "@/components/layout/locale-switcher";

export default async function HomePage() {
  const t = await getTranslations("HomePage");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="mx-auto flex max-w-5xl items-center justify-end border-b border-slate-100 px-6 py-4">
        <LocaleSwitcher tone="light" />
      </header>
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-6 pb-24 pt-16">
        <h1 className="text-4xl font-semibold tracking-tight text-slate-900">{t("title")}</h1>
        <p className="text-lg leading-relaxed text-slate-600">{t("description")}</p>
        <Link
          href={routes.auth.login}
          className="inline-flex h-11 w-fit items-center justify-center rounded-lg bg-slate-900 px-5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          {t("signIn")}
        </Link>
      </main>
    </div>
  );
}
