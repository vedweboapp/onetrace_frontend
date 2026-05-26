"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import {
  AppButton,
  DataTablePaginationBar,
  SurfaceShell,
  ListPageSearchField,
  DetailPanel,
  FieldGroup,
  ActiveStatusBadge,
} from "@/shared/ui";
import { useRouter } from "@/i18n/navigation";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import {
  formatProjectTypeLabel,
  projectTypeBgHex,
  projectTypeTextHex,
} from "@/features/project-types/utils/project-type-display.util";
import { routes } from "@/shared/config/routes";

function projectTypeUserLabel(user: ProjectType["created_by"]): string {
  if (!user) return "—";
  const name = user.username?.trim();
  if (name) return name;
  const email = user.email?.trim();
  if (email) return email;
  return `#${user.id}`;
}

const ProjectFormDetails = () => {
  const t = useTranslations("Dashboard.projectTypes");
  const tList = useTranslations("Dashboard.list");
  const dateFmt = useDashboardDateFormat();
  const router = useRouter();

  const { page, pageSize, search, setUrl, setPage, setPageSize } = useListUrlState();

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);
  const commitSearch = React.useCallback(
    (q: string | null) => {
      const trimmed = q?.trim() || "";
      setUrl({ search: trimmed || null, page: null }, { replace: true });
    },
    [setUrl],
  );

  const [items, setItems] = React.useState<ProjectType[]>([]);
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
  const [detailRow, setDetailRow] = React.useState<ProjectType | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchProjectTypesPage(page, pageSize, {
          search: search || undefined,
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
  }, [page, pageSize, search, t]);

  const pageRange = getListPageRange(pagination);

  const tableColumns = React.useMemo(() => {
    const c = entityCol<ProjectType>();
    return [
      c.custom("type", t("table.type"), (row) => <ProjectTypeChip row={row} />),
      c.status("recordStatus", t("table.status"), (r) => r.is_active, t("status.active"), t("status.inactive")),
      c.custom(
        "created",
        t("table.created"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(row.created_at))}</span>
            {projectTypeUserLabel(row.created_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {projectTypeUserLabel(row.created_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "sm" },
      ),
      c.custom(
        "updated",
        t("table.updated"),
        (row) => (
          <>
            <span className="block text-slate-500 dark:text-slate-400">{dateFmt.format(new Date(row.modified_at))}</span>
            {projectTypeUserLabel(row.modified_by) !== "—" ? (
              <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                {projectTypeUserLabel(row.modified_by)}
              </span>
            ) : null}
          </>
        ),
        { responsive: "md" },
      ),
    ];
  }, [t, dateFmt]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder="Search project types"
          ariaLabel="Search project types"
        />
        <AppButton className="ml-4" onClick={() => router.push(routes.dashboard.settingsProjectTypes)}>
          Create new project type
        </AppButton>
      </div>

      <SurfaceShell className="rounded-none">
        {loadError ? (
          <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">{loadError}</p>
        ) : loading ? (
          <div className="space-y-2 p-6">
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {tList("noResultsTitle")}
          </div>
        ) : (
          <EntityDataTable
            columns={tableColumns}
            rows={items}
            onRowClick={(row) => router.push(`${routes.dashboard.settingsProjectForms}/${row.id}/form-list`)}
          />
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            pagination={pagination}
            summary={t("pageLabel", { start: pageRange.start, end: pageRange.end, total: pagination.total_records })}
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

      <DetailPanel
        open={detailRow !== null}
        onClose={() => setDetailRow(null)}
        title={detailRow ? <ProjectTypeChip row={detailRow} className="text-base font-semibold" /> : null}
        subtitle={
          detailRow ? (
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {t("detail.idLabel", { id: detailRow.id })}
            </span>
          ) : undefined
        }
        footer={
          detailRow ? (
            <>
              <AppButton type="button" variant="secondary" size="sm" onClick={() => setDetailRow(null)}>
                {t("modal.cancel")}
              </AppButton>
              <AppButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => {
                  setDetailRow(null);
                  router.push(routes.dashboard.settingsProjectTypes);
                }}
              >
                {t("edit")}
              </AppButton>
            </>
          ) : undefined
        }
      >
        {detailRow ? (
          <div className="space-y-5">
            <FieldGroup label={t("table.type")}>
              <p className="text-sm text-slate-800 dark:text-slate-200">{formatProjectTypeLabel(detailRow)}</p>
            </FieldGroup>
            <FieldGroup label={t("table.status")}>
              <ActiveStatusBadge
                active={detailRow.is_active}
                label={detailRow.is_active ? t("status.active") : t("status.inactive")}
              />
            </FieldGroup>
            <FieldGroup label={t("modal.bgColour")}>
              <div className="flex items-center gap-3">
                <span
                  className="size-8 shrink-0 rounded-none border border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: projectTypeBgHex(detailRow) }}
                  aria-hidden
                />
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {projectTypeBgHex(detailRow).toUpperCase()}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t("modal.textColour")}>
              <div className="flex items-center gap-3">
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-none border border-slate-200 text-xs font-bold dark:border-slate-600"
                  style={{ backgroundColor: projectTypeBgHex(detailRow), color: projectTypeTextHex(detailRow) }}
                  aria-hidden
                >
                  Aa
                </span>
                <p className="font-mono text-sm text-slate-700 dark:text-slate-200">
                  {projectTypeTextHex(detailRow).toUpperCase()}
                </p>
              </div>
            </FieldGroup>
            <FieldGroup label={t("detail.createdAt")}>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {dateFmt.format(new Date(detailRow.created_at))}
              </p>
              {projectTypeUserLabel(detailRow.created_by) !== "—" ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("detail.byUser", { user: projectTypeUserLabel(detailRow.created_by) })}
                </p>
              ) : null}
            </FieldGroup>
            <FieldGroup label={t("detail.updatedAt")}>
              <p className="text-sm text-slate-800 dark:text-slate-200">
                {dateFmt.format(new Date(detailRow.modified_at))}
              </p>
              {projectTypeUserLabel(detailRow.modified_by) !== "—" ? (
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {t("detail.byUser", { user: projectTypeUserLabel(detailRow.modified_by) })}
                </p>
              ) : null}
            </FieldGroup>
          </div>
        ) : null}
      </DetailPanel>
    </div>
  );
};

export default ProjectFormDetails;
