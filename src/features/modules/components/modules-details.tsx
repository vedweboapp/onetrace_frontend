"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import {
    DataTable,
    DataTableBody,
    DataTableHead,
    DataTableRow,
    DataTableScroll,
    DataTableTd,
    DataTableTh,
    SurfaceShell,
    AppButton,
    DataTablePaginationBar,
    ListPageSearchField,
    AddButton,
    ListPageEmptyStates,
} from "@/shared/ui";
import { useUrlParams } from "@/shared/hooks/use-url-params";
import { useSimpleListEmptyState } from "@/shared/hooks/use-simple-list-empty-state";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { getModulesList } from "../api/modules.api";

const ModulesDetails = () => {
    const t = useTranslations("Dashboard.modules");
    const [params, setParam, setPageSize] = useUrlParams({
        page_size: 10,
    });
    const page = params.page ?? 1;
    const pageSize = params.page_size ?? 10;

    const [search, setSearch] = useState("");

    const [items, setItems] = useState<any[]>([]);
    const [pagination, setPagination] = useState<{
        total_records: number;
        total_pages: number;
        current_page: number;
        page_size: number;
    }>({
        total_records: 0,
        total_pages: 1,
        current_page: 1,
        page_size: 10
    });
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const route = useRouter();

    const createModuleHref = `${routes.dashboard.settingsModules}/create?purpose=create_module`;

    const loadModules = useCallback(async () => {
        try {
            setLoading(true);
            setLoadError(null);
            const queryParams: Record<string, string | number> = {
                page,
                page_size: pageSize,
            };
            if (search) queryParams.search = search;

            const response = await getModulesList(queryParams);
            setItems(response?.data || []);
            if (response?.pagination) {
                setPagination(response.pagination);
            }
        } catch (err) {
            console.error("Failed to load modules", err);
            setLoadError(t("loadError"));
            setItems([]);
        } finally {
            setLoading(false);
        }
    }, [page, pageSize, search, t]);

    useEffect(() => {
        void loadModules();
    }, [loadModules]);

    const totalRecords = pagination.total_records;
    const totalPages = pagination.total_pages;
    const currentPage = page;
    const hasActiveFilters = Boolean(search.trim());

    const { emptyStateKind } = useSimpleListEmptyState({
        loading,
        loadError,
        itemsLength: totalRecords,
        hasActiveFilters,
    });

    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + items.length, totalRecords);
    const paginatedItems = items;

    const pageSizeOptions = [
        { value: "5", label: "5" },
        { value: "10", label: "10" },
        { value: "20", label: "20" },
        { value: "50", label: "50" },
    ];

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        return new Date(dateStr).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    function clearFilters() {
        setSearch("");
        setParam("page", 1);
    }

    return (
        <div className="w-full space-y-5 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[8px] p-4 gap-4 shadow-sm">
                <ListPageSearchField
                    value={search}
                    onCommit={(val) => {
                        setSearch(val || "");
                        setParam("page", 1);
                    }}
                    placeholder={t("searchPlaceholder")}
                    ariaLabel={t("searchAria")}
                    className="max-w-[280px]"
                />
                <AddButton size="sm" onClick={() => route.push(createModuleHref)}>
                    {t("add")}
                </AddButton>
            </div>

            <SurfaceShell className="rounded-[8px]">
                {loading ? (
                    <div className="p-6 space-y-4">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <div className="space-y-2 w-1/3">
                                    <div className="h-4 bg-slate-150 dark:bg-slate-850 rounded w-3/4 animate-pulse" />
                                    <div className="h-3 bg-slate-100 dark:bg-slate-900 rounded w-1/2 animate-pulse" />
                                </div>
                                <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/4 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : loadError ? (
                    <div className="p-6 text-center">
                        <p className="text-sm font-medium text-red-600 dark:text-red-400">{loadError}</p>
                        <AppButton variant="secondary" size="sm" className="mt-3" onClick={() => void loadModules()}>
                            Retry
                        </AppButton>
                    </div>
                ) : emptyStateKind !== "none" ? (
                    <div className="p-8">
                        <ListPageEmptyStates
                            emptyStateKind={emptyStateKind}
                            onboarding={{
                                title: t("emptyTitle"),
                                description: t("emptyDescription"),
                                action: (
                                    <AddButton onClick={() => route.push(createModuleHref)}>
                                        {t("add")}
                                    </AddButton>
                                ),
                            }}
                            onClearFilters={clearFilters}
                        />
                    </div>
                ) : (
                    <>
                        <DataTableScroll>
                            <DataTable>
                                <DataTableHead>
                                    <tr>
                                        <DataTableTh>{t("table.displayName")}</DataTableTh>
                                        <DataTableTh>{t("table.moduleName")}</DataTableTh>
                                        <DataTableTh>{t("table.createdBy")}</DataTableTh>
                                        <DataTableTh className="hidden sm:table-cell">{t("table.lastModified")}</DataTableTh>
                                    </tr>
                                </DataTableHead>
                                <DataTableBody>
                                    {paginatedItems.map((row) => {
                                        const id = row.id;
                                        const displayName = row.singular_label || row.name || row.displayName || row.api_name || "Untitled";
                                        const moduleName = row.api_name || row.moduleName || "";
                                        const createdBy = row.created_by?.username || "Unknown";
                                        const lastModified = row.updated_at || row.updatedAt || row.created_at || row.lastModified || "";

                                        return (
                                            <DataTableRow key={id} onClick={() => route.push(`${routes.dashboard.settingsModules}/${id}/layout`)}>
                                                <DataTableTd className="font-semibold text-slate-800 dark:text-slate-100">
                                                    {displayName}
                                                </DataTableTd>
                                                <DataTableTd className="font-mono text-xs text-slate-500 dark:text-slate-400">
                                                    {moduleName}
                                                </DataTableTd>
                                                <DataTableTd className="text-slate-500 dark:text-slate-400">
                                                    {createdBy}
                                                </DataTableTd>
                                                <DataTableTd className="hidden text-slate-500 dark:text-slate-400 sm:table-cell">
                                                    {formatDate(lastModified)}
                                                </DataTableTd>
                                            </DataTableRow>
                                        );
                                    })}
                                </DataTableBody>
                            </DataTable>
                        </DataTableScroll>

                        {totalRecords > 0 && (
                            <DataTablePaginationBar
                                pagination={{
                                    current_page: currentPage,
                                    total_pages: totalPages,
                                    total_records: totalRecords
                                }}
                                summary={t("pagination.summary", {
                                    start: totalRecords === 0 ? 0 : startIndex + 1,
                                    end: endIndex,
                                    total: totalRecords,
                                })}
                                prevLabel={t("pagination.prev")}
                                nextLabel={t("pagination.next")}
                                onPrev={() => setParam("page", Math.max(1, currentPage - 1))}
                                onNext={() => setParam("page", Math.min(totalPages, currentPage + 1))}
                                onPageSelect={(p) => setParam("page", p)}
                                pageSizeControl={{
                                    listLabel: t("pagination.rowsPerPage"),
                                    value: pageSize,
                                    options: pageSizeOptions,
                                    onChange: (size) => setPageSize(Number(size))
                                }}
                            />
                        )}
                    </>
                )}
            </SurfaceShell>
        </div>
    );
};

export default ModulesDetails;
