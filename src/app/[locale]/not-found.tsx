import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { DashboardEmptyState } from "@/shared/ui/dashboard-empty-state";

export default async function NotFound() {
  const t = await getTranslations("NotFound");

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] w-full flex-1 flex-col">
      <DashboardEmptyState
        iconName="notFound"
        title={t("title")}
        description={t("description")}
        fill
        viewportFill
        action={
          <Link
            href={routes.home}
            className="inline-flex h-9 items-center justify-center rounded-md bg-[color:var(--dash-accent,#111111)] px-3.5 text-xs font-medium text-[color:var(--dash-on-accent,#ffffff)] shadow-sm"
          >
            {t("home")}
          </Link>
        }
      />
    </div>
  );
}
