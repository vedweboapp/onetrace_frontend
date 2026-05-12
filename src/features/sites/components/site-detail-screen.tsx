"use client";

import * as React from "react";
import { MapPinHouse, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchSite } from "@/features/sites/api/site.api";
import { SiteDetailBody } from "@/features/sites/components/site-detail-body";
import type { Site } from "@/features/sites/types/site.types";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";

function siteClientId(site: Site): number | null {
  if (typeof site.client === "number" && Number.isFinite(site.client) && site.client > 0) return site.client;
  if (site.client && typeof site.client === "object" && Number.isFinite(site.client.id) && site.client.id > 0) {
    return site.client.id;
  }
  return null;
}

function siteClientName(site: Site, clientNameById: Record<number, string>): string {
  if (site.client && typeof site.client === "object" && site.client.name?.trim()) return site.client.name.trim();
  const id = siteClientId(site);
  if (id && clientNameById[id]) return clientNameById[id];
  return id ? `#${id}` : "—";
}

type Props = {
  siteId: number;
};

export function SiteDetailScreen({ siteId }: Props) {
  const t = useTranslations("Dashboard.sites");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "sites");

  const [detail, setDetail] = React.useState<Site | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchClientsPage(1, 500);
        if (!cancelled) setClientOptions(items.map((c) => ({ value: String(c.id), label: c.name })));
      } catch {
        if (!cancelled) setClientOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clientNameById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

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
        const row = await fetchSite(siteId);
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
  }, [siteId, refreshNonce, t]);

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail?.site_name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPinHouse className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
              {siteClientName(detail, clientNameById)}
            </span>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <AppButton
              type="button"
              variant="primary"
              size="md"
              onClick={() => router.push(`${pathname}/edit?back=${encodeURIComponent(safeBack)}`)}
              className="gap-2"
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
          <SiteDetailBody detail={detail} clientName={siteClientName(detail, clientNameById)} dateFmt={dateFmt} />
        ) : null}
      </SurfaceShell>

    </div>
  );
}
