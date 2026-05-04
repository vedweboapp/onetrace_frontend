import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t("title")}</h1>
      <p className="text-slate-600 dark:text-slate-400">{t("description")}</p>
      <Link
        href={routes.home}
        className="text-sm font-medium text-slate-900 underline-offset-4 hover:underline dark:text-slate-100"
      >
        {t("home")}
      </Link>
    </div>
  );
}
