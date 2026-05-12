"use client";

import * as React from "react";
import { CalendarDays, FolderKanban } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationDetailBody } from "@/features/quotations/components/quotation-detail-body";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";

type Props = {
  quotationId: number;
};

export function QuotationDetailScreen({ quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "quotations");

  const [detail, setDetail] = React.useState<QuotationDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [siteNames, setSiteNames] = React.useState<Record<number, string>>({});

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of clients) mapped[row.id] = row.name;
          setClientNames(mapped);
        }
      } catch {
        if (!cancelled) setClientNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: sites } = await fetchSitesPage(1, 500);
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of sites) mapped[row.id] = row.site_name;
          setSiteNames(mapped);
        }
      } catch {
        if (!cancelled) setSiteNames({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [locale],
  );

  const dueFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
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
        const row = await fetchQuotation(quotationId);
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
  }, [quotationId, refreshNonce, t]);

  const projectSubtitle =
    detail?.project && typeof detail.project === "object" ? detail.project.name : null;

  return (
    <div className="pb-12">
      <DetailPageHeader
        title={detail?.quote_name ?? (loading ? t("detail.loadingTitle") : t("detailMetaTitle"))}
        backHref={safeBack}
        backAriaLabel={t("detail.backAria")}
        subtitle={
          detail ? (
            <>
              <span className="inline-flex items-center gap-1.5">
                <FolderKanban className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                {clientNames[detail.customer] ?? `#${detail.customer}`}
              </span>
              {projectSubtitle ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                    ·
                  </span>
                  {projectSubtitle}
                </span>
              ) : null}
              {detail.due_date ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  {dueFmt.format(new Date(`${detail.due_date}T12:00:00`))}
                </span>
              ) : null}
            </>
          ) : undefined
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
          <QuotationDetailBody
            detail={detail}
            customerName={clientNames[detail.customer]}
            siteName={siteNames[detail.site]}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
          />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
