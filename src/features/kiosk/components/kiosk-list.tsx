"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import { Plus, Edit2, Trash2, Store, LayoutList } from "lucide-react";
import {
  AppButton,
  DataTablePaginationBar,
  ListPageSearchField,
} from "@/shared/ui";
import { DataTableRowActionsMenu } from "@/shared/ui/data-table-row-actions-menu";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { routes } from "@/shared/config/routes";
import { toastSuccess, toastApiError } from "@/shared/feedback/app-toast";
import { getKiosksList, deleteKiosk } from "../api/kiosk.api";
import type { KioskListItem } from "../types/kiosk.types";

function userLabel(user: KioskListItem["created_by"]): string {
  if (!user) return "—";
  return user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

function questionCount(row: KioskListItem): number {
  if (!row.questions) return 0;
  return Array.isArray(row.questions)
    ? row.questions.filter((q: any) => q.is_deleted !== true).length
    : 0;
}

export const KioskList = () => {
  const router = useRouter();
  const dateFmt = useDashboardDateFormat();

  const { page, pageSize, search, setUrl, setPage, setPageSize } =
    useListUrlState({ defaultPageSize: 20 });
  const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

  const [items, setItems] = useState<KioskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total_records: 0,
    total_pages: 1,
    current_page: 1,
    page_size: 20,
  });
  const pageRange = getListPageRange({ current_page: pagination.current_page, page_size: pageSize, total_records: pagination.total_records });

  const loadKiosks = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await getKiosksList({
        search: search || undefined,
        page,
        page_size: pageSize,
      });
      setItems(res.results || []);
      setPagination({
        total_records: res.total_records || (res.results ? res.results.length : 0),
        total_pages: res.total_pages || 1,
        current_page: res.current_page || 1,
        page_size: res.page_size || pageSize,
      });
    } catch (err: any) {
      setItems([]);
      setLoadError(err?.response?.data?.detail || err?.message || "Failed to load kiosks");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    loadKiosks();
  }, [loadKiosks]);

  const commitSearch = useCallback(
    (q: string | null) => {
      setUrl({ search: q?.trim() || null, page: null }, { replace: true });
    },
    [setUrl]
  );

  const handleDelete = async (id: string | number) => {
    try {
      await deleteKiosk(id);
      toastSuccess("Kiosk deleted successfully");
      loadKiosks();
    } catch (err) {
      toastApiError(err);
    }
  };

  const handleCreate = () => {
    router.push(
      `${routes.dashboard.settingsKiosks}/create?kiosk_mode=create` as Parameters<
        typeof router.push
      >[0],
    );
  };

  const handleEdit = (id: string | number) => {
    router.push(
      `${routes.dashboard.settingsKiosks}/${id}?kiosk_mode=edit` as Parameters<
        typeof router.push
      >[0],
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50/50 p-6 dark:bg-slate-950">
      {/* Header bar with Search and Create Button (Image 2 style) */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full max-w-sm">
          <ListPageSearchField
            value={search || ""}
            onCommit={commitSearch}
            placeholder="Search kiosks..."
            ariaLabel="Search kiosks"
          />
        </div>

        <div className="flex items-center gap-2">
          <AppButton
            variant="primary"
            onClick={handleCreate}
            className="flex items-center gap-1.5 font-semibold"
          >
            <Plus className="size-4" />
            Create new kiosk
          </AppButton>
        </div>
      </div>

      {/* Main Table Shell */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                <th className="py-3.5 pl-6 pr-4">Kiosk Name</th>
                <th className="px-4 py-3.5">API Name</th>
                <th className="px-4 py-3.5">Questions</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Created</th>
                <th className="py-3.5 pl-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="size-4 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      <span>Loading kiosks...</span>
                    </div>
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center gap-2">
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">
                        {loadError}
                      </p>
                      <button
                        onClick={loadKiosks}
                        className="mt-1 text-xs text-blue-600 underline hover:text-blue-700 dark:text-blue-400"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center">
                      <div className="flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 mb-3">
                        <Store className="size-7" />
                      </div>
                      <h4 className="text-base font-semibold text-slate-900 dark:text-white">
                        No kiosks created yet
                      </h4>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Get started by creating your first interactive kiosk flow.
                      </p>
                      <AppButton
                        variant="primary"
                        onClick={handleCreate}
                        className="mt-4 flex items-center gap-1.5 text-xs"
                      >
                        <Plus className="size-4" />
                        Create first kiosk
                      </AppButton>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((row) => {
                  const qCount = questionCount(row);
                  const isActive = row.is_active !== false;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => handleEdit(row.id)}
                      className="group cursor-pointer transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/50"
                    >
                      {/* Name */}
                      <td className="py-4 pl-6 pr-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                            <LayoutList className="size-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                              {row.name}
                            </p>
                            {row.description && (
                              <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-slate-400">
                                {row.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* API Name */}
                      <td className="px-4 py-4">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {row.api_name || "—"}
                        </code>
                      </td>

                      {/* Questions count */}
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {qCount} {qCount === 1 ? "question" : "questions"}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                          }`}
                        >
                          <span
                            className={`size-1.5 rounded-full ${
                              isActive ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {/* Created */}
                      <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                        <div>
                          {row.created_at
                            ? dateFmt.format(new Date(row.created_at))
                            : "—"}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {userLabel(row.created_by)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td
                        className="py-4 pl-4 pr-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DataTableRowActionsMenu
                          menuAriaLabel="Kiosk options"
                          items={[
                            {
                              id: "edit",
                              label: "Edit Kiosk",
                              icon: Edit2,
                              onSelect: () => handleEdit(row.id),
                            },
                            {
                              id: "delete",
                              label: "Delete",
                              icon: Trash2,
                              tone: "danger",
                              onSelect: () => handleDelete(row.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
            <DataTablePaginationBar
              pagination={pagination}
              summary={`${pageRange.start}-${pageRange.end} of ${pagination.total_records}`}
              prevLabel="Previous"
              nextLabel="Next"
              onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
              onNext={() => setPage(pagination.current_page + 1)}
              onPageSelect={(p) => setPage(p)}
              pageSizeControl={{
                listLabel: "Rows per page",
                value: pageSize,
                options: pageSizeOptions,
                onChange: setPageSize,
                disabled: loading,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default KioskList;
