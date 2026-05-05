"use client";

import * as React from "react";
import { FileText, Plus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { fetchDrawingsPage } from "@/features/projects/api/drawing.api";
import { DrawingUploadModal } from "@/features/projects/components/drawing-upload-modal";
import type { Drawing } from "@/features/projects/types/drawing.types";
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
} from "@/shared/ui";

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

function pinsDisplay(row: Drawing): number | null {
  const raw = row.pin_count ?? row.pins_count;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

export function ProjectDrawingsTab({ projectId }: { projectId: number }) {
  const t = useTranslations("Dashboard.projects.drawings");
  const locale = useLocale();
  const router = useRouter();

  const [page, setPage] = React.useState(1);
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

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const { items: next, pagination: p } = await fetchDrawingsPage(projectId, page, 100);
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
  }, [projectId, page, refreshNonce, t]);

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

  return (
    <div className="divide-y divide-slate-100 dark:divide-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50">{t("title")}</h2>
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
          {t("upload")}
        </AppButton>
      </div>

      {loadError ? (
        <p className="px-4 py-10 text-center text-sm text-red-600 dark:text-red-400 sm:px-6">{loadError}</p>
      ) : loading ? (
        <div className="space-y-2 px-4 py-6 sm:px-6">
          <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
          <div className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      ) : (
        <>
        
          <div className="hidden md:block">
            <DataTableScroll>
              <DataTable>
                <DataTableHead>
                  <tr>
                    <DataTableTh>{t("table.drawing")}</DataTableTh>
                    <DataTableTh className="hidden lg:table-cell">{t("table.file")}</DataTableTh>
                    <DataTableTh narrow>{t("table.pins")}</DataTableTh>
                    <DataTableTh narrow>{t("table.actions")}</DataTableTh>
                  </tr>
                </DataTableHead>
                <DataTableBody>
                  {items.length === 0 ? (
                    <DataTableEmptyRow message={t("empty")} colSpan={4} />
                  ) : (
                    items.map((row) => {
                      const pinN = pinsDisplay(row);
                      return (
                        <DataTableRow key={row.id}>
                          <DataTableTd className="font-medium text-slate-900 dark:text-slate-100">
                            <span className="flex min-w-0 items-center gap-3">
                              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                                <FileText className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                              </span>
                              <span className="min-w-0 truncate">{row.name}</span>
                            </span>
                          </DataTableTd>
                          <DataTableTd className="hidden text-slate-600 dark:text-slate-400 lg:table-cell">
                            <span className="tabular-nums">{formatBytes(row.drawing_file_size)}</span>
                            <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-500">
                              {row.drawing_file_type?.replace(/^application\//, "") || "—"}
                            </span>
                          </DataTableTd>
                          <DataTableTd className="tabular-nums text-slate-700 dark:text-slate-300">
                            {pinN !== null ? new Intl.NumberFormat(compactLocale).format(pinN) : "—"}
                          </DataTableTd>
                          <DataTableTd>
                            <AppButton type="button" variant="secondary" size="sm" onClick={() => openDrawing(row)}>
                              {t("open")}
                            </AppButton>
                          </DataTableTd>
                        </DataTableRow>
                      );
                    })
                  )}
                </DataTableBody>
              </DataTable>
            </DataTableScroll>
          </div>

        
          <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
            {items.length === 0 ? (
              <li className="px-4 py-10 text-center text-sm text-slate-600 dark:text-slate-400 sm:px-6">{t("empty")}</li>
            ) : (
              items.map((row) => {
                const pinN = pinsDisplay(row);
                return (
                  <li key={row.id} className="flex gap-3 px-4 py-4 sm:px-6">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <FileText className="size-[18px]" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="font-medium leading-snug text-slate-900 dark:text-slate-100">{row.name}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {formatBytes(row.drawing_file_size)}
                        {row.drawing_file_type ? ` · ${row.drawing_file_type.replace(/^application\//, "")}` : null}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {t("pinsLabelShort")}
                          {pinN !== null ? (
                            <span className="ml-1 tabular-nums font-medium text-slate-900 dark:text-slate-100">
                              {new Intl.NumberFormat(compactLocale).format(pinN)}
                            </span>
                          ) : (
                            <span className="ml-1">—</span>
                          )}
                        </span>
                        <AppButton type="button" variant="secondary" size="sm" onClick={() => openDrawing(row)}>
                          {t("open")}
                        </AppButton>
                      </div>
                    </div>
                  </li>
                );
              })
            )}
          </ul>

          {!loading && !loadError && items.length > 0 && pagination.total_pages > 1 ? (
            <div className="border-t border-slate-100 dark:border-slate-800">
              <DataTablePaginationBar
                pagination={pagination}
                summary={t("pageLabel", {
                  current: pagination.current_page,
                  total: pagination.total_pages,
                  count: pagination.total_records,
                })}
                prevLabel={t("prev")}
                nextLabel={t("next")}
                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => p + 1)}
              />
            </div>
          ) : null}
        </>
      )}

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
