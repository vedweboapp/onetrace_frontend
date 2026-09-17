"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { fetchAuditTrailsPage } from "@/features/audit-trails/api/audit-trail.api";
import { AuditTrailFieldChangesModal } from "@/features/audit-trails/components/audit-trail-field-changes-modal";
import { ExpandableClampText } from "@/features/audit-trails/components/expandable-clamp-text";
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
  ListPageEmptyStates,
  ListPageHeader,
  ListPageSearchField,
  SurfaceShell,
  listPageRootClassName,
  listPageSurfaceShellClassName,
  surfaceInputClassName,
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

export function AuditLogsPanel() {
  const t = useTranslations("Dashboard.auditTrails");
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat();
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
                placeholder={t("searchPlaceholder")}
                ariaLabel={t("searchAria")}
                className="sm:max-w-md"
              />
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
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
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500 sm:w-40">
                  <span>{t("filters.fromDate")}</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => updateFilter({ from: e.target.value || null })}
                    className={cn(surfaceInputClassName, "h-9")}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-slate-500 sm:w-40">
                  <span>{t("filters.toDate")}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => updateFilter({ to: e.target.value || null })}
                    className={cn(surfaceInputClassName, "h-9")}
                  />
                </label>
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
              iconName: "jobStatus",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
            }}
            onClearFilters={clearFilters}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[56rem] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 sm:px-6">{t("table.when")}</th>
                  <th className="px-4 py-3 sm:px-6">{t("table.changedBy")}</th>
                  <th className="px-4 py-3 sm:px-6">{t("table.action")}</th>
                  <th className="px-4 py-3 sm:px-6">{t("table.resource")}</th>
                  <th className="px-4 py-3 sm:px-6">{t("table.module")}</th>
                  <th className="px-4 py-3 sm:px-6">{t("table.changes")}</th>
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
                      <td className="px-4 py-3 sm:px-6">
                        <p className="font-medium text-slate-900 dark:text-slate-50">{actorName}</p>
                        {ip ? (
                          <p className="text-xs text-slate-400">{t("table.ip", { ip })}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
                        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {action}
                        </span>
                      </td>
                      <td className="max-w-[16rem] px-4 py-3 sm:px-6">
                        {resourceHref ? (
                          <DetailEntityLink href={resourceHref} className="font-medium">
                            <span className="line-clamp-2 break-words [overflow-wrap:anywhere]">
                              {resourceLabel}
                            </span>
                          </DetailEntityLink>
                        ) : (
                          <ExpandableClampText
                            clampClassName="line-clamp-2"
                            className="text-slate-700 dark:text-slate-200"
                            expandLabel={t("timeline.showMore")}
                            collapseLabel={t("timeline.showLess")}
                          >
                            {resourceLabel}
                          </ExpandableClampText>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200 sm:px-6">
                        {moduleLabel}
                      </td>
                      <td className="px-4 py-3 sm:px-6">
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
