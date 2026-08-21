"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchItemsPage } from "@/features/items/api/item.api";
import type { Item } from "@/features/items/types/item.types";
import { EntityDataTable, EntityDetailTabLoadingState, entityCol } from "@/shared/components/entity";
import { DetailTabListShell, DetailTabTableBody } from "@/shared/components/layout/detail-tab-list-shell";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
import { useOrgNumber } from "@/shared/number/use-org-number";
import { buildDetailHrefWithListReturn, buildEntityDetailTabBackHref } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { DataTablePaginationBar, ListPageEmptyStates } from "@/shared/ui";

type Props = {
  vendorId: number;
};

export function VendorItemsTab({ vendorId }: Props) {
  const t = useTranslations("Dashboard.vendors");
  const tItems = useTranslations("Dashboard.items");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const { formatMoneyValue: moneyDisplay } = useOrgCurrency();
  const { formatQuantity } = useOrgNumber();

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [items, setItems] = React.useState<Item[]>([]);
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
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const returnTo = React.useMemo(
    () => buildEntityDetailTabBackHref(pathname, "items", searchParams),
    [pathname, searchParams],
  );

  const columns = React.useMemo(() => {
    const c = entityCol<Item>();
    return [
      c.primary("name", tItems("table.name"), (r) => r.name),
      c.mono("sku", tItems("table.sku"), (r) => r.sku || "—", {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.tabular("qty", tItems("table.quantity"), (r) => formatQuantity(r.quantity), {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.tabular("cost", tItems("modal.costPrice"), (r) => moneyDisplay(r.cost_price), {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.tabular("sell", tItems("modal.sellingPrice"), (r) => moneyDisplay(r.selling_price), {
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
      c.date("created", tItems("table.created"), (r) => r.created_at, dateFmt, {
        responsive: "lg",
        cellClassName: "text-slate-600 dark:text-slate-400",
      }),
    ];
  }, [tItems, dateFmt, formatQuantity, moneyDisplay]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchItemsPage(page, pageSize, {
          vendorId,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tItems("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vendorId, page, pageSize, tItems]);

  const pageRange = getListPageRange(pagination);

  function openItemDetail(itemId: number) {
    router.push(buildDetailHrefWithListReturn(`${routes.dashboard.items}/${itemId}`, returnTo, itemId));
  }

  const emptyStateKind = React.useMemo(() => {
    if (loading || loadError || items.length > 0) return "none" as const;
    return "onboarding" as const;
  }, [loading, loadError, items.length]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={items.length === 0}
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind={emptyStateKind}
          onboarding={{
            iconName: "projects",
            title: t("detail.itemsEmptyTitle"),
            description: t("detail.itemsEmptyDescription"),
            action: null,
          }}
          onClearFilters={() => {}}
        />
      }
    >
      <DetailTabTableBody>
        <EntityDataTable
          columns={columns}
          rows={items}
          onRowClick={(row) => openItemDetail(row.id)}
        />
        <DataTablePaginationBar
          pagination={pagination}
          summary={tItems("pageLabel", {
            start: pageRange.start,
            end: pageRange.end,
            total: pagination.total_records,
          })}
          prevLabel={tItems("prev")}
          nextLabel={tItems("next")}
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
