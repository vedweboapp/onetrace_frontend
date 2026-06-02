"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Plus } from "lucide-react";
import {
    AppButton,
    AppModal,
    CheckmarkSelect,
    ListPageSearchField,
    SurfaceShell,
    DataTablePaginationBar,
    type CheckmarkSelectOption,
} from "@/shared/ui";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { getProjectFormList, updateProjectForm } from "@/features/project-forms/api/project-forms.api";
import { toastError, toastSuccess } from "@/shared/feedback/app-toast";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { DashboardAppBrand } from "@/features/dashboard/components/dashboard-app-brand";

interface FormListItem {
    id: number | string;
    name?: string;
    api_name?: string;
    description?: string | null;
    project_type?: unknown;
    is_active?: boolean;
    created_at?: string;
    modified_at?: string;
    created_by?: { id: number; username?: string; email?: string } | null;
    modified_by?: { id: number; username?: string; email?: string } | null;
    [key: string]: unknown;
}

function userLabel(user: FormListItem["created_by"]): string {
    if (!user) return "—";
    return user.username?.trim() || user.email?.trim() || `#${user.id}`;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;
}

function textValue(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function projectTypeLabel(value: unknown): string {
    const record = asRecord(value);
    if (!record) return textValue(value) || "â€”";
    return (
        textValue(record.project_type) ||
        textValue(record.name) ||
        textValue(record.label) ||
        (record.id != null ? `#${String(record.id)}` : "â€”")
    );
}

function formApiName(row: FormListItem): string {
    return row.api_name || textValue(row.apiName) || "â€”";
}

const ProjectTypeFormList = () => {
    const t = useTranslations("Dashboard.settingsProjectForms");
    const router = useRouter();
    const dateFmt = useDashboardDateFormat();

    const { page, pageSize, search, setUrl, setPage, setPageSize } =
        useListUrlState({ defaultPageSize: 10 });
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
        page_size: 10,
        next: null as string | null,
        previous: null as string | null,
    });
    const [loading, setLoading] = React.useState(true);
    const [loadError, setLoadError] = React.useState<string | null>(null);
    const [projectTypeModalOpen, setProjectTypeModalOpen] = React.useState(false);
    const [projectTypes, setProjectTypes] = React.useState<ProjectType[]>([]);
    const [projectTypesLoading, setProjectTypesLoading] = React.useState(false);
    const [projectTypesError, setProjectTypesError] = React.useState<string | null>(null);
    const [togglingId, setTogglingId] = React.useState<string | number | null>(null);
    const [selectedProjectTypeId, setSelectedProjectTypeId] = React.useState<number | null>(null);

    React.useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setLoadError(null);
            try {
                const data = await getProjectFormList({
                    search: search || undefined,
                    page,
                    page_size: pageSize,
                });
                if (!cancelled) {
                    let resolvedItems: FormListItem[] = [];
                    let resolvedPagination = {
                        total_records: 0,
                        total_pages: 1,
                        current_page: 1,
                        page_size: pageSize,
                        next: null as string | null,
                        previous: null as string | null,
                    };
                    
                    if (Array.isArray(data)) {
                        resolvedItems = data as FormListItem[];
                        resolvedPagination = {
                            ...resolvedPagination,
                            total_records: data.length,
                            total_pages: 1,
                            current_page: 1,
                        };
                    } else if (data?.results && Array.isArray(data.results)) {
                        resolvedItems = data.results as FormListItem[];
                        resolvedPagination = {
                            total_records: data.count ?? data.results.length,
                            total_pages: data.total_pages ?? 1,
                            current_page: data.current_page ?? page,
                            page_size: pageSize,
                            next: data.next ?? null,
                            previous: data.previous ?? null,
                        };
                    } else if (data?.data && Array.isArray(data.data)) {
                        resolvedItems = data.data as FormListItem[];
                        resolvedPagination = {
                            total_records:
                                data.pagination?.total_records ?? data.data.length,
                            total_pages: data.pagination?.total_pages ?? 1,
                            current_page: data.pagination?.current_page ?? page,
                            page_size: data.pagination?.page_size ?? pageSize,
                            next: data.pagination?.next ?? null,
                            previous: data.pagination?.previous ?? null,
                        };
                    }
                    
                    setItems(resolvedItems);
                    setPagination(resolvedPagination);
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

    React.useEffect(() => {
        if (!projectTypeModalOpen) return;
        let cancelled = false;
        (async () => {
            setProjectTypesLoading(true);
            setProjectTypesError(null);
            try {
                const response = await fetchProjectTypesPage(1, 50, {
                    is_active: true,
                });
                if (!cancelled) {
                    setProjectTypes(Array.isArray(response.items) ? response.items : []);
                }
            } catch {
                if (!cancelled) {
                    setProjectTypes([]);
                    setProjectTypesError(t("projectTypesLoadError"));
                }
            } finally {
                if (!cancelled) setProjectTypesLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [projectTypeModalOpen, t]);

    const openProjectTypePicker = React.useCallback(() => {
        setSelectedProjectTypeId(null);
        setProjectTypeModalOpen(true);
    }, []);

    const continueToCreateForm = React.useCallback(() => {
        if (!selectedProjectTypeId) return;
        setProjectTypeModalOpen(false);
        router.push(
            `/dashboard/settings/project-type-forms/${selectedProjectTypeId}/create?purpose=create_project_form`,
        );
    }, [router, selectedProjectTypeId]);

    const handleToggleActive = React.useCallback(
        async (row: FormListItem) => {
            setTogglingId(row.id);
            try {
                await updateProjectForm(row.id, {
                    is_active: !row.is_active,
                });
                setItems((prev) => {
                    if (!Array.isArray(prev)) return prev;
                    return prev.map((item) =>
                        item.id === row.id ? { ...item, is_active: !item.is_active } : item,
                    );
                });
                toastSuccess(t("statusUpdatedToast"));
            } catch (error) {
                toastError(t("statusUpdateErrorToast"));
            } finally {
                setTogglingId(null);
            }
        },
        [t],
    );

    const projectTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
        () =>
            Array.isArray(projectTypes)
                ? projectTypes.map((projectType) => ({
                    value: String(projectType.id),
                    label: projectType.project_type || `#${projectType.id}`,
                }))
                : [],
        [projectTypes],
    );

    const pageRange = getListPageRange(pagination);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between rounded-md border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                <ListPageSearchField 
                    placeholder={t("searchPlaceholder")}
                    ariaLabel={t("searchAria")}
                    value={search}
                    onCommit={commitSearch}
                />
                <AppButton onClick={openProjectTypePicker}>
                    <Plus className="size-4" /> {t("createNewForm")}
                </AppButton>
            </div>

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
                ) : !Array.isArray(items) || items.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t("empty")}
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.formName")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.apiName")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.projectType")}</th>
                                    {/* <th className="px-4 py-3 text-center font-semibold text-slate-700 dark:text-slate-300">{t("table.status")}</th> */}
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.created")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.updated")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(Array.isArray(items) ? items : []).map((row) => (
                                    <tr
                                        key={row.id}
                                        onClick={() =>
                                            router.push(
                                                `/dashboard/settings/project-type-forms/create?purpose=edit__project_form&layout_id=${row.id}`,
                                            )
                                        }
                                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50/50 dark:border-slate-800 dark:hover:bg-slate-900/30"
                                    >
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-slate-800 dark:text-slate-100">
                                                {row.name || "—"}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <code className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                                {formApiName(row)}
                                            </code>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-slate-600 dark:text-slate-300">
                                                {projectTypeLabel(row.project_type)}
                                            </span>
                                        </td>
                                        {/* <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleActive(row);
                                                }}
                                                disabled={togglingId === row.id}
                                                className="relative inline-flex items-center rounded-full transition-colors"
                                                role="switch"
                                                aria-checked={row.is_active}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={row.is_active || false}
                                                    onChange={() => {}}
                                                    disabled={togglingId === row.id}
                                                    className="sr-only"
                                                />
                                                <div
                                                    className={`h-6 w-11 rounded-full transition-colors ${
                                                        row.is_active
                                                            ? "bg-green-500 dark:bg-green-600"
                                                            : "bg-slate-300 dark:bg-slate-600"
                                                    } ${togglingId === row.id ? "opacity-50" : ""}`}
                                                >
                                                    <div
                                                        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform ${
                                                            row.is_active ? "translate-x-5" : "translate-x-0.5"
                                                        }`}
                                                    />
                                                </div>
                                            </button>
                                        </td> */}
                                        <td className="px-4 py-3">
                                            <div className="block text-slate-500 dark:text-slate-400">
                                                {row.created_at
                                                    ? dateFmt.format(new Date(row.created_at))
                                                    : "—"}
                                            </div>
                                            {userLabel(row.created_by) !== "—" && (
                                                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                                                    {userLabel(row.created_by)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="block text-slate-500 dark:text-slate-400">
                                                {row.modified_at
                                                    ? dateFmt.format(new Date(row.modified_at))
                                                    : "—"}
                                            </div>
                                            {userLabel(row.modified_by) !== "—" && (
                                                <div className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
                                                    {userLabel(row.modified_by)}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            <AppModal
                open={projectTypeModalOpen}
                onClose={() => setProjectTypeModalOpen(false)}
                title={t("modal.selectProjectTypeTitle")}
                description={t("modal.selectProjectTypeDescription")}
                size="lg"
                className="overflow-visible"
                footer={
                    <>
                        <AppButton
                            type="button"
                            variant="secondary"
                            onClick={() => setProjectTypeModalOpen(false)}
                        >
                            {t("modal.cancel")}
                        </AppButton>
                        <AppButton
                            type="button"
                            onClick={continueToCreateForm}
                            disabled={!selectedProjectTypeId}
                        >
                            {t("modal.next")}
                        </AppButton>
                    </>
                }
            >
                <div className="space-y-4">
                    {projectTypesError ? (
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {projectTypesError}
                        </p>
                    ) : null}
                    <CheckmarkSelect
                        listLabel={t("modal.projectTypesList")}
                        buttonAriaLabel={t("modal.selectProjectTypeAria")}
                        value={selectedProjectTypeId ? String(selectedProjectTypeId) : ""}
                        onChange={(value) =>
                            setSelectedProjectTypeId(value ? Number(value) : null)
                        }
                        options={projectTypeOptions}
                        emptyLabel={
                            projectTypesLoading
                                ? t("modal.loadingProjectTypes")
                                : t("modal.selectProjectType")
                        }
                        disabled={projectTypesLoading || projectTypesError != null}
                        searchable
                        searchPlaceholder={t("modal.searchProjectTypes")}
                        portaled={false}
                        side="bottom"
                        className="w-full"
                    />
                    {!projectTypesLoading && !projectTypesError && projectTypeOptions.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {t("modal.noProjectTypes")}
                        </p>
                    ) : null}
                </div>
            </AppModal>
        </div>
    );
};

export default ProjectTypeFormList;
