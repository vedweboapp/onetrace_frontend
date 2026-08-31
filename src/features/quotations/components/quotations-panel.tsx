"use client";

import { cn } from "@/core/utils/http.util";
import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { Calendar, Pencil, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchContactsPage } from "@/features/contacts/api/contact.api";
import { formatContactOptionLabel } from "@/features/contacts/utils/contact-name.util";
import { fetchAllQuotationIds, fetchQuotationsPage } from "@/features/quotations/api/quotation.api";
import {
  parseQuoteCategoryParam,
  QUOTE_CATEGORY,
} from "@/features/quotations/constants/quotation-category";
import type { QuotationListItem } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationProjectId,
  getQuotationSiteId,
  quotationCustomerLabel,
  quotationProjectLabel,
  quotationSiteLabel,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import type { Tag } from "@/features/tags/types/tag.types";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import {
  fetchUsersForAppRoles,
  resolveUserProfileSelectId,
  userProfilesToSelectOptions,
} from "@/features/users/utils/load-users-by-role.util";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import type { Site } from "@/features/sites/types/site.types";
import { DetailEntityLink, EntityDataTable, entityCol, entityNameLinkClassName } from "@/shared/components/entity";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { hasListActiveFilters, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  CheckmarkSelect,
  ListPageEmptyStates,
  listPageSurfaceShellClassName,
  listPageRootClassName,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardFooter,
  ListPageCardGrid,
  ListPageCardMetaLine,
  ListPageCardSkeleton,
  ListPageHeader,
  ListPageSearchField,
  listPageCardScrollClassName,
  SurfaceShell,
} from "@/shared/ui";
import {
  MassActionBar,
  buildQuotationMassUpdateFields,
  useEntityListMassActions,
} from "@/shared/mass-actions";
import { buildDetailHrefWithListReturn, buildPathWithStoredBack } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { useDeferredListOptions } from "@/shared/hooks/use-deferred-list-options";

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
  const categoryParam = searchParams.get("quote_category");

  const customerFilter =
    customerParam && /^\d+$/.test(customerParam) ? Number.parseInt(customerParam, 10) : undefined;
  const projectFilter =
    projectParam && /^\d+$/.test(projectParam) ? Number.parseInt(projectParam, 10) : undefined;
  const statusFilter = statusParam?.trim() || undefined;
  const categoryFilter = parseQuoteCategoryParam(categoryParam);

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
  const [refreshNonce, setRefreshNonce] = React.useState(0);

  const [fetchCustomerOptions, setFetchCustomerOptions] = React.useState(() => Boolean(customerParam));
  const [fetchSiteOptions, setFetchSiteOptions] = React.useState(() => Boolean(siteParam || customerParam));
  const [fetchProjectOptions, setFetchProjectOptions] = React.useState(
    () => Boolean(projectParam) || categoryFilter === QUOTE_CATEGORY.project,
  );
  const [fetchMassOptions, setFetchMassOptions] = React.useState(false);
  const [siteRows, setSiteRows] = React.useState<Site[]>([]);
  const [projectRows, setProjectRows] = React.useState<Project[]>([]);
  const [massSiteOptions, setMassSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massContactOptions, setMassContactOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massTagOptions, setMassTagOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [massUserOptions, setMassUserOptions] = React.useState<{ value: string; label: string }[]>([]);

  const loadCustomerOptions = React.useCallback(async () => {
    const { items } = await fetchClientsPage(1, 500, { is_active: true });
    return items.map((c) => ({ value: String(c.id), label: c.name }));
  }, []);

  const { options: clientOptions } = useDeferredListOptions(loadCustomerOptions, fetchCustomerOptions);
  const openCreate = React.useCallback(() => {
    const cat = categoryFilter ?? QUOTE_CATEGORY.service;
    router.push(
      buildPathWithStoredBack(`${pathname}/new?quote_category=${encodeURIComponent(cat)}`, listHref),
    );
  }, [categoryFilter, listHref, pathname, router]);

  const openEdit = React.useCallback(
    (id: number) => {
      router.push(buildPathWithStoredBack(`${pathname}/${id}/edit`, listHref));
    },
    [listHref, pathname, router],
  );

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const statusFilterOptions = React.useMemo(
    () => [
      { value: "draft", label: t("quoteStatus.draft") },
      { value: "sent", label: t("quoteStatus.sent") },
      { value: "approved", label: t("quoteStatus.approved") },
      { value: "rejected", label: t("quoteStatus.rejected") },
    ],
    [t],
  );

  React.useEffect(() => {
    if (categoryFilter) return;
    const p = new URLSearchParams(searchParams.toString());
    p.set("quote_category", QUOTE_CATEGORY.service);
    const qs = p.toString();
    router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
  }, [categoryFilter, pathname, router, searchParams]);

  const commitSearch = React.useCallback(
    (q: string) => {
      const trimmed = q.trim();
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  React.useEffect(() => {
    if (!fetchSiteOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const { items } = await fetchSitesPage(1, 500, {
          client: customerFilter,
        });
        if (!cancelled) setSiteRows(items);
      } catch {
        if (!cancelled) setSiteRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchSiteOptions, customerFilter]);

  React.useEffect(() => {
    if (!fetchProjectOptions) return;
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
  }, [fetchProjectOptions]);

  React.useEffect(() => {
    if (!fetchMassOptions) return;
    let cancelled = false;
    (async () => {
      try {
        const [contactsRes, tagsRes, roleUsers, sitesRes] = await Promise.all([
          fetchContactsPage(1, 500, { is_active: true }),
          fetchTagsPage(1, 500, { is_active: true }),
          fetchUsersForAppRoles(["technician", "manager", "sales"]),
          fetchSitesPage(1, 500),
        ]);
        if (!cancelled) {
          setMassContactOptions(contactsRes.items.map((c) => ({ value: String(c.id), label: formatContactOptionLabel(c) })));
          const tagLabel = (row: Tag) => row.name ?? row.tag_name ?? `#${row.id}`;
          setMassTagOptions(tagsRes.items.map((row) => ({ value: String(row.id), label: tagLabel(row) })));
          const mergedUsers = [
            ...(roleUsers.technician ?? []),
            ...(roleUsers.manager ?? []),
            ...(roleUsers.sales ?? []),
          ];
          const uniqueById = new Map(mergedUsers.map((u) => [resolveUserProfileSelectId(u), u]));
          setMassUserOptions(userProfilesToSelectOptions([...uniqueById.values()]));
          setMassSiteOptions(sitesRes.items.map((s) => ({ value: String(s.id), label: s.site_name })));
          setFetchCustomerOptions(true);
        }
      } catch {
        if (!cancelled) {
          setMassContactOptions([]);
          setMassTagOptions([]);
          setMassUserOptions([]);
          setMassSiteOptions([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchMassOptions]);

  React.useEffect(() => {
    if (customerParam) setFetchCustomerOptions(true);
  }, [customerParam]);

  React.useEffect(() => {
    if (siteParam || customerParam) setFetchSiteOptions(true);
  }, [siteParam, customerParam]);

  React.useEffect(() => {
    if (projectParam) setFetchProjectOptions(true);
  }, [projectParam]);

  React.useEffect(() => {
    if (categoryFilter === QUOTE_CATEGORY.project) setFetchProjectOptions(true);
  }, [categoryFilter]);

  React.useEffect(() => {
    if (customerFilter) setFetchSiteOptions(true);
  }, [customerFilter]);

  React.useEffect(() => {
    if (!categoryFilter) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchQuotationsPage(page, pageSize, {
          search: search || undefined,
          customer: customerFilter,
          project: categoryFilter === QUOTE_CATEGORY.project ? projectFilter : undefined,
          status: statusFilter,
          quote_category: categoryFilter,
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
  }, [
    page,
    pageSize,
    search,
    customerFilter,
    projectFilter,
    statusFilter,
    categoryFilter,
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

  const tagLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const row of items) {
      if (!Array.isArray(row.tags)) continue;
      for (const tag of row.tags) {
        if (typeof tag !== "object" || tag === null || typeof tag.id !== "number") continue;
        const label =
          (typeof tag.name === "string" && tag.name.trim()) ||
          (typeof tag.tag_name === "string" && tag.tag_name.trim());
        if (label) m[tag.id] = label;
      }
    }
    return m;
  }, [items]);

  const projectOptionsForFilter = React.useMemo(() => {
    if (!customerFilter || customerFilter <= 0) {
      return projectRows.map((p) => ({ value: String(p.id), label: p.name }));
    }
    return projectRows
      .filter((p) => getProjectClientId(p) === customerFilter)
      .map((p) => ({ value: String(p.id), label: p.name }));
  }, [projectRows, customerFilter]);

  const projectLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const p of projectRows) m[p.id] = p.name;
    return m;
  }, [projectRows]);

  const listFilters = React.useMemo(
    () => ({
      search: search || undefined,
      customer: customerFilter,
      project: categoryFilter === QUOTE_CATEGORY.project ? projectFilter : undefined,
      status: statusFilter,
      quote_category: categoryFilter,
    }),
    [search, customerFilter, projectFilter, statusFilter, categoryFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildQuotationMassUpdateFields(
        {
          clientOptions,
          siteOptions: massSiteOptions,
          contactOptions: massContactOptions,
          userOptions: massUserOptions,
          tagOptions: massTagOptions,
          statusOptions: statusFilterOptions,
        },
        {
          quoteName: t("fields.quoteName"),
          customer: t("fields.customer"),
          site: t("fields.site"),
          primaryContact: t("fields.primaryContact"),
          additionalContact: t("fields.additionalContact"),
          siteContact: t("fields.siteContact"),
          orderNumber: t("fields.orderNumber"),
          dueDate: t("fields.dueDate"),
          salesperson: t("fields.salesperson"),
          projectManager: t("fields.projectManager"),
          technicians: t("fields.technicians"),
          tags: t("fields.tags"),
          description: t("fields.description"),
          status: t("table.status"),
          isActive: t("filterState"),
          activeLabel: t("status.active"),
          inactiveLabel: t("status.inactive"),
        },
      ),
    [
      clientOptions,
      massSiteOptions,
      massContactOptions,
      massUserOptions,
      massTagOptions,
      statusFilterOptions,
      t,
    ],
  );

  const fetchAllIds = React.useCallback(() => fetchAllQuotationIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "quotations",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, customerFilter, projectFilter, statusFilter, categoryFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  React.useEffect(() => {
    if (mass.selectedCount > 0) setFetchMassOptions(true);
  }, [mass.selectedCount]);

  const hasActiveFilters = hasListActiveFilters({
    search,
    customerParam,
    projectParam,
    statusParam,
  });
  const showProjectFilter = categoryFilter === QUOTE_CATEGORY.project;
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);

  const quoteStatusLabel = React.useCallback((code: string | null | undefined) => {
    const raw = code == null ? "" : String(code).trim();
    if (!raw) return "—";
    const norm = raw.toLowerCase();
    if (norm === "draft") return t("quoteStatus.draft");
    if (norm === "sent") return t("quoteStatus.sent");
    if (norm === "approved" || norm === "accepted") return t("quoteStatus.approved");
    if (norm === "rejected") return t("quoteStatus.rejected");
    return raw;
  }, [t]);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<QuotationListItem>();
    const customerDisplay = (row: QuotationListItem) => {
      const customerId = getQuotationCustomerId(row.customer);
      return quotationCustomerLabel(row.customer, customerId != null ? clientLabelById[customerId] : undefined);
    };
    const projectDisplay = (row: QuotationListItem) => {
      const projectId = getQuotationProjectId(row.project);
      return quotationProjectLabel(row.project, projectId != null ? projectLabelById[projectId] : undefined);
    };
    const tagsDisplay = (row: QuotationListItem) => quotationTagsLabels(row.tags, tagLabelById);

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
      c.primary("quote", t("table.quote"), (r) => r.quotation_serial_number),
      c.link(
        "customer",
        t("table.customer"),
        (r) => customerDisplay(r),
        (r) => {
          const customerId = getQuotationCustomerId(r.customer);
          return customerId != null ? `${routes.dashboard.clients}/${customerId}` : null;
        },
        { title: (r) => customerDisplay(r) },
      ),
      ...(showProjectFilter
        ? [
            c.link(
              "project",
              t("table.project"),
              (r) => projectDisplay(r),
              (r) => {
                const projectId = getQuotationProjectId(r.project);
                return projectId != null ? `${routes.dashboard.projects}/${projectId}` : null;
              },
              { title: (r) => projectDisplay(r) },
            ),
          ]
        : []),
      // c.truncate("site", t("table.site"), (r) => siteDisplay(r), {
      //   title: (r) => siteDisplay(r),
      // }),
      c.truncate("tags", t("table.tags"), (r) => tagsDisplay(r), {
        title: (r) => tagsDisplay(r),
      }),
      c.text("status", t("table.status"), (r) => quoteStatusLabel(r.status)),
      c.tabular("due", t("table.due"), (r) => formatFlexibleApiDate(r.due_date, dueFmt)),
      c.date("created", t("table.created"), (r) => r.created_at, dateFmt),
    ];
  }, [
    t,
    tList,
    dateFmt,
    dueFmt,
    clientLabelById,
    projectLabelById,
    tagLabelById,
    quoteStatusLabel,
    showProjectFilter,
    mass,
    items.length,
  ]);

  return (
    <div className={listPageRootClassName()}>
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
                onOpenChange={(open) => {
                  if (open) setFetchCustomerOptions(true);
                }}
                onChange={(v) =>
                  setUrl({ customer: v || null, project: null, page: null }, { replace: true })
                }
              />
              {showProjectFilter ? (
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
                  onOpenChange={(open) => {
                    if (open) setFetchProjectOptions(true);
                  }}
                  onChange={(v) => setUrl({ project: v || null, page: null }, { replace: true })}
                />
              ) : null}
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
            <div className={listPageCardScrollClassName()}>
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
                {
                  search: null,
                  customer: null,
                  project: null,
                  status: null,
                  page: null,
                },
                { replace: true },
              )
            }
          />
        ) : listViewMode === "list" ? (
          <div className={listPageCardScrollClassName()}>
            <ListPageCardGrid>
              {items.map((row) => {
                const dueLabel = formatFlexibleApiDate(row.due_date, dueFmt);
                const customerId = getQuotationCustomerId(row.customer);
                const customerDisplay = quotationCustomerLabel(
                  row.customer,
                  customerId != null ? clientLabelById[customerId] : undefined,
                );
                const projectId = getQuotationProjectId(row.project);
                const projectDisplay = quotationProjectLabel(
                  row.project,
                  projectId != null ? projectLabelById[projectId] : undefined,
                );
                const siteId = getQuotationSiteId(row.site);
                const siteDisplay = quotationSiteLabel(row.site, siteId != null ? siteLabelById[siteId] : undefined);
                const relatedLabel = showProjectFilter ? projectDisplay : siteDisplay;
                const serial = row.quotation_serial_number?.trim();
                const quoteName = row.quote_name?.trim() || "—";
                return (
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
                    title={
                      <span className={cn(entityNameLinkClassName, "block truncate")}>
                        {serial || quoteName}
                      </span>
                    }
                    subtitle={serial && quoteName !== serial ? quoteName : undefined}
                    meta={
                      <ListPageCardMetaLine>
                        <span
                          className="flex min-w-0 items-center gap-1.5 truncate"
                          title={`${customerDisplay} · ${relatedLabel}`}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        >
                          {customerId != null ? (
                            <DetailEntityLink
                              href={`${routes.dashboard.clients}/${customerId}`}
                              className="min-w-0 truncate font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {customerDisplay}
                            </DetailEntityLink>
                          ) : (
                            <span className="min-w-0 truncate">{customerDisplay}</span>
                          )}
                          <span className="shrink-0 text-slate-300 dark:text-slate-600" aria-hidden>
                            ·
                          </span>
                          {showProjectFilter && projectId != null ? (
                            <DetailEntityLink
                              href={`${routes.dashboard.projects}/${projectId}`}
                              className="min-w-0 truncate font-medium"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {projectDisplay}
                            </DetailEntityLink>
                          ) : (
                            <span className="min-w-0 truncate">{relatedLabel}</span>
                          )}
                        </span>
                      </ListPageCardMetaLine>
                    }
                    badge={
                      <span className="inline-flex max-w-full truncate rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                        {quoteStatusLabel(row.status)}
                      </span>
                    }
                    footer={
                      <ListPageCardFooter
                        start={
                          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                            <Calendar className="size-3.5 shrink-0" aria-hidden />
                            <span className="tabular-nums">{dueLabel}</span>
                          </span>
                        }
                      />
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
