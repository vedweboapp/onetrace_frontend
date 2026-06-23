"use client";

import * as React from "react";
import { Pencil, Plus, Power, PowerOff, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { deleteProject, fetchAllProjectIds, fetchProjectsPage, patchProject } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { getProjectClientId } from "@/features/projects/utils/project-client-id.util";
import { projectTypesById, resolveProjectTypeChipData } from "@/features/projects/utils/project-type-id.util";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListActiveInactiveEmptyState } from "@/shared/hooks/use-list-active-inactive-empty";
import { hasListActiveFilters, parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import {
  ActiveStatusBadge,
  AddButton,
  ConfirmDialog,
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
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import {
  MassActionBar,
  buildProjectMassUpdateFields,
  massSelectionColumn,
  useEntityListMassActions,
} from "@/shared/mass-actions";

function projectRowClientLabel(row: Project, labels: Record<number, string>): string {
  const cid = getProjectClientId(row);
  if (!cid) return "—";
  return labels[cid] ?? `#${cid}`;
}

export function ProjectsPanel() {
  const t = useTranslations("Dashboard.projects");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const dateOnlyFmt = useDashboardDateFormat({ dateOnly: true });
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

  const openProjectDetail = React.useCallback(
    (id: number) => {
      router.push(buildDetailHrefWithListReturn(`${pathname}/${id}`, listHref, id));
    },
    [listHref, pathname, router],
  );

  const {
    page,
    pageSize,
    listViewMode,
    search,
    isActiveParam,
    setUrl,
    setPage,
    setPageSize,
    setListViewMode,
  } = useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam) ?? true;

  const [items, setItems] = React.useState<Project[]>([]);
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

  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [projectTypeById, setProjectTypeById] = React.useState<Record<number, ProjectType>>({});

  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletingProject, setDeletingProject] = React.useState<Project | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [togglingId, setTogglingId] = React.useState<number | null>(null);

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
      try {
        const { items } = await fetchProjectTypesPage(1, 500, { is_active: true });
        if (!cancelled) setProjectTypeById(projectTypesById(items));
      } catch {
        if (!cancelled) setProjectTypeById({});
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
        const { items: nextItems, pagination: p } = await fetchProjectsPage(page, pageSize, {
          search: search || undefined,
          is_active: isActiveFilter,
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
  }, [page, pageSize, search, isActiveFilter, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  const projectTypeOptions = React.useMemo(
    () =>
      Object.values(projectTypeById).map((pt) => ({
        value: String(pt.id),
        label: pt.project_type?.trim() || `#${pt.id}`,
      })),
    [projectTypeById],
  );

  const listFilters = React.useMemo(
    () => ({ search: search || undefined, is_active: isActiveFilter }),
    [search, isActiveFilter],
  );

  const massUpdateFields = React.useMemo(
    () =>
      buildProjectMassUpdateFields(
        { clientOptions, projectTypeOptions },
        {
          name: t("table.name"),
          client: t("table.client"),
          projectType: t("table.projectType"),
          description: t("table.description"),
          startDate: t("table.start"),
          endDate: t("table.end"),
          isActive: t("table.status"),
          activeLabel: t("status.active"),
          inactiveLabel: t("status.inactive"),
        },
      ),
    [t, clientOptions, projectTypeOptions],
  );

  const fetchAllIds = React.useCallback(() => fetchAllProjectIds(listFilters), [listFilters]);

  const mass = useEntityListMassActions({
    resource: "projects",
    totalRecords: pagination.total_records,
    pageItems: items,
    fetchAllIds,
    resetDeps: [pageSize, search, isActiveFilter],
    updateFields: massUpdateFields,
    onApplied: () => setRefreshNonce((n) => n + 1),
  });

  const massSel = React.useMemo(() => massSelectionColumn(mass, items.length), [mass, items.length]);

  function openCreate() {
    router.push(`${pathname}/new?back=${encodeURIComponent(listHref)}`);
  }

  function openEdit(row: Project) {
    router.push(`${pathname}/${row.id}/edit?back=${encodeURIComponent(listHref)}`);
  }

  async function handleToggleActive(row: Project, next: boolean) {
    setTogglingId(row.id);
    try {
      await patchProject(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  async function confirmDelete() {
    if (!deletingProject) return;
    setDeleting(true);
    try {
      await deleteProject(deletingProject.id);
      toastSuccess(t("deletedToast"));
      setDeleteOpen(false);
      setDeletingProject(null);
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("deleteError"));
    } finally {
      setDeleting(false);
    }
  }

  function formatDay(iso: string | undefined) {
    if (!iso) return "—";
    const d = iso.slice(0, 10);
    if (!d) return "—";
    try {
      return dateOnlyFmt.format(new Date(`${d}T12:00:00`));
    } catch {
      return "—";
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<Project>();
    return [
      massSel.tableColumn,
      c.primary("name", t("table.name"), (r) => r.name),
      c.text("client", t("table.client"), (r) => projectRowClientLabel(r, clientLabelById)),
      c.custom("projectType", t("table.projectType"), (r) => {
        const chip = resolveProjectTypeChipData(r, projectTypeById);
        return chip ? <ProjectTypeChip row={chip} /> : "—";
      }),
      c.text("start", t("table.start"), (r) => formatDay(r.start_date)),
      c.text("end", t("table.end"), (r) => formatDay(r.end_date)),
      c.truncate(
        "description",
        t("table.description"),
        (r) => (r.description?.trim() ? r.description : "—"),
        {
          title: (r) => r.description?.trim() || undefined,
          maxWidth: "lg",
          headerClassName: "min-w-[8rem]",
          cellClassName: "max-w-[14rem] lg:max-w-xs xl:max-w-md",
        },
      ),
      c.status("status", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive"), {
        responsive: "lg",
      }),
      // c.actions("actions", t("table.actions"), (row) => (
      //   <DataTableRowActionsMenu
      //     menuAriaLabel={tList("openRowActions")}
      //     items={[
      //       { id: "edit", label: t("detail.edit"), icon: Pencil, onSelect: () => openEdit(row) },
      //       {
      //         id: "delete",
      //         label: t("delete"),
      //         icon: Trash2,
      //         tone: "danger",
      //         onSelect: () => {
      //           setDeletingProject(row);
      //           setDeleteOpen(true);
      //         },
      //       },
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
  }, [t, tList, clientLabelById, projectTypeById, togglingId, massSel.tableColumn]);

  const hasActiveFilters = hasListActiveFilters({ search, isActiveParam });
  const countInactive = React.useCallback(async () => {
    const { pagination: p } = await fetchProjectsPage(1, 1, {
      search: search || undefined,
      is_active: false,
    });
    return p.total_records;
  }, [search]);
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
              iconName: "projects",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: <AddButton type="button" onClick={openCreate} />,
            }}
            onClearFilters={() =>
              setUrl({ search: null, is_active: null, page: null }, { replace: true })
            }
            onSwitchToInactive={switchToInactive}
          />
        ) : listViewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => {
                const typeChip = resolveProjectTypeChipData(row, projectTypeById);
                return (
                <ListPageCard
                  key={row.id}
                  dataListRowId={row.id}
                  className={highlightClassName(row.id)}
                  leading={massSel.cardLeading(row)}
                  title={row.name}
                  subtitle={projectRowClientLabel(row, clientLabelById)}
                  meta={`${formatDay(row.start_date)} – ${formatDay(row.end_date)}`}
                  description={row.description?.trim() || undefined}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {typeChip ? <ProjectTypeChip row={typeChip} /> : null}
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
                  onCardClick={() => openProjectDetail(row.id)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        {
                          id: "edit",
                          label: t("detail.edit"),
                          icon: Pencil,
                          onSelect: () => openEdit(row),
                        },
                        {
                          id: "delete",
                          label: t("delete"),
                          icon: Trash2,
                          tone: "danger",
                          onSelect: () => {
                            setDeletingProject(row);
                            setDeleteOpen(true);
                          },
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
              );
              })}
            </ListPageCardGrid>
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => openProjectDetail(row.id)}
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

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => (!deleting ? setDeleteOpen(false) : undefined)}
        onConfirm={() => void confirmDelete()}
        title={t("deleteConfirmTitle")}
        body={t("deleteConfirmBody")}
        highlight={deletingProject?.name}
        confirmLabel={t("confirmDelete")}
        cancelLabel={t("modal.cancel")}
        isBusy={deleting}
      />
    </div>
  );
}
