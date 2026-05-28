"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { EntityDataTable, EntityDetailLoadingSkeleton, entityCol } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { AddButton, DashboardEmptyState, DataTablePaginationBar, ListPageSearchField } from "@/shared/ui";

function siteAddressSummary(site: Site): string {
  const parts = [site.address_line_1, site.city, site.state].map((s) => s?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "—";
}

type Props = {
  clientId: number;
};

export function ClientSitesTab({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const tSites = useTranslations("Dashboard.sites");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Site[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const clientDetailHref = pathname;

  const returnTo = React.useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "sites");
    return `${pathname}?${params.toString()}`;
  }, [pathname, searchParams]);

  const columns = React.useMemo(() => {
    const c = entityCol<Site>();
    return [
      c.primary("name", tSites("table.name"), (r) => r.site_name),
      c.truncate("address", tSites("table.address"), (r) => siteAddressSummary(r), { maxWidth: "lg" }),
      c.truncate("what3words", tSites("table.what3words"), (r) => r.what3words?.trim() || "—", { maxWidth: "sm", responsive: "md" }),
      c.status(
        "status",
        tSites("table.status"),
        (r) => r.is_active,
        tSites("status.active"),
        tSites("status.inactive"),
      ),
      c.date("created", tSites("table.created"), (r) => r.created_at, dateFmt),
    ];
  }, [tSites, dateFmt]);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
    setPage(1);
  }, []);

  const reloadList = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useQuickCreateReturn({
    onApplySelect: () => reloadList(),
  });

  const openCreateSite = React.useCallback(() => {
    router.push(buildQuickCreateNavigateHref("site", { returnTo, clientId }));
  }, [router, returnTo, clientId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchSitesPage(page, pageSize, {
          client: clientId,
          search: search || undefined,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tSites("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, page, pageSize, search, tSites, refreshNonce]);

  const pageRange = getListPageRange(pagination);

  function openSiteDetail(siteId: number) {
    router.push(buildDetailHrefWithListReturn(`${routes.dashboard.sites}/${siteId}`, clientDetailHref, siteId));
  }

  const addSiteButton = (
    <AddButton type="button" onClick={openCreateSite}>
      {t("detail.addSite")}
    </AddButton>
  );

  return (
    <>
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <ListPageSearchField
            value={search}
            onCommit={commitSearch}
            placeholder={tList("searchPlaceholder")}
            ariaLabel={tList("searchAria")}
            className="max-w-md min-w-0 flex-1"
          />
          {addSiteButton}
        </div>

        {loadError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <EntityDetailLoadingSkeleton />
        ) : items.length === 0 ? (
          <DashboardEmptyState
            iconName="noResults"
            title={search.trim() ? tList("noResultsTitle") : t("detail.sitesEmptyTitle")}
            description={search.trim() ? tList("noResultsDescription") : t("detail.sitesEmptyDescription")}
            action={search.trim() ? undefined : addSiteButton}
          />
        ) : (
          <>
            <EntityDataTable columns={columns} rows={items} onRowClick={(row) => openSiteDetail(row.id)} />

            <DataTablePaginationBar
              pagination={pagination}
              summary={tSites("pageLabel", {
                start: pageRange.start,
                end: pageRange.end,
                total: pagination.total_records,
              })}
              prevLabel={tSites("prev")}
              nextLabel={tSites("next")}
              onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
              onNext={() => setPage(pagination.current_page + 1)}
              onPageSelect={(p) => setPage(p)}
              pageSizeControl={{
                label: tList("rowsPerPage"),
                listLabel: tList("rowsPerPage"),
                value: pageSize,
                options: pageSizeOptions,
                onChange: (size) => {
                  setPageSize(size);
                  setPage(1);
                },
                disabled: loading,
              }}
            />
          </>
        )}
      </div>
    </>
  );
}
