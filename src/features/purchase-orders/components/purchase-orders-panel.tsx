"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Calendar, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  fetchPurchaseOrdersPage,
} from "@/features/purchase-orders/api/purchase-order.api";
import { PurchaseOrderStatusBadge } from "@/features/purchase-orders/components/purchase-order-status-badge";
import type { PurchaseOrderListItem } from "@/features/purchase-orders/types/purchase-order.types";
import {
  nestedId,
  normalizePurchaseOrderStatus,
  purchaseOrderListAmount,
  purchaseOrderProjectLabel,
  purchaseOrderVendorLabel,
} from "@/features/purchase-orders/utils/purchase-order-nested-fields.util";
import { formatMoneyDisplay } from "@/features/invoices/utils/invoice-money.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  AddButton,
  AppButton,
  CheckmarkSelect,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { useDeferredListOptions } from "@/shared/hooks/use-deferred-list-options";

export function PurchaseOrdersPanel() {
  const t = useTranslations("Dashboard.purchaseOrders");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { highlightClassName } = useListRowHighlight();

  const listHref = React.useMemo(() => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("highlight");
    const qs = p.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  }, [pathname, searchParams]);

  const openDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, setUrl, setPage, setPageSize, setListViewMode } = useListUrlState();

  const statusParam = searchParams.get("status");
  const vendorParam = searchParams.get("vendor");
  const statusFilter = statusParam?.trim() || undefined;
  const vendorFilter =
    vendorParam && /^\d+$/.test(vendorParam) ? Number.parseInt(vendorParam, 10) : undefined;

  const [items, setItems] = React.useState<PurchaseOrderListItem[]>([]);
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
  const [fetchVendorOptions, setFetchVendorOptions] = React.useState(() => Boolean(vendorParam));

  const loadVendorOptions = React.useCallback(async () => {
    const { items: vendors } = await fetchVendorsPage(1, 500, { is_active: true });
    return vendors.map((v) => ({ value: String(v.id), label: v.name }));
  }, []);

  const { options: vendorOptions } = useDeferredListOptions(loadVendorOptions, fetchVendorOptions);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "sent", label: t("status.sent") },
      { value: "approved", label: t("status.approved") },
      { value: "received", label: t("status.received") },
      { value: "cancelled", label: t("status.cancelled") },
    ],
    [t],
  );

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizePurchaseOrderStatus(code);
      if (norm === "draft") return t("status.draft");
      if (norm === "sent") return t("status.sent");
      if (norm === "approved") return t("status.approved");
      if (norm === "received") return t("status.received");
      if (norm === "cancelled") return t("status.cancelled");
      return code?.trim() || "—";
    },
    [t],
  );

  const openCreate = React.useCallback(() => {
    router.push(buildPathWithStoredBack(`${pathname}/new`, listHref));
  }, [listHref, pathname, router]);

  const openEdit = React.useCallback(
    (id: number) => {
      router.push(buildPathWithStoredBack(`${pathname}/${id}/edit`, listHref));
    },
    [listHref, pathname, router],
  );

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    if (vendorParam) setFetchVendorOptions(true);
  }, [vendorParam]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchPurchaseOrdersPage(page, pageSize, {
          search: search || undefined,
          status: statusFilter,
          vendor: vendorFilter,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(getApiErrorDisplayMessage(error, t("loadError")));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, search, statusFilter, vendorFilter, t]);

  const vendorLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of vendorOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [vendorOptions]);

  const hasActiveFilters = hasListActiveFilters({ search, statusParam, vendorParam });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<PurchaseOrderListItem>();
    const vendorDisplay = (row: PurchaseOrderListItem) => {
      const vendorId = nestedId(row.vendor);
      return purchaseOrderVendorLabel(row.vendor, vendorId != null ? vendorLabelById[vendorId] : undefined);
    };

    return [
      c.primary("po", t("table.purchaseOrderNumber"), (r) => r.purchase_order_number),
      c.truncate("vendor", t("table.vendorName"), (r) => vendorDisplay(r), {
        title: (r) => vendorDisplay(r),
      }),
      c.truncate("project", t("table.projectName"), (r) => purchaseOrderProjectLabel(r)),
      c.tabular("amount", t("table.amount"), (r) => formatMoneyDisplay(purchaseOrderListAmount(r), locale)),
      c.tabular("issue", t("table.issueDate"), (r) => formatFlexibleApiDate(r.issue_date, dateFmt)),
      c.custom("status", t("table.status"), (r) => (
        <PurchaseOrderStatusBadge status={r.status} label={statusLabel(r.status)} />
      )),
      // c.actions("actions", tList("openRowActions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[{ id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) }]}
      //   />
      // )),
    ];
  }, [t, tList, dateFmt, locale, vendorLabelById, statusLabel, openEdit]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={<AddButton type="button" onClick={openCreate} />}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={t("searchPlaceholder")}
                ariaLabel={t("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("filterStatus")}
                buttonAriaLabel={t("filterStatus")}
                options={statusFilterOptions}
                value={statusParam ?? ""}
                emptyLabel={t("filterAllStatuses")}
                portaled
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-44"
                onChange={(v) => setUrl({ status: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterVendor")}
                buttonAriaLabel={t("filterVendor")}
                options={vendorOptions}
                value={vendorParam ?? ""}
                emptyLabel={t("filterAllVendors")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onOpenChange={(open) => {
                  if (open) setFetchVendorOptions(true);
                }}
                onChange={(v) => setUrl({ vendor: v || null, page: null }, { replace: true })}
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          listViewMode === "list" ? (
            <div className="p-4 sm:p-6">
              <ListPageCardGrid>
                {Array.from({ length: 6 }, (_, i) => (
                  <ListPageCardSkeleton key={i} />
                ))}
              </ListPageCardGrid>
            </div>
          ) : (
            <div className="space-y-2 p-6">
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "clients",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: (
                <AppButton type="button" variant="primary" size="sm" onClick={openCreate}>
                  <Plus className="size-4" strokeWidth={2.5} aria-hidden />
                  {t("createPurchaseOrder")}
                </AppButton>
              ),
            }}
            onClearFilters={() =>
              setUrl({ search: null, status: null, vendor: null, page: null }, { replace: true })
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const vendorId = nestedId(row.vendor);
                const vendorDisplay = purchaseOrderVendorLabel(
                  row.vendor,
                  vendorId != null ? vendorLabelById[vendorId] : undefined,
                );
                const issueLabel = formatFlexibleApiDate(row.issue_date, dateFmt);
                const amountLabel = formatMoneyDisplay(purchaseOrderListAmount(row), locale);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    title={row.purchase_order_number}
                    subtitle={vendorDisplay}
                    meta={<span className="block min-w-0 truncate">{purchaseOrderProjectLabel(row)}</span>}
                    footer={
                      <div className="flex w-full flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 flex-wrap items-center gap-3">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <Calendar className="size-3.5 shrink-0" aria-hidden />
                            <span className="uppercase tracking-wide text-[10px] text-slate-500">
                              {t("card.issueDate")}
                            </span>
                            <span className="tabular-nums">{issueLabel}</span>
                          </span>
                          <PurchaseOrderStatusBadge status={row.status} label={statusLabel(row.status)} />
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("card.amount")}
                          </p>
                          <p className="text-lg font-bold tabular-nums text-slate-900 dark:text-slate-100">
                            {amountLabel}
                          </p>
                        </div>
                      </div>
                    }
                    onCardClick={() => openDetail(row.id)}
                    menu={
                      <DataTableRowActionsMenu
                        menuAriaLabel={tList("openRowActions")}
                        items={[
                          { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) },
                        ]}
                      />
                    }
                  />
                );
              })}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openDetail(row.id)}
            getRowClassName={(row) => highlightClassName(row.id)}
          />
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              start: pageRange.start,
              end: pageRange.end,
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              label: tList("rowsPerPage"),
              listLabel: tList("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: setPageSize,
              disabled: loading,
            }}
          />
        ) : null}
      </SurfaceShell>
    </div>
  );
}
