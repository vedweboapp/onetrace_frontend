"use client";

import * as React from "react";
import { Pencil, Phone, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchAllContactIds, fetchContactsPage, updateContact } from "@/features/contacts/api/contact.api";
import type { Contact, ContactType } from "@/features/contacts/types/contact.types";
import { contactParentName } from "@/features/contacts/utils/contact-nested-fields.util";
import { fetchVendorsPage } from "@/features/vendors/api/vendor.api";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  CheckmarkSelect,
  DataTablePaginationBar,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageCardSkeleton,
  ListPageActiveFilter,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  AppTabs,
  type AppTabItem,
} from "@/shared/ui";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import {
  MassActionBar,
  buildContactMassUpdateFields,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";

function parseContactTypeParam(raw: string | null): ContactType {
  return raw === "vendor" ? "vendor" : "client";
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
  const contactTypeParam = searchParams.get("contact_type");
  const activeContactType = parseContactTypeParam(contactTypeParam);
  const clientParam = searchParams.get("client");
  const clientFilter = clientParam && /^\d+$/.test(clientParam) ? Number.parseInt(clientParam, 10) : undefined;
  const vendorParam = searchParams.get("vendor");
  const vendorFilter = vendorParam && /^\d+$/.test(vendorParam) ? Number.parseInt(vendorParam, 10) : undefined;

  const listTabs = React.useMemo<AppTabItem[]>(
    () => [
      { id: "client", label: t("tabs.client") },
      { id: "vendor", label: t("tabs.vendor") },
    ],
    [t],
  );

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
  const [vendorOptions, setVendorOptions] = React.useState<{ value: string; label: string }[]>([]);
  const openCreate = React.useCallback(() => {
    const params = new URLSearchParams();
    params.set("back", listHref);
    if (activeContactType === "vendor") params.set("contact_type", "vendor");
    router.push(`${pathname}/new?${params.toString()}`);
  }, [activeContactType, listHref, pathname, router]);

  const openEdit = React.useCallback(
    (id: number) => {
      router.push(buildPathWithStoredBack(`${pathname}/${id}/edit`, listHref));
    },
    [listHref, pathname, router],
  );

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      is_active: isActiveFilter,
      contact_type: activeContactType,
      client: activeContactType === "client" ? clientFilter : undefined,
      vendor: activeContactType === "vendor" ? vendorFilter : undefined,
    }),
    [search, isActiveFilter, activeContactType, clientFilter, vendorFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildContactMassUpdateFields(clientOptions, {
        name: t("fields.name"),
        email: t("fields.email"),
        phone: t("fields.phone"),
        client: t("fields.client"),
        addressLine1: t("fields.addressLine1"),
        addressLine2: t("fields.addressLine2"),
        country: t("fields.country"),
        state: t("fields.stateProvince"),
        city: t("fields.city"),
        pincode: t("fields.pincode"),
        isActive: t("table.status"),
        activeLabel: t("status.active"),
        inactiveLabel: t("status.inactive"),
      }),
    [clientOptions, t],
  );

  const fetchAllIds = React.useCallback(() => fetchAllContactIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "contacts",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, isActiveFilter, activeContactType, clientFilter, vendorFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

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
        const [{ items: clients }, { items: vendors }] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }),
          fetchVendorsPage(1, 500, { is_active: true }),
        ]);
        if (!cancelled) {
          setClientOptions(clients.map((c) => ({ value: String(c.id), label: c.name })));
          setVendorOptions(vendors.map((v) => ({ value: String(v.id), label: v.name })));
        }
      } catch {
        if (!cancelled) {
          setClientOptions([]);
          setVendorOptions([]);
        }
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
        const { items: nextItems, pagination: p } = await fetchContactsPage(page, pageSize, listFilters);
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
  }, [page, pageSize, listFilters, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const vendorLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of vendorOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [vendorOptions]);

  const parentLabels = React.useMemo(
    () => ({ clientNameById: clientLabelById, vendorNameById: vendorLabelById }),
    [clientLabelById, vendorLabelById],
  );

  const parentColumnLabel = activeContactType === "vendor" ? t("table.vendor") : t("table.client");

  const hasActiveFilters = hasListActiveFilters({
    search,
    isActiveParam,
    clientParam: activeContactType === "client" ? clientParam : null,
    vendorParam: activeContactType === "vendor" ? vendorParam : null,
    contactTypeParam,
  });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchContactsPage(1, 1, {
      ...listFilters,
      is_active: false,
    });
    return p.total_records;
  }, [listFilters]);
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
      c.selection(
        "select",
        (
          <input
            ref={mass.selection.selectAllRef}
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.allMatchingSelected}
            disabled={mass.selection.selectingAll || items.length === 0}
            aria-label={mass.selectAllAriaLabel}
            onChange={() => void mass.selection.toggleSelectAll()}
          />
        ),
        (row) => (
          <input
            type="checkbox"
            className={mass.selection.rowCheckboxClassName}
            checked={mass.selection.isSelected(row.id)}
            aria-label={mass.selectRowAriaLabel}
            onChange={() => mass.selection.toggleRowSelected(row.id)}
          />
        ),
        { narrow: true },
      ),
      c.primary("name", t("table.name"), (r) => r.name),
      c.text("parent", parentColumnLabel, (r) => contactParentName(r, parentLabels)),
      c.truncate("email", t("table.email"), (r) => r.email),
      c.phone("phone", t("table.phone"), (r) => r.phone),
      c.status("status", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
      // c.actions("actions", t("table.actions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[
      //       { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row.id) },
      //       row.is_active
      //         ? {
      //             id: "deactivate",
      //             label: t("deactivate"),
      //             icon: PowerOff,
      //             onSelect: () => void handleToggleActive(row, false),
      //             disabled: togglingId === row.id,
      //           }
      //         : {
      //             id: "activate",
      //             label: t("activate"),
      //             icon: Power,
      //             onSelect: () => void handleToggleActive(row, true),
      //             disabled: togglingId === row.id,
      //           },
      //     ]}
      //   />
      // )),
    ];
  }, [t, tList, dateFmt, parentColumnLabel, parentLabels, togglingId, openEdit, mass, items.length]);

  const switchContactType = React.useCallback(
    (tab: string) => {
      const nextType = tab === "vendor" ? "vendor" : "client";
      setUrl(
        {
          contact_type: nextType === "client" ? null : nextType,
          client: null,
          vendor: null,
          page: null,
        },
        { replace: true },
      );
    },
    [setUrl],
  );

  return (
    <div className="space-y-4">
      {!hideListChrome ? (
        <AppTabs
          tabs={listTabs}
          value={activeContactType}
          onValueChange={switchContactType}
          ariaLabel={t("tabsAria")}
          panelIdPrefix="contacts-list-tab"
        />
      ) : null}
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
              {activeContactType === "vendor" ? (
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
                  onChange={(v) => setUrl({ vendor: v || null, page: null }, { replace: true })}
                />
              ) : (
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
              )}
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
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() =>
              setUrl(
                { search: null, is_active: null, client: null, vendor: null, contact_type: null, page: null },
                { replace: true },
              )
            }
            onSwitchToInactive={switchToInactive}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  leading={
                    <input
                      type="checkbox"
                      className={mass.selection.rowCheckboxClassName}
                      checked={mass.selection.isSelected(row.id)}
                      aria-label={mass.selectRowAriaLabel}
                      onChange={() => mass.selection.toggleRowSelected(row.id)}
                    />
                  }
                  title={row.name}
                  subtitle={contactParentName(row, parentLabels)}
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
