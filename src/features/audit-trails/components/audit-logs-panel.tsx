"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { fetchAuditTrailsPage } from "@/features/audit-trails/api/audit-trail.api";
import { AuditTrailFieldChangesModal } from "@/features/audit-trails/components/audit-trail-field-changes-modal";
import {
  AUDIT_TRAIL_MODULE_OPTIONS,
} from "@/features/audit-trails/constants/audit-trail-modules";
import type { AuditTrailEntry } from "@/features/audit-trails/types/audit-trail.types";
import {
  auditTrailActionLabel,
  auditTrailActorFromEntry,
  auditTrailHasFieldChanges,
  auditTrailModuleLabel,
  auditTrailOccurredAt,
  auditTrailUserLabel,
  parseAuditTrailFieldChanges,
} from "@/features/audit-trails/utils/audit-trail-display.util";
import {
  auditTrailResourceHref,
  auditTrailResourceLabel,
} from "@/features/audit-trails/utils/audit-trail-resource.util";
import { DetailEntityLink } from "@/shared/components/entity";
import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import {
  CheckmarkSelect,
  DataTablePaginationBar,
  DataTableScroll,
  DataTableTextModeToggle,
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceDateInput,
  SurfaceShell,
  listPageRootClassName,
  listPageSurfaceShellClassName,
  useDataTableTextModeStore,
} from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

type PaginationState = {
  total_records: number;
  total_pages: number;
  current_page: number;
  page_size: number;
  next: string | null;
  previous: string | null;
};

const EMPTY_PAGINATION: PaginationState = {
  total_records: 0,
  total_pages: 1,
  current_page: 1,
  page_size: 20,
  next: null,
  previous: null,
};

function AuditDateFilter({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string | null) => void;
}) {
  return (
    <div className="min-w-0 w-full sm:w-[11.5rem]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <SurfaceDateInput
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value || null)}
        aria-label={label}
        title={label}
        className="h-9 w-full"
      />
    </div>
  );
}

export function AuditLogsPanel() {
  const t = useTranslations("Dashboard.auditTrails");
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
  const textMode = useDataTableTextModeStore((s) => s.textMode);
  const wrap = textMode === "wrap";
  const cellTextClass = wrap ? "whitespace-normal break-words" : "whitespace-nowrap";
  const {
    page,
    pageSize,
    search,
    setUrl,
    setPage,
    setPageSize,
  } = useListUrlState({ defaultPageSize: 20 });

  const moduleFilter = searchParams.get("module") ?? "";
  const actionFilter = searchParams.get("action") ?? "";
  const fromDate = searchParams.get("from") ?? "";
  const toDate = searchParams.get("to") ?? "";
  const hasDateFilter = fromDate.trim() !== "" || toDate.trim() !== "";

  const [items, setItems] = React.useState<AuditTrailEntry[]>([]);
  const [pagination, setPagination] = React.useState<PaginationState>(EMPTY_PAGINATION);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<AuditTrailEntry | null>(null);

  const moduleOptions = React.useMemo(
    () => [
      { value: "", label: t("filters.allModules") },
      ...AUDIT_TRAIL_MODULE_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(`modules.${opt.labelKey}`),
      })),
    ],
    [t],
  );

  const actionOptions = React.useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [{ value: "", label: t("filters.allActions") }];
    for (const row of items) {
      const action = row.action?.trim();
      if (!action || seen.has(action)) continue;
      seen.add(action);
      opts.push({ value: action, label: auditTrailActionLabel(row) || action });
    }
    if (actionFilter && !seen.has(actionFilter)) {
      opts.push({
        value: actionFilter,
        label: actionFilter.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      });
    }
    return opts;
  }, [items, actionFilter, t]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: next, pagination: p } = await fetchAuditTrailsPage(page, pageSize, {
          module: moduleFilter || undefined,
          search: search || undefined,
          action: actionFilter || undefined,
          from: fromDate || undefined,
          to: toDate || undefined,
        });
        if (cancelled) return;
        setItems(next);
        setPagination(p ?? { ...EMPTY_PAGINATION, page_size: pageSize, current_page: page });
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
  }, [page, pageSize, search, moduleFilter, actionFilter, fromDate, toDate, t]);

  const hasActiveFilters =
    search.trim() !== "" ||
    moduleFilter.trim() !== "" ||
    actionFilter.trim() !== "" ||
    fromDate.trim() !== "" ||
    toDate.trim() !== "";
  const { hideListChrome, listLoading, emptyStateKind, filtersActive } = useSimpleListEmptyState({
    loading,
    loadError,
    itemsLength: items.length,
    hasActiveFilters,
  });
  const pageRange = getListPageRange(pagination);
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  function updateFilter(patch: Record<string, string | null>) {
    setUrl({ page: null, ...patch }, { replace: true });
  }

  function clearFilters() {
    setUrl(
      { search: null, module: null, action: null, from: null, to: null, page: null },
      { replace: true },
    );
  }

  const commitSearch = React.useCallback(
    (q: string) => {
      setUrl({ search: q.trim() || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  return (
    <div className={listPageRootClassName()}>
      {!hideListChrome ? (
        <ListPageHeader
          filtersActive={filtersActive}
          title={t("title")}
          showViewToggle={false}
          controls={
            <div className="flex min-w-0 w-full flex-col gap-3">
              <ListPageSearchField
                value={search}
                onCommit={commitSearch}
                className="sm:max-w-md"
              />
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <CheckmarkSelect
                  listLabel={t("filters.module")}
                  buttonAriaLabel={t("filters.module")}
                  options={moduleOptions}
                  value={moduleFilter}
                  emptyLabel={t("filters.allModules")}
                  portaled
                  searchable
                  clearable
                  className="w-full min-w-0 sm:w-44"
                  onChange={(v) => updateFilter({ module: v || null })}
                />
                <CheckmarkSelect
                  listLabel={t("filters.action")}
                  buttonAriaLabel={t("filters.action")}
                  options={actionOptions}
                  value={actionFilter}
                  emptyLabel={t("filters.allActions")}
                  portaled
                  searchable
                  clearable
                  className="w-full min-w-0 sm:w-44"
                  onChange={(v) => updateFilter({ action: v || null })}
                />
                <AuditDateFilter
                  id="audit-from-date"
                  label={t("filters.fromDate")}
                  value={fromDate}
                  onChange={(v) => updateFilter({ from: v })}
                />
                <AuditDateFilter
                  id="audit-to-date"
                  label={t("filters.toDate")}
                  value={toDate}
                  onChange={(v) => updateFilter({ to: v })}
                />
                {hasDateFilter ? (
                  <button
                    type="button"
                    onClick={() => updateFilter({ from: null, to: null })}
                    className="shrink-0 text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {t("filters.clearDates")}
                  </button>
                ) : null}
              </div>
            </div>
          }
        />
      ) : null}

      <SurfaceShell className={listPageSurfaceShellClassName(hideListChrome)}>
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : listLoading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "auditLogs",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="pointer-events-none absolute right-4 top-1.5 z-30 sm:right-5 sm:top-2">
              <div className="pointer-events-auto rounded-md bg-slate-100/95 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm dark:bg-slate-800/95 dark:ring-slate-700">
                <DataTableTextModeToggle variant="header" className="shrink-0" />
              </div>
            </div>
            <DataTableScroll className="min-h-0 flex-1">
              <table
                className="w-full min-w-max border-collapse table-auto text-left text-sm"
              >
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-6">{t("table.when")}</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-6">{t("table.changedBy")}</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-6">{t("table.action")}</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-6">{t("table.resource")}</th>
                    <th className="whitespace-nowrap px-4 py-3 sm:px-6">{t("table.module")}</th>
                    <th className="whitespace-nowrap px-4 py-3 pr-12 sm:px-6">{t("table.changes")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((row, index) => {
                    const actor = auditTrailActorFromEntry(row);
                    const actorName = auditTrailUserLabel(actor) ?? t("unknownUser");
                    const when = auditTrailOccurredAt(row);
                    const action = auditTrailActionLabel(row) || "—";
                    const moduleLabel = auditTrailModuleLabel(row) || "—";
                    const resourceHref = auditTrailResourceHref(row);
                    const resourceLabel = auditTrailResourceLabel(row);
                    const changeCount = parseAuditTrailFieldChanges(row.changes).length;
                    const hasChanges = auditTrailHasFieldChanges(row);
                    const ip = row.ip_address?.trim();

                    return (
                      <tr key={`${row.id ?? "row"}-${index}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200 sm:px-6">
                          {when ? formatFlexibleApiDate(when, dateFmt) : "—"}
                        </td>
                        <td className={cn("px-4 py-3 sm:px-6", cellTextClass)}>
                          <p className={cn("font-medium text-slate-900 dark:text-slate-50", cellTextClass)}>
                            {actorName}
                          </p>
                          {ip ? (
                            <p className={cn("text-xs text-slate-400", cellTextClass)}>
                              {t("table.ip", { ip })}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 sm:px-6">
                          <span
                            className={cn(
                              "inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                              cellTextClass,
                            )}
                          >
                            {action}
                          </span>
                        </td>
                        <td className={cn("px-4 py-3 sm:px-6", cellTextClass)}>
                          {resourceHref ? (
                            <DetailEntityLink href={resourceHref} className={cn("font-medium", cellTextClass)}>
                              {resourceLabel}
                            </DetailEntityLink>
                          ) : (
                            <span className={cn("block text-slate-700 dark:text-slate-200", cellTextClass)}>
                              {resourceLabel}
                            </span>
                          )}
                        </td>
                        <td className={cn("px-4 py-3 text-slate-700 dark:text-slate-200 sm:px-6", cellTextClass)}>
                          {moduleLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 pr-12 sm:px-6">
                          {hasChanges ? (
                            <button
                              type="button"
                              className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
                              onClick={() => setSelected(row)}
                            >
                              {t("table.viewChanges", { count: changeCount })}
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTableScroll>
          </div>
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
              label: t("rowsPerPage"),
              listLabel: t("rowsPerPage"),
              value: pageSize,
              options: pageSizeOptions,
              onChange: setPageSize,
              disabled: loading,
            }}
          />
        ) : null}
      </SurfaceShell>

      <AuditTrailFieldChangesModal
        entry={selected}
        dateFmt={dateFmt}
        open={selected != null}
        onClose={() => setSelected(null)}
        onOpenRecord={
          selected
            ? () => {
                const href = auditTrailResourceHref(selected);
                if (href) {
                  setSelected(null);
                  router.push(href);
                }
              }
            : undefined
        }
      />
    </div>
  );
}
