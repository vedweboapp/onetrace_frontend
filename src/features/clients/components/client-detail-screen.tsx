"use client";

import * as React from "react";
import { Mail, Pencil, Phone } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClient } from "@/features/clients/api/client.api";
import { ClientDetailBody } from "@/features/clients/components/client-detail-body";
import type { Client } from "@/features/clients/types/client.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { routes } from "@/shared/config/routes";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { AppButton, SurfaceShell } from "@/shared/ui";

type Props = {
  clientId: number;
};

export function ClientDetailScreen({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "clients");
  const clientsListHref = React.useMemo(() => {
    const needle = routes.dashboard.clients;
    const i = pathname.indexOf(needle);
    return i >= 0 ? pathname.slice(0, i + needle.length) : needle;
  }, [pathname]);
  const listBack = safeBack ?? clientsListHref;

  const [detail, setDetail] = React.useState<Client | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const row = await fetchClient(clientId);
        if (!cancelled) setDetail(row);
      } catch {
        if (!cancelled) setError(t("detailLoadError"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshNonce, t]);

  const phoneRaw = detail?.phone?.trim() ?? "";

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail?.name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        backHref={listBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                <a
                  href={`mailto:${detail.email}`}
                  className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                >
                  {detail.email}
                </a>
              </span>
              {phoneRaw ? (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  <a
                    href={`tel:${phoneRaw.replace(/\s/g, "")}`}
                    className="text-[color:var(--dash-accent)] underline-offset-2 hover:underline"
                  >
                    {phoneRaw}
                  </a>
                </span>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <AppButton
              type="button"
              variant="primary"
              size="md"
              className="gap-2"
              onClick={() => router.push(`${pathname}/edit?back=${encodeURIComponent(listBack)}`)}
            >
              <Pencil className="size-4" strokeWidth={2} aria-hidden />
              {t("detail.editWithIcon")}
            </AppButton>
          ) : null
        }
      />

      <SurfaceShell className="rounded-none border-0 shadow-none ring-0">
        {loading ? (
          <div className="space-y-3 p-4 sm:p-6">
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : error ? (
          <div className="space-y-4 p-4 sm:p-6">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            <AppButton type="button" variant="secondary" size="md" onClick={() => setRefreshNonce((k) => k + 1)}>
              {t("detail.retry")}
            </AppButton>
          </div>
        ) : detail ? (
          <ClientDetailBody detail={detail} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>

    </div>
  );
}
