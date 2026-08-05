"use client";

import { getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";

import * as React from "react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchClientsPage } from "@/features/clients/api/client.api";
import { fetchSitesPage } from "@/features/sites/api/site.api";
import { fetchTagsPage } from "@/features/tags/api/tag.api";
import { fetchQuotationsPage } from "@/features/quotations/api/quotation.api";
import type { QuotationListItem } from "@/features/quotations/types/quotation.types";
import {
  getQuotationCustomerId,
  getQuotationSiteId,
  quotationCustomerLabel,
  quotationSiteLabel,
  quotationTagsLabels,
} from "@/features/quotations/utils/quotation-nested-fields.util";
import type { Tag } from "@/features/tags/types/tag.types";
import { entityCol } from "@/shared/components/entity";
import type { EntityTableColumn } from "@/shared/components/entity";
import {
  detailTabBodyClassName,
  detailTabErrorClassName,
  detailTabFilterBarClassName,
  detailTabSectionClassName,
  detailTabTitleClassName,
} from "@/shared/components/layout/detail-tab-layout";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { useListRowHighlight } from "@/shared/hooks/use-list-row-highlight";
import { buildDetailHrefWithListReturn } from "@/shared/utils/detail-from-list.util";
import { formatFlexibleApiDate } from "@/shared/utils/api-date-parse.util";
import { cn } from "@/core/utils/http.util";
import {
  DataTable,
  DataTableBody,
  DataTableHead,
  ListPageSearchField,
  ListPageEmptyStates,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
} from "@/shared/ui";
import { routes } from "@/shared/config/routes";

type Props = {
  projectId: number;
};

const TRUNCATE_MAX = {
  sm: "max-w-[14rem]",
  md: "max-w-[16rem]",
  lg: "max-w-[20rem]",
} as const;

function quotationTableCellClassName(column: EntityTableColumn<QuotationListItem>): string | undefined {
  switch (column.variant) {
    case "primary":
      return "font-semibold text-slate-900 dark:text-slate-100";
    case "truncate": {
      const max = column.maxWidth ? TRUNCATE_MAX[column.maxWidth] : TRUNCATE_MAX.sm;
      return cn(max, "truncate");
    }
    case "tabular":
    case "date":
      return "tabular-nums";
    default:
      return undefined;
  }
}

function renderQuotationTableCell(column: EntityTableColumn<QuotationListItem>, row: QuotationListItem) {
  switch (column.variant) {
    case "primary":
    case "text":
    case "tabular":
      return column.value(row);
    case "truncate": {
      const title = column.title?.(row);
      return (
        <span className="block truncate" title={title}>
          {column.value(row)}
        </span>
      );
    }
    case "date":
      return column.dateFmt.format(new Date(column.value(row)));
    default:
      return null;
  }
}

export function ProjectQuotationsTab({ projectId }: Props) {
  const t = useTranslations("Dashboard.projects.quotationsTab");
  const tQuotations = useTranslations("Dashboard.quotations");
  const dateFmt = useDashboardDateFormat();
  const dueFmt = useDashboardDateFormat({ dateOnly: true });
  const router = useRouter();
  const pathname = usePathname();
  const { highlightClassName } = useListRowHighlight();

  const listBack = pathname;

  const openDetail = React.useCallback(
    (id: number) => {
      router.push(
        buildDetailHrefWithListReturn(`${routes.dashboard.quotations}/${id}`, listBack, id),
      );
    },
    [listBack, router],
  );

  const [search, setSearch] = React.useState("");
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
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  const [clientOptions, setClientOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [siteOptions, setSiteOptions] = React.useState<{ value: string; label: string }[]>([]);
  const [tagLabelById, setTagLabelById] = React.useState<Record<number, string>>({});

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
    setPage(1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clientsRes, sitesRes, tagsRes] = await Promise.all([
          fetchClientsPage(1, 500, { is_active: true }),
          fetchSitesPage(1, 500, { is_active: true }),
          fetchTagsPage(1, 500, { is_active: true }),
        ]);
        if (!cancelled) {
          setClientOptions(clientsRes.items.map((c) => ({ value: String(c.id), label: c.name })));
          setSiteOptions(sitesRes.items.map((s) => ({ value: String(s.id), label: s.site_name })));
          const mapped: Record<number, string> = {};
          for (const row of tagsRes.items) {
            const label = ((row as Tag).name ?? (row as Tag).tag_name ?? "").trim();
            if (label) mapped[row.id] = label;
          }
          setTagLabelById(mapped);
        }
      } catch (error) {
        if (!cancelled) {
          setClientOptions([]);
          setSiteOptions([]);
          setTagLabelById({});
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
        const { items: nextItems, pagination: p } = await fetchQuotationsPage(page, pageSize, {
          project: projectId,
          search: search || undefined,
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
  }, [projectId, page, pageSize, search, t]);

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
    for (const o of siteOptions) {
      const id = Number.parseInt(o.value, 10);
      if (Number.isFinite(id)) m[id] = o.label;
    }
    return m;
  }, [siteOptions]);

  const quoteStatusLabel = React.useCallback(
    (code: string | null | undefined) => {
      const raw = code == null ? "" : String(code).trim();
      if (!raw) return "—";
      const norm = raw.toLowerCase();
      if (norm === "draft") return tQuotations("quoteStatus.draft");
      if (norm === "sent") return tQuotations("quoteStatus.sent");
      if (norm === "approved" || norm === "accepted") return tQuotations("quoteStatus.approved");
      if (norm === "rejected") return tQuotations("quoteStatus.rejected");
      return raw;
    },
    [tQuotations],
  );

  const tableColumns = React.useMemo(() => {
    const c = entityCol<QuotationListItem>();
    const customerDisplay = (row: QuotationListItem) => {
      const customerId = getQuotationCustomerId(row.customer);
      return quotationCustomerLabel(row.customer, customerId != null ? clientLabelById[customerId] : undefined);
    };
    const siteDisplay = (row: QuotationListItem) => {
      const siteId = getQuotationSiteId(row.site);
      return quotationSiteLabel(row.site, siteId != null ? siteLabelById[siteId] : undefined);
    };
    const tagsDisplay = (row: QuotationListItem) => quotationTagsLabels(row.tags, tagLabelById);

    return [
      c.primary("quote", tQuotations("table.quote"), (r) => r.quotation_serial_number),
      c.truncate("customer", tQuotations("table.customer"), (r) => customerDisplay(r), {
        title: (r) => customerDisplay(r),
      }),
      // c.truncate("site", tQuotations("table.site"), (r) => siteDisplay(r), {
      //   title: (r) => siteDisplay(r),
      // }),
      c.truncate("tags", tQuotations("table.tags"), (r) => tagsDisplay(r), {
        title: (r) => tagsDisplay(r),
      }),
      c.text("status", tQuotations("table.status"), (r) => quoteStatusLabel(r.status)),
      c.tabular("due", tQuotations("table.due"), (r) => formatFlexibleApiDate(r.due_date, dueFmt)),
      c.date("created", tQuotations("table.created"), (r) => r.created_at, dateFmt),
    ];
  }, [tQuotations, dateFmt, dueFmt, clientLabelById, siteLabelById, tagLabelById, quoteStatusLabel]);

  const hasActiveFilters = search.trim() !== "";
  const emptyStateKind = React.useMemo(() => {
    if (loading || loadError || items.length > 0) return "none" as const;
    if (hasActiveFilters) return "filtered" as const;
    return "onboarding" as const;
  }, [loading, loadError, items.length, hasActiveFilters]);

  return (
    <div className={detailTabSectionClassName}>
      <div className={detailTabTitleClassName}>
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          {t("title")}
        </h2>
        <p className="mt-0.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
          {t("subtitle")}
        </p>
      </div>

      <div className={detailTabFilterBarClassName}>
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchAria")}
          className="sm:max-w-sm"
        />
      </div>

      <div className={detailTabBodyClassName}>
        {loadError ? (
          <p className={detailTabErrorClassName}>
            {loadError}
          </p>
        ) : loading ? (
          <div className="space-y-2">
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
            <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
          </div>
        ) : items.length === 0 ? (
          <ListPageEmptyStates
            emptyStateKind={emptyStateKind}
            onboarding={{
              iconName: "clients",
              title: t("emptyTitle"),
              description: t("emptyDescription"),
              action: null,
            }}
            onClearFilters={() => {
              setSearch("");
              setPage(1);
            }}
          />
        ) : (
          <DataTableScroll>
            <DataTable>
              <DataTableHead>
                <tr>
                  {tableColumns.map((col) => (
                    <DataTableTh key={col.id} narrow={col.narrow} className={col.headerClassName}>
                      {col.headerSrOnly ? <span className="sr-only">{col.header}</span> : col.header}
                    </DataTableTh>
                  ))}
                </tr>
              </DataTableHead>
              <DataTableBody>
                {items.map((row) => (
                  <DataTableRow
                    key={row.id}
                    data-list-row-id={row.id}
                    className={highlightClassName(row.id)}
                    clickable
                    onClick={() => openDetail(row.id)}
                  >
                    {tableColumns.map((col) => (
                      <DataTableTd
                        key={col.id}
                        narrow={col.narrow}
                        className={cn(quotationTableCellClassName(col), col.cellClassName)}
                      >
                        {renderQuotationTableCell(col, row)}
                      </DataTableTd>
                    ))}
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          </DataTableScroll>
        )}

        {!loading && !loadError && items.length > 0 ? (
          <DataTablePaginationBar
            className="bg-white dark:bg-slate-950"
            pagination={pagination}
            summary={t("pageLabel", {
              start: Math.min((page - 1) * pageSize + 1, pagination.total_records),
              end: Math.min(page * pageSize, pagination.total_records),
              total: pagination.total_records,
            })}
            prevLabel={t("prev")}
            nextLabel={t("next")}
            onPrev={() => setPage(Math.max(1, page - 1))}
            onNext={() => setPage(page + 1)}
            onPageSelect={(p) => setPage(p)}
          />
        ) : null}
      </div>
    </div>
  );
}
