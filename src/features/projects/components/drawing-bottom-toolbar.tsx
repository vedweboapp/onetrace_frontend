"use client";

import React from "react";
import { Crosshair, Hand, MapPin, MapPinned, PenTool, SquareDashed } from "lucide-react";
import { AppButton, CheckmarkSelect } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import type { LocalPlot, Tool } from "./project-drawing-editor-screen";

type Props = {
    t: (key: string) => string;
    plots: LocalPlot[];
    selectedPlotId: string;
    setSelectedPlotId: (id: string) => void;
    selectedGroupId: string;
    setSelectedGroupId: (id: string) => void;
    selectedCompositeId: string;
    setSelectedCompositeId: (id: string) => void;
    groupOptions: { value: string; label: string }[];
    compositeOptions: { value: string; label: string }[];
    activeTool: Tool;
    setActiveTool: (tool: Tool) => void;
    dirty: boolean;
    savingAll: boolean;
    saveAllChanges: () => void;
    selectedPlot: LocalPlot | null;
    savingPin: boolean;
    sidebarOpen: boolean;
};

const DrawingBottomToolbar = ({
    t,
    plots,
    selectedPlotId,
    setSelectedPlotId,
    selectedGroupId,
    setSelectedGroupId,
    selectedCompositeId,
    setSelectedCompositeId,
    groupOptions,
    compositeOptions,
    activeTool,
    setActiveTool,
    dirty,
    savingAll,
    saveAllChanges,
    selectedPlot,
    savingPin,
    sidebarOpen,
}: Props) => {
    return (
        <div className={cn(
            "fixed bottom-8 right-0 z-50 flex items-center justify-center px-6 transition-all",
            sidebarOpen ? "md:left-64" : "md:left-[52px]",
            "left-0"
        )}>
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-white px-3 py-2 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
                <div className="flex items-center gap-2">
                    <CheckmarkSelect
                        listLabel={`${t("choosePlot")} *`}
                        options={plots.map((p) => ({ value: String(p.id), label: p.name }))}
                        value={selectedPlotId}
                        onChange={setSelectedPlotId}
                        emptyLabel={t("choosePlot")}
                        side="top"
                    />
                    <CheckmarkSelect
                        listLabel={`${t("chooseGroup")} *`}
                        options={groupOptions}
                        value={selectedGroupId}
                        onChange={(v) => {
                            setSelectedGroupId(v);
                            setSelectedCompositeId("");
                        }}
                        emptyLabel={t("allGroups")}
                        side="top"
                    />
                    <CheckmarkSelect
                        listLabel={`${t("chooseComposite")} *`}
                        options={compositeOptions}
                        value={selectedCompositeId}
                        onChange={setSelectedCompositeId}
                        emptyLabel={t("selectComposite")}
                        side="top"
                    />
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-center gap-1.5">
                    {[
                        { id: "pen", icon: <PenTool className="size-4" />,  },
                        { id: "plot-select", icon: <SquareDashed className="size-4" />, },
                        {
                            id: "pin",
                            icon: <MapPin  className="size-4" />,
                            label: t("toolPin"),
                            disabled: !selectedPlot || !selectedGroupId || !selectedCompositeId || savingPin,
                        },
                        { id: "hand", icon: <Hand className="size-4" />,},
                    ].map((tool) => (
                        <AppButton
                            key={tool.id}
                            type="button"
                            size="sm"
                            variant={activeTool === tool.id ? "primary" : "secondary"}
                            disabled={Boolean(tool.disabled)}
                            onClick={() => setActiveTool(tool.id as Tool)}
                            className={cn(
                                "h-10 px-4",
                                activeTool !== tool.id && "hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                        >
                            {tool.icon} 
                        </AppButton>
                    ))}
                </div>
            </div>

            <div className="absolute right-6 flex items-center gap-3 lg:right-10">
                <AppButton
                    type="button"
                    size="sm"
                    variant="primary"
                    className="h-10 px-6 font-bold shadow-lg shadow-blue-500/20"
                    disabled={!dirty || savingAll}
                    loading={savingAll}
                    onClick={() => void saveAllChanges()}
                >
                    {t("saveAll")}
                </AppButton>
            </div>
        </div>
    );
};

export default DrawingBottomToolbar;