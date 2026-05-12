"use client";

import React from "react";
import { Hand, Layers, MapPin, MousePointer2, PenTool, SquareDashed } from "lucide-react";
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
    selectedPlot: LocalPlot | null;
    savingPin: boolean;
    sidebarOpen: boolean;
    showVariations: boolean;
    onToggleVariations: () => void;
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
    selectedPlot,
    savingPin,
    sidebarOpen,
    showVariations,
    onToggleVariations,
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

                {/* Variation Switch */}
                <div className="flex items-center gap-2.5 px-1">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showVariations}
                    onClick={onToggleVariations}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none ${
                      showVariations ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                        showVariations ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 select-none whitespace-nowrap">
                    Variations
                  </span>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-center gap-1.5">
                    {[
                        { id: "select", icon: <MousePointer2 className="size-4" />, nameKey: "toolSelect", fallback: "Select", shortcut: "V" },
                        { id: "pen", icon: <PenTool className="size-4" />, nameKey: "toolPen", fallback: "Pen", shortcut: "P" },
                        { id: "plot-select", icon: <SquareDashed className="size-4" />, nameKey: "toolBox", fallback: "Box", shortcut: "B" },
                        {
                            id: "pin",
                            icon: <MapPin  className="size-4" />,
                            nameKey: "toolPin",
                            fallback: "Pin",
                            shortcut: "A",
                            disabled: !selectedPlot || !selectedCompositeId || savingPin,
                        },
                        { id: "hand", icon: <Hand className="size-4" />, nameKey: "toolHand", fallback: "Hand", shortcut: "H" },
                    ].map((tool) => {
                        let translatedName: any = "";
                        try {
                            translatedName = t(tool.nameKey);
                        } catch (e) {
                            translatedName = "";
                        }
                        
                        const name = (typeof translatedName === "string" && translatedName && !translatedName.includes("MISSING_MESSAGE")) 
                            ? translatedName 
                            : tool.fallback;

                        return (
                            <AppButton
                                key={tool.id}
                                type="button"
                                size="sm"
                                variant={activeTool === tool.id ? "primary" : "secondary"}
                                disabled={Boolean(tool.disabled)}
                                onClick={() => setActiveTool(tool.id as Tool)}
                                title={`${name} (${tool.shortcut})`}
                                className={cn(
                                    "h-10 px-4",
                                    activeTool !== tool.id && "hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {tool.icon} 
                            </AppButton>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};

export default DrawingBottomToolbar;