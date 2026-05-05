"use client";

import * as React from "react";
import { Plus, Power, PowerOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchProjectsPage, patchProject } from "@/features/projects/api/project.api";
import { ProjectFormModal } from "@/features/projects/components/project-form-modal";
import type { Project } from "@/features/projects/types/project.types";
import { cn } from "@/core/utils/http.util";
import { routes } from "@/shared/config/routes";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { parseIsActiveParam, useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  CheckmarkSelect,
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  ListPageSearchField,
  SurfaceShell,
  TableIconActionButton,
  TableRowActions,
} from "@/shared/ui";

export function ProjectsPanel() {
  const t = useTranslations("Dashboard.projects");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const router = useRouter();

  const { page, search, isActiveParam, setUrl, setPage } = useListUrlState();
  const isActiveFilter = parseIsActiveParam(isActiveParam);

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

  const [formOpen, setFormOpen] = React.useState(false);

  const [togglingId, setTogglingId] = React.useState<number | null>(null);

  const stateFilterOptions = React.useMemo(
    () => [
      { value: "", label: t("filterAll") },
      { value: "true", label: t("status.active") },
      { value: "false", label: t("status.inactive") },
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
        const { items: clients } = await fetchClientsPage(1, 500);
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
        const { items: nextItems, pagination: p } = await fetchProjectsPage(page, 20, {
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
  }, [page, search, isActiveFilter, refreshNonce, t]);

  const clientLabelById = React.useMemo(() => {
    const m: Record<number, string> = {};
    for (const o of clientOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [clientOptions]);

  function openCreate() {
    setFormOpen(true);
  }

  function handleFormSaved() {
    setRefreshNonce((n) => n + 1);
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

  const dateFmt = React.useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "es" ? "es" : "en", {
        dateStyle: "medium",
      }),
    [locale],
  );

  function formatDay(iso: string | undefined) {
    if (!iso) return "—";
    const d = iso.slice(0, 10);
    if (!d) return "—";
    try {
      return dateFmt.format(new Date(`${d}T12:00:00`));
    } catch {
      return "—";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
          <ListPageSearchField
            value={search}
            onCommit={commitSearch}
            placeholder={tList("searchPlaceholder")}
            ariaLabel={tList("searchAria")}
          />
          <div className="min-w-0 sm:w-52">
            <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t("filterState")}
            </span>
            <CheckmarkSelect
              listLabel={t("filterState")}
              options={stateFilterOptions}
              value={isActiveParam ?? ""}
              emptyLabel={t("filterAll")}
              portaled
              className="w-full"
              onChange={(v) => setUrl({ is_active: v || null, page: null })}
            />
          </div>
        </div>
        <AppButton type="button" variant="primary" size="md" onClick={openCreate} className="shrink-0 gap-2 self-start lg:self-center">
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("add")}
        </AppButton>
      </div>

      <SurfaceShell>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  <DataTableTh>{t("table.name")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.client")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.start")}</DataTableTh>
                  <DataTableTh className="hidden sm:table-cell">{t("table.end")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.status")}</DataTableTh>
                  <DataTableTh className="hidden lg:table-cell">{t("table.activeState")}</DataTableTh>
                  <DataTableTh className="hidden xl:table-cell">{t("table.created")}</DataTableTh>
                  <DataTableTh narrow>{t("table.actions")}</DataTableTh>
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.length === 0 ? (
                  <DataTableEmptyRow message={t("empty")} colSpan={8} />
                ) : (
                  items.map((row) => (
                    <DataTableRow
                      key={row.id}
                      clickable
                      onClick={() => router.push(`${routes.dashboard.projects}/${row.id}`)}
                    >
                      <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">{row.name}</DataTableTd>
                      <DataTableTd className="hidden text-slate-700 dark:text-slate-300 md:table-cell">
                        {clientLabelById[row.client] ?? `#${row.client}`}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 sm:table-cell">
                        {formatDay(row.start_date)}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 sm:table-cell">
                        {formatDay(row.end_date)}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 lg:table-cell">
                        <span className="capitalize">{row.status}</span>
                      </DataTableTd>
                      <DataTableTd className="hidden lg:table-cell">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                            row.is_active
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                              : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {row.is_active ? t("status.active") : t("status.inactive")}
                        </span>
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-500 dark:text-slate-400 xl:table-cell">
                        {dateFmt.format(new Date(row.created_at))}
                      </DataTableTd>
                      <DataTableTd
                        narrow
                        className="w-24 align-middle"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <TableRowActions>
                          {row.is_active ? (
                            <TableIconActionButton
                              label={t("deactivate")}
                              variant="secondary"
                              loading={togglingId === row.id}
                              className="text-slate-700 dark:text-slate-200"
                              onClick={() => void handleToggleActive(row, false)}
                              icon={<PowerOff strokeWidth={2} />}
                            />
                          ) : (
                            <TableIconActionButton
                              label={t("activate")}
                              variant="secondary"
                              loading={togglingId === row.id}
                              className="text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                              onClick={() => void handleToggleActive(row, true)}
                              icon={<Power strokeWidth={2} />}
                            />
                          )}
                        </TableRowActions>
                      </DataTableTd>
                    </DataTableRow>
                  ))
                )}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", {
              current: pagination.current_page,
              total: pagination.total_pages,
              count: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
            onNext={() => setPage(pagination.current_page + 1)}
          />
        ) : null}
      </SurfaceShell>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        mode="create"
        project={null}
        clientOptions={clientOptions}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
