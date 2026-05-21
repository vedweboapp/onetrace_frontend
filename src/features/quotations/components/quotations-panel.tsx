"use client";

import * as React from "react";
import { Calendar, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchQuotationsPage } from "@/features/quotations/api/quotation.api";
import type { QuotationListItem } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationSiteId,
  quotationCustomerLabel,
  quotationSiteLabel,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton, AppButton,
  CheckmarkSelect,
  DashboardEmptyState,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

export function QuotationsPanel() {
  const t = useTranslations("Dashboard.quotations");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const dueFmt = useDashboardDateFormat({ dateOnly: true });
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

  const customerParam = searchParams.get("customer");
  const siteParam = searchParams.get("site");
  const projectParam = searchParams.get("project");
  const statusParam = searchParams.get("status");

  const customerFilter =
    customerParam && /^\d+$/.test(customerParam) ? Number.parseInt(customerParam, 10) : undefined;
  const siteFilter = siteParam && /^\d+$/.test(siteParam) ? Number.parseInt(siteParam, 10) : undefined;
  const projectFilter =
    projectParam && /^\d+$/.test(projectParam) ? Number.parseInt(projectParam, 10) : undefined;
  const statusFilter = statusParam?.trim() || undefined;

  const [items, setItems] = React.useState<QuotationListItem[]>([]);
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
  const refreshNonce = 0;

  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [siteRows, setSiteRows] = React.useState<Site[]>([]);
  const [projectRows, setProjectRows] = React.useState<Project[]>([]);
  const [tagLabelById, setTagLabelById] = React.useState<Record<number, string>>({});
  const openCreate = React.useCallback(() => {
    router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`);
  }, [listHref, pathname, router]);

  const openEdit = React.useCallback(
    (id: number) => {
      router.push(`${pathname}/${id}/edit?back=${encodeURIComponent(listHref)}`);
    },
    [listHref, pathname, router],
  );

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "draft", label: t("quoteStatus.draft") },
      { value: "sent", label: t("quoteStatus.sent") },
      { value: "accepted", label: t("quoteStatus.accepted") },
      { value: "rejected", label: t("quoteStatus.rejected") },
    ],
    [t],
  );

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items: clients } = await fetchClientsPage(1, 500, { is_active: true });
        if (!cancelled) {
          setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
        }
      } catch {
        if (!cancelled) setClientOptions([]);
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
        const { items } = await fetchSitesPage(1, 500, {
          client: customerFilter,
          is_active: true,
        });
        if (!cancelled) setSiteRows(items);
      } catch {
        if (!cancelled) setSiteRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerFilter]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchProjectsPage(1, 500, { is_active: true });
        if (!cancelled) setProjectRows(items);
      } catch {
        if (!cancelled) setProjectRows([]);
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
          setTagLabelById(mapped);
        }
      } catch {
        if (!cancelled) setTagLabelById({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchQuotationsPage(page, pageSize, {
          search: search || undefined,
          customer: customerFilter,
          site: siteFilter,
          project: projectFilter,
          status: statusFilter,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    page,
    pageSize,
    search,
    customerFilter,
    siteFilter,
    projectFilter,
    statusFilter,
    refreshNonce,
    t,
  ]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const siteLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const s of siteRows) m[s.id] = s.site_name;
    return m;
  }, [siteRows]);

  const projectOptionsForFilter = React.useMemo(() => {
    if (!customerFilter || customerFilter <= 0) {
      return projectRows.map((p) => ({ value: String(p.id), label: p.name }));
    }
    return projectRows
      .filter((p) => getProjectClientId(p) === customerFilter)
      .map((p) => ({ value: String(p.id), label: p.name }));
  }, [projectRows, customerFilter]);

  const siteOptionsForFilter = React.useMemo(
    () => siteRows.map((s) => ({ value: String(s.id), label: s.site_name })),
    [siteRows],
  );

  const hasActiveFilters = hasListActiveFilters({
    search,
    customerParam,
    siteParam,
    projectParam,
    statusParam,
  });
  const hideListChrome = !loadError && !loading && items.length === 0 && !hasActiveFilters;
  const pageRange = getListPageRange(pagination);

  const quoteStatusLabel = React.useCallback((code: string | null | undefined) => {
    const raw = code == null ? "" : String(code).trim();
    if (!raw) return "—";
    const norm = raw.toLowerCase();
    if (norm === "draft") return t("quoteStatus.draft");
    if (norm === "sent") return t("quoteStatus.sent");
    if (norm === "accepted") return t("quoteStatus.accepted");
    if (norm === "rejected") return t("quoteStatus.rejected");
    return raw;
  }, [t]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<QuotationListItem>();
    const customerDisplay = (row: QuotationListItem) => {
      const customerId = getQuotationCustomerId(row.customer);
      return quotationCustomerLabel(row.customer, customerId != null ? clientLabelById[customerId] : undefined);
    };
    const siteDisplay = (row: QuotationListItem) => {
      const siteId = getQuotationSiteId(row.site);
      return quotationSiteLabel(row.site, siteId != null ? siteLabelById[siteId] : undefined);
    };
    const tagsDisplay = (row: QuotationListItem) => quotationTagsLabels(row.tags, tagLabelById);

    return [
      c.primary("quote", t("table.quote"), (r) => r.quote_name),
      c.truncate("customer", t("table.customer"), (r) => customerDisplay(r), {
        title: (r) => customerDisplay(r),
      }),
      c.truncate("site", t("table.site"), (r) => siteDisplay(r), {
        title: (r) => siteDisplay(r),
      }),
      c.truncate("tags", t("table.tags"), (r) => tagsDisplay(r), {
        title: (r) => tagsDisplay(r),
      }),
      c.text("status", t("table.status"), (r) => quoteStatusLabel(r.status)),
      c.tabular("due", t("table.due"), (r) => formatFlexibleApiDate(r.due_date, dueFmt)),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
      c.actions("actions", tList("openRowActions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            {
              id: "edit",
              label: t("edit"),
              icon: Pencil,
              onSelect: () => openEdit(row.id),
            },
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, dueFmt, clientLabelById, siteLabelById, tagLabelById, quoteStatusLabel]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={hasActiveFilters}
          viewMode={listViewMode}
          onViewModeChange={setListViewMode}
          tableViewLabel={tList("tableView")}
          listViewLabel={tList("listView")}
          action={
            <AddButton type="button" onClick={openCreate} />
          }
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                placeholder={tList("searchPlaceholder")}
                ariaLabel={tList("searchAria")}
                className="sm:max-w-sm"
              />
              <CheckmarkSelect
                listLabel={t("filterCustomer")}
                buttonAriaLabel={t("filterCustomer")}
                options={clientOptions}
                value={customerParam ?? ""}
                emptyLabel={t("filterAllCustomers")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onChange={(v) =>
                  setUrl({ customer: v || null, site: null, project: null, page: null }, { replace: true })
                }
              />
              <CheckmarkSelect
                listLabel={t("filterSite")}
                buttonAriaLabel={t("filterSite")}
                options={siteOptionsForFilter}
                value={siteParam ?? ""}
                emptyLabel={t("filterAllSites")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onChange={(v) => setUrl({ site: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterProject")}
                buttonAriaLabel={t("filterProject")}
                options={projectOptionsForFilter}
                value={projectParam ?? ""}
                emptyLabel={t("filterAllProjects")}
                portaled
                searchable
                clearable
                clearAriaLabel={tList("clearFilter")}
                className="w-full min-w-0 sm:w-56"
                onChange={(v) => setUrl({ project: v || null, page: null }, { replace: true })}
              />
              <CheckmarkSelect
                listLabel={t("filterStatus")}
                buttonAriaLabel={t("filterStatus")}
                options={statusFilterOptions}
                value={statusParam ?? ""}
                emptyLabel={t("filterAllStatuses")}
                portaled
                className="w-full min-w-0 sm:w-44"
                onChange={(v) => setUrl({ status: v || null, page: null }, { replace: true })}
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
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
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          hasActiveFilters ? (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noResultsTitle")}
              description={tList("noResultsDescription")}
              action={
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setUrl(
                      { search: null, is_active: null, customer: null, site: null, project: null, status: null, page: null },
                      { replace: true },
                    )
                  }
                >
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="clients"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={
                <AddButton type="button" onClick={openCreate} />
              }
            />
          )
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const dueLabel = formatFlexibleApiDate(row.due_date, dueFmt);
                const customerId = getQuotationCustomerId(row.customer);
                const customerDisplay = quotationCustomerLabel(
                  row.customer,
                  customerId != null ? clientLabelById[customerId] : undefined,
                );
                const siteId = getQuotationSiteId(row.site);
                const siteDisplay = quotationSiteLabel(row.site, siteId != null ? siteLabelById[siteId] : undefined);
                const tagsLine = quotationTagsLabels(row.tags, tagLabelById);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    title={row.quote_name}
                    subtitle={tagsLine !== "—" ? tagsLine : undefined}
                    meta={
                      <span className="block min-w-0 truncate" title={`${customerDisplay} · ${siteDisplay}`}>
                        {customerDisplay}
                        <span className="text-slate-400 dark:text-slate-500" aria-hidden>
                          {" "}
                          ·{" "}
                        </span>
                        {siteDisplay}
                      </span>
                    }
                    footer={
                      <div className="flex w-full flex-col gap-2">
                        <div className="flex w-full flex-wrap items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                              <Calendar className="size-3.5 shrink-0 text-slate-500 dark:text-slate-500" aria-hidden />
                              <span className="tabular-nums">{dueLabel}</span>
                            </span>
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {quoteStatusLabel(row.status)}
                            </span>
                            <ActiveStatusBadge
                              active={row.is_active}
                              label={row.is_active ? t("status.active") : t("status.inactive")}
                            />
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                          </span>
                        </div>
                      </div>
                    }
                    onCardClick={() => openDetail(row.id)}
                    menu={
                      <DataTableRowActionsMenu
                        menuAriaLabel={tList("openRowActions")}
                        items={[
                          {
                            id: "edit",
                            label: t("edit"),
                            icon: Pencil,
                            onSelect: () => openEdit(row.id),
                          },
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
