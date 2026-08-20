"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { ProjectTypeChip } from "@/features/project-types/components/project-type-chip";
import { fetchProjectsPage } from "@/features/projects/api/project.api";
import type { Project } from "@/features/projects/types/project.types";
import { resolveProjectTypeChipData } from "@/features/projects/utils/project-type-id.util";
import {
  EntityDataTable,
  EntityDetailTabLoadingState,
  entityCol,
} from "@/shared/components/entity";
import { DetailTabListShell } from "@/shared/components/layout/detail-tab-list-shell";
import { detailTabToolbarClassName } from "@/shared/components/layout/detail-tab-layout";
import { routes } from "@/shared/config/routes";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useQuickCreateReturn } from "@/shared/hooks/use-quick-create-return";
import { buildDetailHrefWithListReturn, buildEntityDetailTabBackHref } from "@/shared/utils/detail-from-list.util";
import { buildQuickCreateNavigateHref } from "@/shared/utils/quick-create-navigation.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { AddButton, DataTablePaginationBar, ListPageEmptyStates } from "@/shared/ui";

function formatProjectDay(iso: string | undefined, dateFmt: Intl.DateTimeFormat): string {
  if (!iso) return "—";
  const d = iso.slice(0, 10);
  if (!d) return "—";
  try {
    return dateFmt.format(new Date(`${d}T12:00:00`));
  } catch {
    return "—";
  }
}

type Props = {
  clientId: number;
};

export function ClientProjectsTab({ clientId }: Props) {
  const t = useTranslations("Dashboard.clients");
  const tProjects = useTranslations("Dashboard.projects");
  const tList = useTranslations("Dashboard.list");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dateFmt = useDashboardDateFormat({ dateOnly: true });
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(20);
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
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const returnTo = React.useMemo(
    () => buildEntityDetailTabBackHref(pathname, "projects", searchParams),
    [pathname, searchParams],
  );

  const columns = React.useMemo(() => {
    const c = entityCol<Project>();
    return [
      c.primary("name", tProjects("table.name"), (r) => r.name),
      c.custom("projectType", tProjects("table.projectType"), (r) => {
        const chip = resolveProjectTypeChipData(r, {});
        return chip ? <ProjectTypeChip row={chip} /> : "—";
      }),
      c.text("start", tProjects("table.start"), (r) => formatProjectDay(r.start_date, dateFmt)),
      c.text("end", tProjects("table.end"), (r) => formatProjectDay(r.end_date, dateFmt)),
      c.custom("status", tProjects("table.status"), (r) => {
        const ps = r.project_status;
        if (ps && typeof ps === "object" && ps.name?.trim()) {
          return (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                backgroundColor: ps.bg_color || "#e2e8f0",
                color: ps.text_color || "#475569",
              }}
            >
              {ps.name.trim()}
            </span>
          );
        }
        return <span className="text-slate-400 dark:text-slate-500">—</span>;
      }),
    ];
  }, [tProjects, dateFmt]);

  const reloadList = React.useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useQuickCreateReturn({
    onApplySelect: () => reloadList(),
  });

  const openCreateProject = React.useCallback(() => {
    router.push(buildQuickCreateNavigateHref("project", { returnTo, clientId }));
  }, [router, returnTo, clientId]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: nextItems, pagination: p } = await fetchProjectsPage(page, pageSize, {
          client: clientId,
        });
        if (!cancelled) {
          setItems(nextItems);
          setPagination(p);
        }
      } catch {
        if (!cancelled) {
          setLoadError(tProjects("loadError"));
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId, page, pageSize, tProjects, refreshNonce]);

  const pageRange = getListPageRange(pagination);

  function openProjectDetail(projectId: number) {
    router.push(buildDetailHrefWithListReturn(`${routes.dashboard.projects}/${projectId}`, returnTo, projectId));
  }

  const addProjectButton = (
    <AddButton type="button" onClick={openCreateProject}>
      {t("detail.addProject")}
    </AddButton>
  );

  const emptyStateKind = React.useMemo(() => {
    if (loading || loadError || items.length > 0) return "none" as const;
    return "onboarding" as const;
  }, [loading, loadError, items.length]);

  return (
    <DetailTabListShell
      loading={loading}
      loadError={loadError}
      isEmpty={items.length === 0}
      toolbar={
        !loading && !loadError && items.length > 0 ? (
          <div className={detailTabToolbarClassName}>{addProjectButton}</div>
        ) : null
      }
      loadingFallback={<EntityDetailTabLoadingState />}
      emptyFallback={
        <ListPageEmptyStates
          fill
          emptyStateKind={emptyStateKind}
          onboarding={{
            iconName: "projects",
            title: t("detail.projectsEmptyTitle"),
            description: t("detail.projectsEmptyDescription"),
            action: addProjectButton,
          }}
          onClearFilters={() => {}}
        />
      }
    >
      <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
        <EntityDataTable columns={columns} rows={items} onRowClick={(row) => openProjectDetail(row.id)} />
        <DataTablePaginationBar
          pagination={pagination}
          summary={tProjects("pageLabel", {
            start: pageRange.start,
            end: pageRange.end,
            total: pagination.total_records,
          })}
          prevLabel={tProjects("prev")}
          nextLabel={tProjects("next")}
          onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
          onNext={() => setPage(pagination.current_page + 1)}
          onPageSelect={(p) => setPage(p)}
          pageSizeControl={{
            label: tList("rowsPerPage"),
            listLabel: tList("rowsPerPage"),
            value: pageSize,
            options: pageSizeOptions,
            onChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
            disabled: loading,
          }}
        />
      </div>
    </DetailTabListShell>
  );
}
