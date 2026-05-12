"use client";

import * as React from "react";
import { CalendarDays, FolderKanban, Pencil } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchQuotation } from "@/features/quotations/api/quotation.api";
import { QuotationDetailBody } from "@/features/quotations/components/quotation-detail-body";
import { QuotationExportDropdown } from "@/features/quotations/components/quotation-export-dropdown";
import type { QuotationDetail } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationNestedSite,
  getQuotationSiteId,
  quotationCustomerLabel,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { fetchSite, fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { hasDetailAddress } from "@/shared/components/layout/detail-formatted-address";
import { detailRecordSurfaceShellClassName } from "@/shared/components/layout/detail-metric-card";
import { DetailPageHeader } from "@/shared/components/layout/detail-page-header";
import { AppButton, SurfaceShell } from "@/shared/ui";
import { routes } from "@/shared/config/routes";
import { sanitizeInternalListBack } from "@/shared/utils/detail-from-list.util";
import { parseFlexibleApiDate } from "@/shared/utils/api-date-parse.util";

type Props = {
  quotationId: number;
};

export function QuotationDetailScreen({ quotationId }: Props) {
  const t = useTranslations("Dashboard.quotations");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeBack = sanitizeInternalListBack(searchParams.get("back"), "quotations");

  const [detail, setDetail] = React.useState<QuotationDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [clientNames, setClientNames] = React.useState<Record<number, string>>({});
  const [siteNames, setSiteNames] = React.useState<Record<number, string>>({});
  const [tagNames, setTagNames] = React.useState<Record<number, string>>({});
  const [siteDetail, setSiteDetail] = React.useState<Site | null>(null);
  const [siteDetailLoading, setSiteDetailLoading] = React.useState(false);

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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: tags } = await fetchTagsPage(1, 500, { is_active: true });
        if (!cancelled) {
          const mapped: Record<number, string> = {};
          for (const row of tags) {
            const label = (row.name ?? row.tag_name ?? "").trim();
            if (label) mapped[row.id] = label;
          }
          setTagNames(mapped);
        }
      } catch {
        if (!cancelled) setTagNames({});
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

  React.useEffect(() => {
    let cancelled = false;
    /* Reset and optionally load site row for the map/address panel when the quotation changes.
       Snapshot-backed quotations skip the network when `site_snapshot` already has a structured address. */
    /* eslint-disable react-hooks/set-state-in-effect */
    const snap = detail?.site_snapshot;
    const snapshotAddressUsable =
      !!snap &&
      hasDetailAddress({
        line1: snap.address_line_1,
        line2: snap.address_line_2,
        city: snap.city,
        state: snap.state,
        pincode: snap.pincode,
        country: snap.country,
      });
    const nestedSite = getQuotationNestedSite(detail?.site);
    const nestedSiteAddressUsable =
      !!nestedSite &&
      hasDetailAddress({
        line1: nestedSite.address_line_1,
        line2: nestedSite.address_line_2,
        city: nestedSite.city,
        state: nestedSite.state,
        pincode: nestedSite.pincode,
        country: nestedSite.country,
      });
    if (snapshotAddressUsable || nestedSiteAddressUsable) {
      setSiteDetail(null);
      setSiteDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    const siteId = detail?.site != null ? getQuotationSiteId(detail.site) : null;
    if (siteId == null || !Number.isFinite(siteId)) {
      setSiteDetail(null);
      setSiteDetailLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setSiteDetailLoading(true);
    setSiteDetail(null);
    void (async () => {
      try {
        const row = await fetchSite(siteId);
        if (!cancelled) setSiteDetail(row);
      } catch {
        if (!cancelled) setSiteDetail(null);
      } finally {
        if (!cancelled) setSiteDetailLoading(false);
      }
    })();
    /* eslint-enable react-hooks/set-state-in-effect */
    return () => {
      cancelled = true;
    };
  }, [detail?.site, detail?.site_snapshot]);

  const projectSubtitle =
    detail?.project && typeof detail.project === "object" ? detail.project.name : null;

  const dueDateForHeader = detail ? parseFlexibleApiDate(detail.due_date) : null;

  const customerIdForLookup = detail ? getQuotationCustomerId(detail.customer) : null;
  const siteIdForLookup = detail ? getQuotationSiteId(detail.site) : null;

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
                {quotationCustomerLabel(
                  detail.customer,
                  customerIdForLookup != null ? clientNames[customerIdForLookup] : null,
                )}
              </span>
              {projectSubtitle ? (
                <span className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                    ·
                  </span>
                  {projectSubtitle}
                </span>
              ) : null}
              {dueDateForHeader ? (
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="size-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden />
                  {dueFmt.format(dueDateForHeader)}
                </span>
              ) : null}
            </>
          ) : undefined
        }
        actions={
          !loading && !error && detail ? (
            <>
              <QuotationExportDropdown quotationId={quotationId} quoteName={detail.quote_name} />
              <AppButton
                type="button"
                variant="primary"
                size="md"
                className="gap-2"
                onClick={() =>
                  router.push(`${pathname}/edit?back=${encodeURIComponent(safeBack ?? routes.dashboard.quotations)}`)
                }
              >
                <Pencil className="size-4" strokeWidth={2} aria-hidden />
                {t("edit")}
              </AppButton>
            </>
          ) : null
        }
      />

      <SurfaceShell className={detailRecordSurfaceShellClassName}>
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
            customerName={customerIdForLookup != null ? clientNames[customerIdForLookup] : undefined}
            siteName={
              detail.site_snapshot?.site_name?.trim() ||
              (siteIdForLookup != null ? siteNames[siteIdForLookup] : undefined)
            }
            tagLookup={tagNames}
            siteDetail={siteDetail}
            siteDetailLoading={siteDetailLoading}
            dateFmt={dateFmt}
            dueFmt={dueFmt}
          />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
