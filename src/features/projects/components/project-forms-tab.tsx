"use client";

import * as React from "react";
import { LayoutGrid, List, Pencil, Plus, Power, PowerOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useParams, useSearchParams } from "next/navigation";
import { fetchFormsPage } from "@/features/forms/api/forms.api";
import { updateProjectJobForm } from "@/features/projects/api/project-job-form.api";
import { fetchProject, fetchProjectFormsPage, updateProject } from "@/features/projects/api/project.api";
import type { FormListItem } from "@/features/forms/types/form.types";
import { cn } from "@/core/utils/http.util";
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
  MultiCheckSelect,
  SurfaceShell,
} from "@/shared/ui";
import { getProjectTypeId } from "@/features/projects/utils/project-type-id.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";

type ViewMode = "list" | "table";
type ActiveFilter = "true" | "false";

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
  const [activeFilter, setActiveFilter] = React.useState<ActiveFilter>("true");

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

  const [assignOpen, setAssignOpen] = React.useState(false);
  const [assignLoading, setAssignLoading] = React.useState(false);
  const [assignSaving, setAssignSaving] = React.useState(false);
  const [assignError, setAssignError] = React.useState<string | null>(null);
  const [assignFormOptions, setAssignFormOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [selectedFormIds, setSelectedFormIds] = React.useState<string[]>([]);

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
            is_active: activeFilter === "true",
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
    if (!assignOpen || !projectId) return;
    let cancelled = false;
    (async () => {
      setAssignLoading(true);
      setAssignError(null);
      setAssignFormOptions([]);
      try {
        const project = await fetchProject(Number(projectId));
        const projectTypeId = getProjectTypeId(project);
        if (!projectTypeId) {
          if (!cancelled) {
            setSelectedFormIds([]);
            setAssignError(t("projectTypeMissingError"));
          }
          return;
        }
        const { items: forms } = await fetchFormsPage(1, 500, { project_type: projectTypeId }, { silent: true });
        if (!cancelled) {
          const assignedIds = Array.isArray(project.form_ids)
            ? project.form_ids
            : Array.isArray(project.forms)
              ? project.forms
                .map((form) => (typeof form === "number" ? form : form?.id))
                .filter((id): id is number => Number.isFinite(id) && id > 0)
              : [];
          setSelectedFormIds(assignedIds.map(String));
          setAssignFormOptions(forms.map((form) => ({ value: String(form.id), label: form.name })));
        }
      } catch {
        if (!cancelled) setAssignError(t("assignLoadError"));
      } finally {
        if (!cancelled) setAssignLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignOpen, projectId, t]);

  const openEdit = React.useCallback((row: FormListItem) => {
    router.push(`/projects/${projectId}/job-forms?purpose=edit_project_job_form&layout_id=${row.id}`);
  }, [projectId, router]);

  const openCreate = () => {
    setAssignOpen(true);
  };

  async function handleSaveAssignedForms() {
    if (!projectId) return;
    setAssignSaving(true);
    try {
      const form_ids = selectedFormIds
        .map((raw) => Number.parseInt(raw, 10))
        .filter((id) => Number.isFinite(id) && id > 0);
      await updateProject(Number(projectId), { form_ids });
      toastSuccess(t("assignedToast"));
      setAssignOpen(false);
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("assignSaveError"));
    } finally {
      setAssignSaving(false);
    }
  }
  const handleToggleActive = React.useCallback(async (row: FormListItem, next: boolean) => {
    setTogglingId(row.id);
    try {
      await updateProjectJobForm(row.id, { is_active: next });
      toastSuccess(next ? t("activatedToast") : t("deactivatedToast"));
      setRefreshNonce((n) => n + 1);
    } catch {
      toastError(t("toggleActiveError"));
    } finally {
      setTogglingId(null);
    }
  }, [t]);

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
  }, [dateFmt, handleToggleActive, openEdit, t, tList, togglingId]);

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
          {t("assign")}
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
            emptyLabel={t("status.active")}
            options={[
              { value: "true", label: t("status.active") },
              { value: "false", label: t("status.inactive") },
            ]}
            value={activeFilter}
            onChange={(v) => {
              setActiveFilter(v === "false" ? "false" : "true");
              setPage(1);
            }}
            className="w-full sm:w-52"
            portaled
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
                  subtitle={
                    <span>
                      Project Type:{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        {projectTypeLabel(row.project_type)}
                      </span>
                    </span>
                  }
                  installationType={
                    <span>
                      Installation Type:{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        {row.installation_type?.installation_type || "—"}
                      </span>
                    </span>
                  }
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
      <AppModal
        open={assignOpen}
        onClose={() => (!assignSaving ? setAssignOpen(false) : undefined)}
        title={t("assignModalTitle")}
        description={t("assignModalDescription")}
        size="lg"
        isBusy={assignSaving}
        footer={
          <>
            <AppButton
              type="button"
              variant="secondary"
              disabled={assignSaving}
              onClick={() => setAssignOpen(false)}
            >
              {t("cancel")}
            </AppButton>
            <AppButton
              type="button"
              variant="primary"
              loading={assignSaving}
              disabled={assignLoading || !!assignError}
              onClick={() => void handleSaveAssignedForms()}
            >
              {t("saveAssigned")}
            </AppButton>
          </>
        }
      >
        {assignLoading ? (
          <div className="space-y-3">
            <div className="h-11 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : assignError ? (
          <p className="text-sm text-red-600 dark:text-red-400">{assignError}</p>
        ) : (
          <div className="space-y-2">
            <MultiCheckSelect
              id="project-assign-form-ids"
              options={assignFormOptions}
              values={selectedFormIds}
              onChange={setSelectedFormIds}
              disabled={assignSaving || assignFormOptions.length === 0}
              placeholder={t("assignPlaceholder")}
              listLabel={t("assignListLabel")}
            />
            {assignFormOptions.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("assignEmpty")}</p>
            ) : null}
          </div>
        )}
      </AppModal>
    </div>
  );
}

