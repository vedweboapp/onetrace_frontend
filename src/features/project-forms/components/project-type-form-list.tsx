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
import { toastSuccess, toastApiError, getApiErrorDisplayMessage } from "@/shared/feedback/app-toast";
import { fetchProjectTypesPage } from "@/features/project-types/api/project-type.api";
import type { ProjectType } from "@/features/project-types/types/project-type.types";
import { fetchInstallationTypesPage } from "@/features/installation-types/api/installation-type.api";
import type { InstallationType } from "@/features/installation-types/types/installation-type.types";
import { listPageSizeSelectOptions } from "@/shared/utils/list-page-size.util";
import { getListPageRange } from "@/shared/utils/list-pagination-range.util";
import { useDashboardDateFormat } from "@/shared/hooks/use-dashboard-date-format";
import { DashboardAppBrand } from "@/features/dashboard/components/dashboard-app-brand";
import { routes } from "@/shared/config/routes";

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
    if (!record) return textValue(value) || "—";
    return (
        textValue(record.project_type) ||
        textValue(record.name) ||
        textValue(record.label) ||
        (record.id != null ? `#${String(record.id)}` : "—")
    );
}

function installationTypeLabel(value: unknown): string {
    const record = asRecord(value);
    if (!record) return textValue(value) || "—";
    return (
        textValue(record.installation_type) ||
        textValue(record.name) ||
        textValue(record.label) ||
        (record.id != null ? `#${String(record.id)}` : "—")
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
        useListUrlState({ defaultPageSize: 20 });
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

    // Installation type state
    const [installationTypes, setInstallationTypes] = React.useState<InstallationType[]>([]);
    const [installationTypesLoading, setInstallationTypesLoading] = React.useState(false);
    const [installationTypesError, setInstallationTypesError] = React.useState<string | null>(null);
    const [selectedInstallationTypeId, setSelectedInstallationTypeId] = React.useState<number | null>(null);
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
    }, [page, pageSize, search, t]);

    React.useEffect(() => {
        if (!projectTypeModalOpen) return;
        let cancelled = false;
        (async () => {
            // Fetch project types
            setProjectTypesLoading(true);
            setProjectTypesError(null);
            try {
                const response = await fetchProjectTypesPage(1, 50, {
                    is_active: true,
                });
                if (!cancelled) {
                    setProjectTypes(Array.isArray(response.items) ? response.items : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setProjectTypes([]);
                    setProjectTypesError(t("projectTypesLoadError"));
                }
            } finally {
                if (!cancelled) setProjectTypesLoading(false);
            }

            // Fetch installation types
            setInstallationTypesLoading(true);
            setInstallationTypesError(null);
            try {
                const response = await fetchInstallationTypesPage(1, 50, { is_active: true });
                if (!cancelled) {
                    setInstallationTypes(Array.isArray(response.items) ? response.items : []);
                }
            } catch (error) {
                if (!cancelled) {
                    setInstallationTypes([]);
                    setInstallationTypesError(t("installationTypesLoadError"));
                }
            } finally {
                if (!cancelled) setInstallationTypesLoading(false);
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
        if (!selectedProjectTypeId || !selectedInstallationTypeId) return;
        setProjectTypeModalOpen(false);
        router.push(
            `${routes.dashboard.settingsProjectForms}/${selectedProjectTypeId}/create?purpose=create_project_form&installation_type_id=${selectedInstallationTypeId}`,
        );
    }, [router, selectedProjectTypeId, selectedInstallationTypeId]);

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
                toastApiError(error, t("statusUpdateErrorToast"));
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

    const installationTypeOptions = React.useMemo<CheckmarkSelectOption[]>(
        () =>
            Array.isArray(installationTypes)
                ? installationTypes.map((inst) => ({
                    value: String(inst.id),
                    label: inst.installation_type || `#${inst.id}`,
                }))
                : [],
        [installationTypes],
    );

    const pageRange = getListPageRange(pagination);

    return (
            <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
            <div className="flex shrink-0 items-center justify-between gap-3">
                <ListPageSearchField 
                    placeholder={t("searchPlaceholder")}
                    ariaLabel={t("searchAria")}
                    value={search}
                    onCommit={commitSearch}
                    className="sm:max-w-sm"
                />
                <AppButton onClick={openProjectTypePicker}>
                    <Plus className="size-4" /> {t("createNewForm")}
                </AppButton>
            </div>

            <SurfaceShell className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-none border border-slate-200 dark:border-slate-800">
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
                    <div className="min-h-0 flex-1 overflow-auto">
                        <table className="w-full border-collapse text-left text-sm">
                            <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.formName")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.apiName")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.projectType")}</th>
                                    <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">{t("table.installationType")}</th>
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
                                                `${routes.dashboard.settingsProjectForms}/create?purpose=edit_project_form&layout_id=${row.id}`,
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
                                        <td className="px-4 py-3">
                                            <span className="text-slate-600 dark:text-slate-300">
                                                {installationTypeLabel(row.installation_type)}
                                            </span>
                                        </td>
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
                            disabled={!selectedProjectTypeId || !selectedInstallationTypeId}
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
                    {/* Installation Type Select */}
                    <CheckmarkSelect
                      listLabel={t("modal.installationTypesList")}
                      buttonAriaLabel={t("modal.selectInstallationTypeAria")}
                      value={selectedInstallationTypeId ? String(selectedInstallationTypeId) : ""}
                      onChange={(value) =>
                        setSelectedInstallationTypeId(value ? Number(value) : null)
                      }
                      options={installationTypeOptions}
                      emptyLabel={
                        installationTypesLoading
                          ? t("modal.loadingInstallationTypes")
                          : t("modal.selectInstallationType")
                      }
                      disabled={installationTypesLoading || installationTypesError != null}
                      searchable
                      searchPlaceholder={t("modal.searchInstallationTypes")}
                      portaled={false}
                      side="bottom"
                      className="w-full mt-2"
                    />
                    {!projectTypesLoading && !projectTypesError && projectTypeOptions.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {t("modal.noProjectTypes")}
                      </p>
                    ) : null}
                    {!installationTypesLoading && !installationTypesError && installationTypeOptions.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {t("modal.noInstallationTypes")}
                      </p>
                    ) : null}
                </div>
            </AppModal>
        </div>
    );
};

export default ProjectTypeFormList;
