"use client";

import React from "react";
import { useRouter } from "@/i18n/navigation";
import { useParams } from "next/navigation";
import { Plus, ArrowLeft } from "lucide-react";
import {
    AppButton,
    ListPageSearchField,
    SurfaceShell,
    DataTablePaginationBar,
} from "@/shared/ui";
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { getFormsList } from "@/features/form-builder/api/form-builder.api";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";

interface FormListItem {
    id: number | string;
    name: string;
    is_active?: boolean;
    created_at?: string;
    modified_at?: string;
    created_by?: { id: number; username?: string; email?: string } | null;
    modified_by?: { id: number; username?: string; email?: string } | null;
    [key: string]: any;
}

function userLabel(user: FormListItem["created_by"]): string {
    if (!user) return "—";
    return user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

const ProjectTypeFormList = () => {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const dateFmt = useDashboardDateFormat();

    const { page, pageSize, search, setUrl, setPage, setPageSize } =
        useListUrlState();
    const pageSizeOptions = React.useMemo(() => listPageSizeSelectOptions(), []);

    const commitSearch = React.useCallback(
        (q: string | null) => {
            setUrl({ search: q?.trim() || null, page: null }, { replace: true });
        },
        [setUrl],
    );

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

    React.useEffect(() => {
        if (!id) return;
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const data = await getFormsList({
                    project_type: id,
                    search: search || undefined,
                    page,
                    page_size: pageSize,
                });
                if (!cancelled) {
                    if (Array.isArray(data)) {
                        setItems(data);
                        setPagination((prev) => ({
                            ...prev,
                            total_records: data.length,
                            total_pages: 1,
                            current_page: 1,
                        }));
                    } else if (data?.results) {
                        setItems(data.results);
                        setPagination({
                            total_records: data.count ?? data.results.length,
                            total_pages: data.total_pages ?? 1,
                            current_page: data.current_page ?? page,
                            page_size: pageSize,
                            next: data.next ?? null,
                            previous: data.previous ?? null,
                        });
                    } else {
                        setItems([]);
                    }
                }
            } catch {
                if (!cancelled) {
                    setLoadError("Failed to load forms. Please try again.");
                    setItems([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [id, page, pageSize, search]);

    const pageRange = getListPageRange(pagination);

    const tableColumns = React.useMemo(() => {
        const c = entityCol<FormListItem>();
        return [
            c.custom("name", "Form Name", (row) => (
                <span className="font-medium text-slate-800 dark:text-slate-100">
                    {row.name || "—"}
                </span>
            )),
            c.status(
                "status",
                "Status",
                (r) => !!r.is_active,
                "Active",
                "Inactive",
            ),
            c.custom(
                "created",
                "Created",
                (row) => (
                    <>
                        <span className="block text-slate-500 dark:text-slate-400">
                            {row.created_at
                                ? dateFmt.format(new Date(row.created_at))
                                : "—"}
                        </span>
                        {userLabel(row.created_by) !== "—" && (
                            <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                                {userLabel(row.created_by)}
                            </span>
                        )}
                    </>
                ),
                { responsive: "sm" },
            ),
            c.custom(
                "updated",
                "Updated",
                (row) => (
                    <>
                        <span className="block text-slate-500 dark:text-slate-400">
                            {row.modified_at
                                ? dateFmt.format(new Date(row.modified_at))
                                : "—"}
                        </span>
                        {userLabel(row.modified_by) !== "—" && (
                            <span className="mt-0.5 block text-xs text-slate-400 dark:text-slate-500">
                                {userLabel(row.modified_by)}
                            </span>
                        )}
                    </>
                ),
                { responsive: "md" },
            ),
        ];
    }, [dateFmt]);

    return (
        <div className="space-y-6">
            {/* Back button + page title */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => router.back()}
                    className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
                    aria-label="Go back"
                >
                    <ArrowLeft className="size-5" />
                </button>
                <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Forms
                </h1>
            </div>

            {/* Search bar + create button */}
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <ListPageSearchField
                    placeholder="Search project type forms"
                    ariaLabel="Search project type forms"
                    value={search}
                    onCommit={commitSearch}
                />
                <AppButton
                    onClick={() =>
                        router.push(
                            `/dashboard/settings/project-type-forms/${id}/form-list/create?purpose=create_project_from`,
                        )
                    }
                >
                    <Plus className="size-4" /> Create new form
                </AppButton>
            </div>

            {/* Table */}
            <SurfaceShell className="rounded-none">
                {loadError ? (
                    <p className="p-8 text-center text-sm text-red-600 dark:text-red-400">
                        {loadError}
                    </p>
                ) : loading ? (
                    <div className="space-y-2 p-6">
                        <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="h-8 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
                    </div>
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        No forms found. Create your first form to get started.
                    </div>
                ) : (
                    <EntityDataTable
                        columns={tableColumns}
                        rows={items}
                        onRowClick={(row) =>
                            router.push(
                                `/dashboard/settings/project-type-forms/${id}/form-list/create?purpose=edit_layout&layout_id=${row.id}`,
                            )
                        }
                    />
                )}

                {!loading && !loadError && items.length > 0 ? (
                    <DataTablePaginationBar
                        pagination={pagination}
                        summary={`${pageRange.start}–${pageRange.end} of ${pagination.total_records}`}
                        prevLabel="Previous"
                        nextLabel="Next"
                        onPrev={() => setPage(Math.max(1, pagination.current_page - 1))}
                        onNext={() => setPage(pagination.current_page + 1)}
                        onPageSelect={(p) => setPage(p)}
                        pageSizeControl={{
                            label: "Rows per page",
                            listLabel: "Rows per page",
                            value: pageSize,
                            options: pageSizeOptions,
                            onChange: setPageSize,
                            disabled: loading,
                        }}
                    />
                ) : null}
            </SurfaceShell>
        </div>
    );
};

export default ProjectTypeFormList;