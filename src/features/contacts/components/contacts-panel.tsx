"use client";

import * as React from "react";
import { Pencil, Phone, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage, updateContact } from "@/features/contacts/api/contact.api";
import type { Contact } from "@/features/contacts/types/contact.types";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  AppButton,
  CheckmarkSelect,
  DashboardEmptyState,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageActiveFilter,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { cn } from "@/core/utils/http.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

function contactClientId(row: Contact): number | null {
  if (typeof row.client === "number" && Number.isFinite(row.client) && row.client > 0) return row.client;
  if (row.client && typeof row.client === "object" && Number.isFinite(row.client.id) && row.client.id > 0) {
    return row.client.id;
  }
  return null;
}

function contactClientName(row: Contact, clientNameById: Record<number, string>): string {
  if (row.client && typeof row.client === "object" && row.client.name?.trim()) return row.client.name.trim();
  const id = contactClientId(row);
  if (id && clientNameById[id]) return clientNameById[id];
  return id ? `#${id}` : "—";
}

export function ContactsPanel() {
  const t = useTranslations("Dashboard.contacts");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
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

  const openContactDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const { page, pageSize, listViewMode, search, isActiveParam, setUrl, setPage, setPageSize, setListViewMode } =
    useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam) ?? true;
  const clientParam = searchParams.get("client");
  const clientFilter = clientParam && /^\d+$/.test(clientParam) ? Number.parseInt(clientParam, 10) : undefined;

  const [items, setItems] = React.useState<Contact[]>([]);
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
  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
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
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchContactsPage(page, pageSize, {
          search: search || undefined,
          is_active: isActiveFilter,
          client: clientFilter,
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
  }, [page, pageSize, search, isActiveFilter, clientFilter, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const hasActiveFilters = hasListActiveFilters({ search, isActiveParam, clientParam });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchContactsPage(1, 1, {
      search: search || undefined,
      is_active: false,
      client: clientFilter,
    });
    return p.total_records;
  }, [search, clientFilter]);
  const { hideListChrome, listLoading, emptyStateKind, filtersActive, switchToInactive } =
    useListActiveInactiveEmptyState({
      loading,
      loadError,
      itemsLength: items.length,
      isActiveParam,
      isActiveFilter,
      hasActiveFilters,
      setUrl,
      countInactive,
    });
  const pageRange = getListPageRange(pagination);

  async function handleToggleActive(row: Contact, next: boolean) {
    setTogglingId(row.id);
    try {
      await updateContact(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Contact>();
    return [
      c.primary("name", t("table.name"), (r) => r.name),
      c.text("client", t("table.client"), (r) => contactClientName(r, clientLabelById)),
      c.truncate("email", t("table.email"), (r) => r.email),
      c.phone("phone", t("table.phone"), (r) => r.phone),
      c.status("status", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
      c.actions("actions", t("table.actions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) },
            row.is_active
              ? {
                  id: "deactivate",
                  label: t("deactivate"),
                  icon: PowerOff,
                  onSelect: () => void handleToggleActive(row, false),
                  disabled: togglingId === row.id,
                }
              : {
                  id: "activate",
                  label: t("activate"),
                  icon: Power,
                  onSelect: () => void handleToggleActive(row, true),
                  disabled: togglingId === row.id,
                },
          ]}
        />
      )),
    ];
  }, [t, tList, dateFmt, clientLabelById, togglingId, openEdit]);

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
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
                onChange={(v) => setUrl({ client: v || null, page: null }, { replace: true })}
              />
              <ListPageActiveFilter
                activeLabel={t("status.active")}
                inactiveLabel={t("status.inactive")}
                filterLabel={t("filterState")}
                filterAriaLabel={t("filterState")}
                isActiveParam={isActiveParam}
                onChange={(isActive) =>
                  setUrl({ is_active: isActive ? null : "false", page: null }, { replace: true })
                }
              />
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={hideListChrome ? "rounded-none border-dashed" : "rounded-none"}>
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
              <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          emptyStateKind === "onboarding" ? (
            <DashboardEmptyState
              iconName="clients"
              title={t("emptyTitle")}
              description={t("emptyDescription")}
              action={<AddButton type="button" onClick={openCreate} />}
            />
          ) : emptyStateKind === "activeOnly" ? (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noActiveResultsTitle")}
              description={tList("noActiveResultsDescription")}
              action={
                <AppButton type="button" variant="secondary" size="sm" onClick={switchToInactive}>
                  {tList("viewInactive")}
                </AppButton>
              }
            />
          ) : (
            <DashboardEmptyState
              iconName="noResults"
              title={tList("noResultsTitle")}
              description={tList("noResultsDescription")}
              action={
                <AppButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setUrl({ search: null, is_active: null, client: null, page: null }, { replace: true })}
                >
                  {tList("clearFilters")}
                </AppButton>
              }
            />
          )
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  title={row.name}
                  subtitle={contactClientName(row, clientLabelById)}
                  meta={row.email}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-3">
                        {row.phone?.trim() ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                            <Phone className="size-3.5 shrink-0 text-slate-500 dark:text-slate-500" aria-hidden />
                            <span className="tabular-nums">{row.phone.trim()}</span>
                          </span>
                        ) : null}
                        <ActiveStatusBadge
                          active={row.is_active}
                          label={row.is_active ? t("status.active") : t("status.inactive")}
                        />
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) })}
                      </span>
                    </div>
                  }
                  onCardClick={() => openContactDetail(row.id)}
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
                        row.is_active
                          ? {
                              id: "deactivate",
                              label: t("deactivate"),
                              icon: PowerOff,
                              onSelect: () => void handleToggleActive(row, false),
                              disabled: togglingId === row.id,
                            }
                          : {
                              id: "activate",
                              label: t("activate"),
                              icon: Power,
                              onSelect: () => void handleToggleActive(row, true),
                              disabled: togglingId === row.id,
                            },
                      ]}
                    />
                  }
                />
              ))}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openContactDetail(row.id)}
            getRowClassName={(row) => highlightClassName(row.id)}
          />
        )}

        {!listLoading && !loadError && items.length > 0 ? (
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
