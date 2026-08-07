"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Calendar, Pencil, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchAllInvoiceIds, fetchInvoicesPage } from "@/features/invoices/api/invoice.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import { InvoiceStatusBadge } from "@/features/invoices/components/invoice-status-badge";
import type { InvoiceListItem } from "@/features/invoices/types/invoice.types";
import {
  invoiceClientLabel,
  invoiceListAmount,
  invoiceJobOrProjectLabel,
  nestedId,
  normalizeInvoiceStatus,
} from "@/features/invoices/utils/invoice-nested-fields.util";
import { formatMoneyDisplay } from "@/features/invoices/utils/invoice-money.util";
import { useOrgCurrency } from "@/shared/money/use-org-currency";
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
  listPageRootClassName,
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
import {
  MassActionBar,
  buildInvoiceMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";

export function InvoicesPanel() {
  const t = useTranslations("Dashboard.invoices");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  useOrgCurrency();
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
  const clientParam = searchParams.get("client");
  const statusFilter = statusParam?.trim() || undefined;
  const clientFilter =
    clientParam && /^\d+$/.test(clientParam) ? Number.parseInt(clientParam, 10) : undefined;

  const [items, setItems] = React.useState<InvoiceListItem[]>([]);
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
  const [fetchClientOptions, setFetchClientOptions] = React.useState(() => Boolean(clientParam));
  const [fetchMassOptions, setFetchMassOptions] = React.useState(false);
  const [contactOptions, setContactOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [projectOptions, setProjectOptions] = React.useState<{ value: string; label: string }[]>([]);

  const loadClientOptions = React.useCallback(async () => {
    const { items } = await fetchClientsPage(1, 500, { is_active: true }, { silent: true });
    return items.map((c) => ({ value: String(c.id), label: c.name }));
  }, []);

  const { options: clientOptions } = useDeferredListOptions(loadClientOptions, fetchClientOptions);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "draft", label: t("status.draft") },
      { value: "sent", label: t("status.sent") },
      { value: "paid", label: t("status.paid") },
      { value: "pending", label: t("status.pending") },
      { value: "overdue", label: t("status.overdue") },
    ],
    [t],
  );

  const paymentTermOptions = React.useMemo(
    () => [
      { value: "net_7", label: t("paymentTerms.net7") },
      { value: "net_45", label: t("paymentTerms.net45") },
      { value: "net_30", label: t("paymentTerms.net30") },
      { value: "net_15", label: t("paymentTerms.net15") },
      { value: "due_on_receipt", label: t("paymentTerms.dueOnReceipt") },
    ],
    [t],
  );

  const statusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const norm = normalizeInvoiceStatus(code);
      if (norm === "paid") return t("status.paid");
      if (norm === "pending") return t("status.pending");
      if (norm === "overdue") return t("status.overdue");
      if (norm === "draft") return t("status.draft");
      if (norm === "sent") return t("status.sent");
      const raw = code?.trim();
      return raw || "—";
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
    if (!fetchMassOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const [contactsRes, projectsRes] = await Promise.all([
          fetchContactsPage(1, 500, { is_active: true }),
          fetchProjectsPage(1, 500, { is_active: true }),
        ]);
        if (cancelled) return;
        setContactOptions(
          contactsRes.items.map((c) => ({
            value: String(c.id),
            label: c.name?.trim() || `#${c.id}`,
          })),
        );
        setProjectOptions(projectsRes.items.map((p) => ({ value: String(p.id), label: p.name })));
        setFetchClientOptions(true);
      } catch {
        if (!cancelled) {
          setContactOptions([]);
          setProjectOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMassOptions]);

  React.useEffect(() => {
    if (clientParam) setFetchClientOptions(true);
  }, [clientParam]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchInvoicesPage(page, pageSize, {
          search: search || undefined,
          status: statusFilter,
          client: clientFilter,
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
  }, [page, pageSize, search, statusFilter, clientFilter, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const hasActiveFilters = hasListActiveFilters({ search, statusParam, clientParam });
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      status: statusFilter,
      client: clientFilter,
    }),
    [search, statusFilter, clientFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildInvoiceMassUpdateFields(
        {
          clientOptions,
          contactOptions,
          projectOptions,
          statusOptions: statusFilterOptions,
          paymentTermOptions,
        },
        {
          client: t("fields.clientName"),
          contact: t("fields.contactPerson"),
          project: t("fields.projectName"),
          dueDate: t("fields.dueDate"),
          paymentTerms: t("fields.paymentTerms"),
          status: t("fields.status"),
          clientNotes: t("fields.clientNotes"),
          internalNotes: t("fields.internalNotes"),
        },
      ),
    [t, clientOptions, contactOptions, projectOptions, statusFilterOptions, paymentTermOptions],
  );

  const fetchAllIds = React.useCallback(() => fetchAllInvoiceIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "invoices",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, statusFilter, clientFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  React.useEffect(() => {
    if (mass.selectedCount > 0) setFetchMassOptions(true);
  }, [mass.selectedCount]);

  const massSel = React.useMemo(() => massSelectionColumn(mass, items.length), [mass, items.length]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<InvoiceListItem>();
    const clientDisplay = (row: InvoiceListItem) => {
      const clientId = nestedId(row.client);
      return invoiceClientLabel(row.client, clientId != null ? clientLabelById[clientId] : undefined);
    };

    return [
      massSel.tableColumn,
      c.primary("invoice", t("table.invoiceNumber"), (r) => r.invoice_number),
      c.truncate("client", t("table.clientName"), (r) => clientDisplay(r), {
        title: (r) => clientDisplay(r),
      }),
      c.truncate("project", t("table.projectName"), (r) => invoiceJobOrProjectLabel(r)),
      c.tabular("amount", t("table.amount"), (r) =>
        formatMoneyDisplay(invoiceListAmount(r), locale),
      ),
      c.tabular("issue", t("table.issueDate"), (r) => formatFlexibleApiDate(r.issue_date, dateFmt)),
      c.custom("status", t("table.status"), (r) => (
        <InvoiceStatusBadge status={r.status} label={statusLabel(r.status)} />
      )),
      c.actions("actions", tList("openRowActions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) },
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, locale, clientLabelById, statusLabel, openEdit, massSel.tableColumn]);

  return (
    <div className={listPageRootClassName()}>
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
              listLabel={t("filterClient")}
              buttonAriaLabel={t("filterClient")}
              options={clientOptions}
              value={clientParam ?? ""}
              emptyLabel={t("filterAllClients")}
              portaled
              searchable
              clearable
              clearAriaLabel={tList("clearFilter")}
              className="w-full min-w-0 sm:w-56"
              onOpenChange={(open) => {
                if (open) setFetchClientOptions(true);
              }}
              onChange={(v) => setUrl({ client: v || null, page: null }, { replace: true })}
            />
          </div>
        }
      />
      ) : null}

      {mass.selectedCount > 0 && !listLoading && !loadError ? (
        <MassActionBar
          selectedIds={mass.selectedIds}
          config={mass.config}
          updateFields={mass.updateFields}
          onSuccess={mass.handleMassSuccess}
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
                  {t("createInvoice")}
                </AppButton>
              ),
            }}
            onClearFilters={() =>
              setUrl({ search: null, status: null, client: null, page: null }, { replace: true })
            }
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const clientId = nestedId(row.client);
                const clientDisplay = invoiceClientLabel(
                  row.client,
                  clientId != null ? clientLabelById[clientId] : undefined,
                );
                const issueLabel = formatFlexibleApiDate(row.issue_date, dateFmt);
                const amountLabel = formatMoneyDisplay(invoiceListAmount(row), locale);
                return (
                  <ListPageCard
                    key={row.id}
                    dataListRowId={row.id}
                    className={highlightClassName(row.id)}
                    leading={massSel.cardLeading(row)}
                    title={row.invoice_number}
                    subtitle={clientDisplay}
                    meta={<span className="block min-w-0 truncate">{invoiceJobOrProjectLabel(row)}</span>}
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
                          <InvoiceStatusBadge status={row.status} label={statusLabel(row.status)} />
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
