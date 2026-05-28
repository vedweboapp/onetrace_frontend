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
import { EntityDataTable, entityCol } from "@/shared/components/entity";
import { useListUrlState } from "@/shared/hooks/use-list-url-state";
import { getProjectFormList } from "@/features/project-forms/api/project-forms.api";
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
                    if (Array.isArray(data)) {
                        setItems(data as FormListItem[]);
                        setPagination((prev) => ({
                            ...prev,
                            total_records: data.length,
                            total_pages: 1,
                            current_page: 1,
                        }));
                    } else if (data?.results) {
                        setItems(data.results as FormListItem[]);
                        setPagination({
                            total_records: data.count ?? data.results.length,
                            total_pages: data.total_pages ?? 1,
                            current_page: data.current_page ?? page,
                            page_size: pageSize,
                            next: data.next ?? null,
                            previous: data.previous ?? null,
                        });
                    } else if (Array.isArray(data?.data)) {
                        setItems(data.data as FormListItem[]);
                        setPagination({
                            total_records:
                                data.pagination?.total_records ?? data.data.length,
                            total_pages: data.pagination?.total_pages ?? 1,
                            current_page: data.pagination?.current_page ?? page,
                            page_size: data.pagination?.page_size ?? pageSize,
                            next: data.pagination?.next ?? null,
                            previous: data.pagination?.previous ?? null,
                        });
                    } else {
                        setItems([]);
                    }
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
                const { items } = await fetchProjectTypesPage(1, 50, {
                    is_active: true,
                });
                if (!cancelled) setProjectTypes(items);
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

    const projectTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
        () =>
            projectTypes.map((projectType) => ({
                value: String(projectType.id),
                label: projectType.project_type || `#${projectType.id}`,
            })),
        [projectTypes],
    );

    const pageRange = getListPageRange(pagination);

    const tableColumns = React.useMemo(() => {
        const c = entityCol<FormListItem>();
        return [
            c.custom("name", t("table.formName"), (row) => (
                <span className="font-medium text-slate-800 dark:text-slate-100">
                    {row.name || "—"}
                </span>
            )),
            c.mono(
                "api_name",
                t("table.apiName"),
                (row) => formApiName(row),
                { responsive: "sm" },
            ),
            c.custom(
                "project_type",
                t("table.projectType"),
                (row) => (
                    <span className="text-slate-600 dark:text-slate-300">
                        {projectTypeLabel(row.project_type)}
                    </span>
                ),
                { responsive: "md" },
            ),
            c.status(
                "status",
                t("table.status"),
                (r) => !!r.is_active,
                t("status.active"),
                t("status.inactive"),
            ),
            c.custom(
                "created",
                t("table.created"),
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
                t("table.updated"),
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
    }, [dateFmt, t]);

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
                ) : items.length === 0 ? (
                    <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t("empty")}
                    </div>
                ) : (
                    <EntityDataTable
                        columns={tableColumns}
                        rows={items}
                        onRowClick={(row) =>
                            router.push(
                                `/dashboard/settings/project-type-forms/create?purpose=edit__project_form&layout_id=${row.id}`,
                            )
                        }
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
