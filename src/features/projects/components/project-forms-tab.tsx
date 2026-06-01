"use client";

import * as React from "react";
import { LayoutGrid, List, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { patchForm } from "@/features/forms/api/forms.api";
import { fetchProject, fetchProjectFormsPage } from "@/features/projects/api/project.api";
import type { FormListItem } from "@/features/forms/types/form.types";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { cn } from "@/core/utils/http.util";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import {
  ActiveStatusBadge,
  AppButton,
  AppModal,
  CheckmarkSelect,
  DataTablePaginationBar,
  DataTableRowActionsMenu,
  ListPageCard,
  ListPageCardGrid,
  ListPageSearchField,
  SurfaceShell,
} from "@/shared/ui";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

type ViewMode = "list" | "table";
type ActiveFilter = "" | "true" | "false";

function parseViewParam(value: string | null): ViewMode {
  return value === "table" ? "table" : "list";
}

function projectTypeLabel(value: FormListItem["project_type"]): string {
  if (!value) return "—";
  if (typeof value === "number") return `#${value}`;
  const label = value.project_type?.trim();
  return label || `#${value.id}`;
}

function userLabel(user: FormListItem["created_by"]): string {
  if (!user) return "—";
  return user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

export function ProjectFormsTab() {
  const t = useTranslations("Dashboard.projects.formsTab");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();

  const projectId = params.id;

  const viewMode = React.useMemo<ViewMode>(() => parseViewParam(searchParams.get("projectFormsView")), [searchParams]);

  function setViewMode(next: ViewMode) {
    const p = new URLSearchParams(searchParams.toString());
    if (next === "list") p.delete("projectFormsView");
    else p.set("projectFormsView", "table");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [search, setSearch] = React.useState("");
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("");

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
  const [items, setItems] = React.useState<FormListItem[]>([]);
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

  const [projectTypeModalOpen, setProjectTypeModalOpen] = React.useState(false);
  const [projectTypes, setProjectTypes] = React.useState<ProjectType[]>([]);
  const [projectTypesLoading, setProjectTypesLoading] = React.useState(false);
  const [projectTypesError, setProjectTypesError] = React.useState<string | null>(null);
  const [selectedProjectTypeId, setSelectedProjectTypeId] = React.useState<number | null>(null);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const pageRange = getListPageRange(pagination);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
    setPage(1);
  }, []);

  React.useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: rows, pagination: p } = await fetchProjectFormsPage(
          Number(projectId),
          page,
          pageSize,
          {
            search: search || undefined,
            is_active: activeFilter === "" ? undefined : activeFilter === "true",
          }
        );
        if (!cancelled) {
          setItems(rows);
          setPagination(p);
        }
      } catch (err) {
        console.error("Failed to fetch project forms:", err);
        if (!cancelled) {
          setItems([]);
          setLoadError(t("loadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, page, pageSize, search, activeFilter, refreshNonce, t]);

  React.useEffect(() => {
    if (!projectTypeModalOpen) return;
    let cancelled = false;
    (async () => {
      setProjectTypesLoading(true);
      setProjectTypesError(null);
      try {
        const { items: rows } = await fetchProjectTypesPage(1, 100, { is_active: true });
        if (!cancelled) setProjectTypes(rows);
      } catch {
        if (!cancelled) {
          setProjectTypes([]);
          setProjectTypesError(t("projectTypesLoadError"));
        }
      } finally {
        if (!cancelled) setProjectTypesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectTypeModalOpen, t]);

  function openEdit(row: FormListItem) {
    router.push(`/dashboard/projects/${projectId}/job-forms?purpose=edit_project_job_form&layout_id=${row.id}`);
  }
  const openCreate = () => {
    router.push(`/dashboard/projects/${projectId}/job-forms?purpose=create_project_job_form`);
  }
  async function handleToggleActive(row: FormListItem, next: boolean) {
    setTogglingId(row.id);
    try {
      await patchForm(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }

  const tableColumns = React.useMemo(() => {
    const c = entityCol<FormListItem>();
    return [
      c.primary("name", t("table.name"), (r) => r.name),
      c.text("projectType", t("table.projectType"), (r) => projectTypeLabel(r.project_type), {
        responsive: "md",
      }),
      c.status("status", t("table.status"), (r) => !!r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">
              {row.created_at ? dateFmt.format(new Date(row.created_at)) : "—"}
            </span>
            {userLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">{userLabel(row.created_by)}</span>
            ) : null}
          </>
        ),
        { responsive: "sm" },
      ),
      c.actions("actions", t("table.actions"), (row) => (
        <DataTableRowActionsMenu
          menuAriaLabel={tList("openRowActions")}
          items={[
            { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
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
  }, [dateFmt, t, tList, togglingId]);

  const viewToggle = (
    <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setViewMode("list")}
        title={tList("tableView")}
        aria-label={tList("tableView")}
        aria-pressed={viewMode === "list"}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md transition",
          viewMode === "list"
            ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewMode("table")}
        title={tList("listView")}
        aria-label={tList("listView")}
        aria-pressed={viewMode === "table"}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md transition",
          viewMode === "table"
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        )}
      >
        <List className="size-4" />
      </button>
    </div>
  );

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <AppButton
          type="button"
          size="sm"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          {t("add")}
        </AppButton>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 w-full flex-col gap-3 sm:flex-row sm:items-center">
          <ListPageSearchField
            value={search}
            onCommit={commitSearch}
            placeholder={t("searchPlaceholder")}
            ariaLabel={t("searchAria")}
            className="sm:max-w-md"
          />
          <CheckmarkSelect
            listLabel={t("filterState")}
            buttonAriaLabel={t("filterState")}
            options={[
              { value: "", label: t("filterAll") },
              { value: "true", label: t("status.active") },
              { value: "false", label: t("status.inactive") },
            ]}
            value={activeFilter}
            onChange={(v) => {
              setActiveFilter((v || "") as ActiveFilter);
              setPage(1);
            }}
            className="w-full sm:w-52"
            clearable
            clearAriaLabel={tList("clearFilter")}
          />
        </div>
        {viewToggle}
      </div>

      <SurfaceShell className="rounded-none border-0">
        {loadError ? (
          <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">{loadError}</p>
        ) : loading ? (
          viewMode === "list" ? (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="h-36 animate-pulse rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 px-4 py-6 sm:px-6">
              <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
              <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
            </div>
          )
        ) : items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6">{t("empty")}</p>
        ) : viewMode === "list" ? (
          <div className="p-4 sm:p-6">
            <ListPageCardGrid>
              {items.map((row) => (
                <ListPageCard
                  key={row.id}
                  title={row.name}
                  subtitle={projectTypeLabel(row.project_type)}
                  footer={
                    <div className="flex w-full flex-wrap items-center justify-between gap-3">
                      <ActiveStatusBadge
                        active={!!row.is_active}
                        label={row.is_active ? t("status.active") : t("status.inactive")}
                      />
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {row.created_at ? tList("cardCreated", { date: dateFmt.format(new Date(row.created_at)) }) : "—"}
                      </span>
                    </div>
                  }
                  onCardClick={() => openEdit(row)}
                  menu={
                    <DataTableRowActionsMenu
                      menuAriaLabel={tList("openRowActions")}
                      items={[
                        { id: "edit", label: t("edit"), icon: Pencil, onSelect: () => openEdit(row) },
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
          <EntityDataTable columns={tableColumns} rows={items} onRowClick={openEdit} />
        )}

        {!loading && !loadError && items.length > 0 ? (
          <div className="border-t border-slate-200 dark:border-slate-800">
            <DataTablePaginationBar
              pagination={pagination}
              summary={t("pageLabel", {
                start: pageRange.start,
                end: pageRange.end,
                total: pagination.total_records,
              })}
              prevLabel={t("prev")}
              nextLabel={t("next")}
              onPrev={() => setPage((p) => Math.max(1, p - 1))}
              onNext={() => setPage((p) => p + 1)}
              onPageSelect={setPage}
              pageSizeControl={{
                label: tList("rowsPerPage"),
                listLabel: tList("rowsPerPage"),
                value: pageSize,
                options: pageSizeOptions,
                onChange: (next) => {
                  setPageSize(next);
                  setPage(1);
                },
                disabled: loading,
              }}
            />
          </div>
        ) : null}
      </SurfaceShell>
    </div>
  );
}

