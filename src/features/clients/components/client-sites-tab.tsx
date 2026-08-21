"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { EntityDataTable, EntityDetailTabLoadingState, entityCol } from "@/shared/components/entity";
import { DetailTabListShell, DetailTabTableBody } from "@/shared/components/layout/detail-tab-list-shell";
import { detailTabToolbarClassName } from "@/shared/components/layout/detail-tab-layout";
import { cn } from "@/core/utils/http.util";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildDetailHrefWithListReturn, buildEntityDetailTabBackHref } from "@/shared/utils/detail-from-list.util";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { AddButton, DataTablePaginationBar, ListPageEmptyStates } from "@/shared/ui";

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

  const returnTo = React.useMemo(
    () => buildEntityDetailTabBackHref(pathname, "sites", searchParams),
    [pathname, searchParams],
  );

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
  }, [clientId, page, pageSize, tSites, refreshNonce]);

  const pageRange = getListPageRange(pagination);

  function openSiteDetail(siteId: number) {
    router.push(buildDetailHrefWithListReturn(`${routes.dashboard.sites}/${siteId}`, returnTo, siteId));
  }

  const addSiteButton = (
    <AddButton type="button" onClick={openCreateSite}>
      {t("detail.addSite")}
    </AddButton>
  );

  const emptyStateKind = React.useMemo(() => {
    if (loading || loadError || items.length > 0) return "none" as const;
    return "onboarding" as const;
  }, [loading, loadError, items.length]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={items.length === 0}
      toolbar={
        !loading && !loadError && items.length > 0 ? (
          <div className={cn(detailTabToolbarClassName, "justify-end")}>{addSiteButton}</div>
        ) : null
      }
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind={emptyStateKind}
          onboarding={{
            iconName: "projects",
            title: t("detail.sitesEmptyTitle"),
            description: t("detail.sitesEmptyDescription"),
            action: addSiteButton,
          }}
          onClearFilters={() => {}}
        />
      }
    >
      <DetailTabTableBody>
        <EntityDataTable
          columns={columns}
          rows={items}
          minBodyRows={pageSize}
          onRowClick={(row) => openSiteDetail(row.id)}
        />
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
      </DetailTabTableBody>
    </DetailTabListShell>
  );
}
