"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { routes } from "@/shared/config/routes";
import { getLayoutMetadata, updateLayoutStatus } from "../api/layout-api";
import {
    DataTable,
    DataTableBody,
    DataTableHead,
    DataTableRow,
    DataTableScroll,
    DataTableTd,
    DataTableTh,
    SurfaceShell,
    DashboardEmptyState,
    AppButton,
    ListPageSearchField
} from "@/shared/ui";
import { toastSuccess, toastError } from "@/shared/feedback/app-toast";
import { useTranslations } from "next-intl";
import { parseApiFailurePayload, resolveApiErrorUserText } from "@/core/errors/api-error-text";
import { ArrowLeft } from "lucide-react";

const LayoutDetails = () => {
    const t = useTranslations("Dashboard.settingsLayouts");
    const [searchQuery, setSearchQuery] = useState("");
    const [layouts, setLayouts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const route = useRouter();
    const params = useParams();
    const moduleId = params.id;

    useEffect(() => {
        if (!moduleId) return;
        const fetchLayouts = async () => {
            try {
                setLoading(true);
                const data = await getLayoutMetadata(moduleId as string);

                let layoutList: any[] = [];
                if (Array.isArray(data)) {
                    layoutList = data;
                } else if (data.layouts && Array.isArray(data.layouts)) {
                    layoutList = data.layouts;
                } else if (data.results && Array.isArray(data.results)) {
                    layoutList = data.results;
                } else if (data.data && Array.isArray(data.data)) {
                    layoutList = data.data;
                } else if (data.name || data.id) {
                    layoutList = [data];
                }

                setLayouts(layoutList);
            } catch (err) {
                console.error("Failed to load layouts", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLayouts();
    }, [moduleId]);

    const filteredLayouts = layouts.filter((layout) => {
        const layoutName = layout.name || layout.displayName || layout.layoutName || "Standard";
        return layoutName.toLowerCase().includes(searchQuery.toLowerCase());
    });
    const switchActiveStatus = async (layoutId: string | number, currentStatus: boolean) => {
        try {
            await updateLayoutStatus(moduleId as string, layoutId, !currentStatus);
            setLayouts((prev) =>
                prev.map((layout) =>
                    layout.id === layoutId ? { ...layout, is_active: !currentStatus } : layout
                )
            );
            toastSuccess(t("statusUpdatedToast"));
        } catch (err) {
            console.error("Failed to update layout status", err);
            toastError(resolveApiErrorUserText(parseApiFailurePayload(err)));
        }
    }
    if (loading) {
        return (
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
                {/* Top Bar Skeleton */}
                
                <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-[8px] shadow-sm">
                    <div className="h-9 w-[400px] bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                    <div className="h-9 w-32 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
                </div>
                {/* Data Table Skeleton */}
                <SurfaceShell className="rounded-[8px]">
                    <div className="p-6 space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                <div className="h-4 bg-slate-150 dark:bg-slate-850 rounded w-1/4 animate-pulse" />
                                <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/6 animate-pulse" />
                                <div className="h-6 w-11 bg-slate-100 dark:bg-slate-850 rounded-full animate-pulse" />
                            </div>
                        ))}
                    </div>
                </SurfaceShell>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            {/* Top Bar */}
            <div className="flex items-center gap-3">
                <button type="button" onClick={() => route.back()} className="inline-flex items-center gap-1 cursor-pointer text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100">
                    <ArrowLeft className="size-5 text-gray-600 dark:text-gray-400" />
                </button>
                <span className="ml-2 text-lg font-semibold text-slate-800 dark:text-slate-100">Layout Details</span>
            </div>
         
            <div className="flex items-center justify-between p-4 bg-white border border-slate-200/80 rounded-lg shadow-sm">
                <ListPageSearchField
                    value={searchQuery}
                    onCommit={setSearchQuery}
                    placeholder="Search layout..."
                    ariaLabel="Search layout"
                    className="max-w-[400px]"
                />

                <AppButton variant="primary" onClick={() => route.push(`${routes.dashboard.settingsModules}/${moduleId}/layout/create?purpose=create_layout`)}>
                    Create New Layout
                </AppButton>
            </div>

            {/* Table Section */}
            <SurfaceShell className="rounded-[8px]">
                {filteredLayouts.length === 0 ? (
                    <DashboardEmptyState
                        iconName="noResults"
                        title="No layouts found"
                        description={searchQuery ? `We couldn't find any layouts matching "${searchQuery}"` : "This module does not have any layouts yet."}
                    />
                ) : (
                    <DataTableScroll>
                        <DataTable>
                            <DataTableHead>
                                <tr>
                                    <DataTableTh>Layout</DataTableTh>
                                    <DataTableTh>Last Modified</DataTableTh>
                                    <DataTableTh className="text-right w-24">Active Status</DataTableTh>
                                </tr>
                            </DataTableHead>
                            <DataTableBody>
                                {filteredLayouts.map((row, idx) => {
                                    const layoutName = row.name || row.displayName || row.layoutName || "Standard Layout";
                                    const lastModified = row.updated_at || row.updatedAt || row.created_at || row.lastModified || "";
                                    const activeStatus = row.is_active !== undefined ? row.is_active : true;

                                    const formattedDate = lastModified ? new Date(lastModified).toLocaleDateString() : "N/A";
                                    const formattedTime = lastModified ? new Date(lastModified).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                                    return (
                                        <DataTableRow key={row.id || idx} clickable={true}>
                                            <DataTableTd className="font-semibold text-slate-800 dark:text-slate-100" onClick={() => route.push(`${routes.dashboard.settingsModules}/${moduleId}/layout/edit?layout_id=${row.id}&purpose=edit_layout`)}>
                                                {layoutName}
                                            </DataTableTd>
                                            <DataTableTd>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[13px] font-medium text-slate-600">{formattedDate}</span>
                                                    {formattedTime && <span className="text-[11px] font-medium text-slate-400">{formattedTime}</span>}
                                                </div>
                                            </DataTableTd>
                                            <DataTableTd className="text-right w-24" >
                                                <div className="flex items-center justify-end">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            switchActiveStatus(row.id, activeStatus);
                                                        }}
                                                        aria-checked={activeStatus}
                                                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${activeStatus ? 'bg-[#21C588]' : 'bg-slate-200'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${activeStatus ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                        />
                                                    </button>
                                                </div>
                                            </DataTableTd>
                                        </DataTableRow>
                                    );
                                })}
                            </DataTableBody>
                        </DataTable>
                    </DataTableScroll>
                )}
            </SurfaceShell>
        </div>
    );
};

export default LayoutDetails;