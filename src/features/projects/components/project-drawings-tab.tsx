"use client";

import * as React from "react";
import { LayoutGrid, List, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import { DrawingFilePreview, DrawingFilePreviewFill } from "@/features/projects/components/drawing-file-preview";
import { DrawingUploadModal } from "@/features/projects/components/drawing-upload-modal";
import type { Drawing } from "@/features/projects/types/drawing.types";
import type { ListPageViewMode } from "@/shared/hooks/use-list-url-state";
import { cn } from "@/core/utils/http.util";
import {
  AppButton,
  DataTable,
  DataTableBody,
  DataTableEmptyRow,
  DataTableHead,
  DataTablePaginationBar,
  DataTableRow,
  DataTableScroll,
  DataTableTd,
  DataTableTh,
  ListPageCardSkeleton,
  ListPageSearchField,
} from "@/shared/ui";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { listPageSizeSelectOptions, normalizeListPageSize } from "@/shared/utils/list-page-size.util";

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const rounded = i === 0 ? Math.round(v) : v < 10 ? Number(v.toFixed(1)) : Math.round(v);
  return `${rounded} ${units[i]}`;
}

function formatRelativeUpdated(iso: string, locale: string): string {
  const date = new Date(iso);
  const sec = Math.round((Date.now() - date.getTime()) / 1000);
  const loc = locale === "es" ? "es" : "en";
  const rtf = new Intl.RelativeTimeFormat(loc, { numeric: "auto" });
  const abs = Math.abs(sec);
  if (abs < 60) return rtf.format(-sec, "second");
  const min = Math.round(sec / 60);
  if (Math.abs(min) < 60) return rtf.format(-min, "minute");
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(-hr, "hour");
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 7) return rtf.format(-day, "day");
  return new Intl.DateTimeFormat(loc, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function parseDrawingsListViewParam(param: string | null): ListPageViewMode {
  return param === "table" ? "table" : "list";
}

function DrawingGridCard({
  row,
  updatedLabel,
  locale,
  onOpen,
}: {
  row: Drawing;
  updatedLabel: string;
  locale: string;
  onOpen: () => void;
}) {
  const createdBy = row.created_by?.username || row.created_by?.email || "—";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "overflow-hidden border border-slate-200 bg-white text-left outline-none transition dark:border-slate-800 dark:bg-slate-950",
        "focus-visible:ring-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600",
        "cursor-pointer hover:border-slate-300 dark:hover:border-slate-600",
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100 dark:bg-slate-900/80">
        <DrawingFilePreviewFill
          key={`${row.id}-${row.drawing_file}`}
          drawingFile={row.drawing_file}
          fileType={row.drawing_file_type}
          alt=""
        />
      </div>
      <div className="p-4">
        <h3 className="min-w-0 truncate text-base font-semibold leading-snug tracking-tight text-slate-900 dark:text-slate-100">
          {row.name}
        </h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {formatBytes(row.drawing_file_size)} · {row.drawing_file_type || "—"}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-500">By {createdBy}</p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-500">
          {updatedLabel} {formatRelativeUpdated(row.modified_at || row.created_at, locale)}
        </p>
      </div>
    </div>
  );
}

export function ProjectDrawingsTab({ projectId }: { projectId: number }) {
  const t = useTranslations("Dashboard.projects.drawings");
  const tList = useTranslations("Dashboard.list");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const listViewMode = React.useMemo(
    () => parseDrawingsListViewParam(searchParams.get("drawingsView")),
    [searchParams],
  );

  function setListViewMode(mode: ListPageViewMode) {
    const p = new URLSearchParams(searchParams.toString());
    if (mode === "list") p.delete("drawingsView");
    else p.set("drawingsView", "table");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(100);
  const [search, setSearch] = React.useState("");
  const [items, setItems] = React.useState<Drawing[]>([]);
  const [pagination, setPagination] = React.useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 100,
    next: null as string | null,
    previous: null as string | null,
  });
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = React.useState(0);
  const [uploadOpen, setUploadOpen] = React.useState(false);
  const [uploadSession, setUploadSession] = React.useState(0);

  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const commitSearch = React.useCallback((q: string) => {
    setSearch(q.trim());
    setPage(1);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: next, pagination: p } = await fetchDrawingsPage(
          projectId,
          page,
          pageSize,
          search || undefined,
        );
        if (!cancelled) {
          setItems(next);
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
  }, [projectId, page, pageSize, search, refreshNonce, t]);

  const suggestedOrder = React.useMemo(() => {
    if (items.length === 0) return 1;
    return Math.max(...items.map((i) => i.order)) + 1;
  }, [items]);

  function openDrawing(row: Drawing) {
    router.push(`/dashboard/projects/${projectId}/drawings/${row.id}`);
  }

  function handleCreated() {
    setRefreshNonce((n) => n + 1);
    setPage(1);
  }

  const compactLocale = locale === "es" ? "es" : "en";
  const pageRange = getListPageRange(pagination);

  const viewToggle = (
    <div className="inline-flex shrink-0 items-center rounded-lg border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        onClick={() => setListViewMode("list")}
        title={tList("tableView")}
        aria-label={tList("tableView")}
        aria-pressed={listViewMode === "list"}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md transition",
          listViewMode === "list"
            ? "bg-slate-100 text-slate-900 shadow-sm dark:bg-slate-800 dark:text-slate-100"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        )}
      >
        <LayoutGrid className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setListViewMode("table")}
        title={tList("listView")}
        aria-label={tList("listView")}
        aria-pressed={listViewMode === "table"}
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-md transition",
          listViewMode === "table"
            ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-600"
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
        )}
      >
        <List className="size-4" />
      </button>
    </div>
  );

  const tableColSpan = 4;

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{t("subtitle")}</p>
        </div>
        <AppButton
          type="button"
          variant="primary"
          size="md"
          className="shrink-0 gap-2"
          onClick={() => {
            setUploadSession((s) => s + 1);
            setUploadOpen(true);
          }}
        >
          <Plus className="size-4" strokeWidth={2} aria-hidden />
          {t("createDrawing")}
        </AppButton>
      </div>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <ListPageSearchField
          value={search}
          onCommit={commitSearch}
          placeholder={t("searchPlaceholder")}
          ariaLabel={t("searchAria")}
          className="sm:max-w-md"
        />
        {viewToggle}
      </div>

      {loadError ? (
        <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">{loadError}</p>
      ) : loading ? (
        listViewMode === "list" ? (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <ListPageCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="space-y-2 px-4 py-6 sm:px-6">
            <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
            <div className="h-10 animate-pulse bg-slate-100 dark:bg-slate-800" />
          </div>
        )
      ) : listViewMode === "list" ? (
        <>
          {items.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6 lg:grid-cols-3">
              {items.map((row) => (
                <DrawingGridCard
                  key={row.id}
                  row={row}
                  updatedLabel={t("updatedLabel")}
                  locale={locale}
                  onOpen={() => openDrawing(row)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <DataTableScroll>
          <DataTable>
            <DataTableHead>
              <tr>
                <DataTableTh>{t("table.drawing")}</DataTableTh>
                <DataTableTh className="hidden lg:table-cell">{t("table.file")}</DataTableTh>
                  <DataTableTh className="hidden md:table-cell">{t("table.created")}</DataTableTh>
                <DataTableTh className="hidden md:table-cell">{t("table.updated")}</DataTableTh>
              </tr>
            </DataTableHead>
            <DataTableBody>
              {items.length === 0 ? (
                <DataTableEmptyRow message={t("empty")} colSpan={tableColSpan} />
              ) : (
                items.map((row) => {
                  const createdBy = row.created_by?.username || row.created_by?.email || "—";
                  return (
                    <DataTableRow key={row.id} clickable onClick={() => openDrawing(row)}>
                      <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                        <span className="flex min-w-0 items-center gap-3">
                          <DrawingFilePreview
                            key={`${row.id}-${row.drawing_file}`}
                            drawingFile={row.drawing_file}
                            fileType={row.drawing_file_type}
                            alt=""
                            widthPx={76}
                            className="h-12 w-[4.75rem] shrink-0 border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                          />
                          <span className="min-w-0 truncate">{row.name}</span>
                        </span>
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 lg:table-cell">
                        <span className="tabular-nums">{formatBytes(row.drawing_file_size)}</span>
                        <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-500">
                          {row.drawing_file_type?.replace(/^application\//, "") || "—"}
                        </span>
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 md:table-cell">
                        {createdBy}
                      </DataTableTd>
                      <DataTableTd className="hidden text-slate-600 dark:text-slate-400 md:table-cell">
                        {formatRelativeUpdated(row.modified_at || row.created_at, locale)}
                      </DataTableTd>
                    </DataTableRow>
                  );
                })
              )}
            </DataTableBody>
          </DataTable>
        </DataTableScroll>
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
            onPageSelect={(p) => setPage(p)}
            pageSizeControl={{
              label: tList("rowsPerPage"),
              listLabel: tList("rowsPerPage"),
              value: normalizeListPageSize(pageSize),
              options: pageSizeOptions,
              onChange: (n) => {
                setPageSize(n);
                setPage(1);
              },
              disabled: loading,
            }}
          />
        </div>
      ) : null}

      <DrawingUploadModal
        key={uploadSession}
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={projectId}
        suggestedOrder={suggestedOrder}
        onCreated={handleCreated}
      />
    </div>
  );
}
