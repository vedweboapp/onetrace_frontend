"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  Check,
  RotateCw,
  Loader2,
  AlertCircle,
  FolderTree,
  Table2,
  SlidersHorizontal,
  PenLine,
  GripVertical,
  PanelTop,
  Image as ImageIcon,
  Columns2,
  Columns3,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { AppButton } from "@/shared/ui";
import {
  fetchModuleVariables,
  formatFieldLabel,
  formatModuleDisplayName,
  type VariableItem,
  type ModuleVariablesData,
} from "../../api/template-variables.api";
import { PinsListModal } from "./pins-list-modal";
import { SubformModal } from "./subform-modal";


type SidebarTab = "variables" | "components";

interface TemplateVariablesSidebarProps {
  editor: Editor | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  moduleName?: string;
  onOpenPinsListModal?: () => void;
  onOpenHeaderModal?: () => void;
  /** Called whenever the variable list for the active module is loaded/reloaded */
  onVariablesLoaded?: (variables: VariableItem[]) => void;
}

export const TemplateVariablesSidebar = React.memo(function TemplateVariablesSidebar({
  editor,
  collapsed,
  onToggleCollapse,
  onOpenPinsListModal,
  onOpenHeaderModal,
  onVariablesLoaded,
}: TemplateVariablesSidebarProps) {
  // Options & variables in the sidebar are independent of the template's module.
  // The user can freely toggle between "quotations" and "orders" to browse and insert variables.
  const [activeModule, setActiveModule] = useState<"quotations" | "orders">("quotations");
  const [activeTab, setActiveTab] = useState<SidebarTab>("variables");

  const [moduleData, setModuleData] = useState<ModuleVariablesData>({
    moduleName: activeModule,
    primaryKeys: [],
    relatedModules: {},
    allVariables: [],
    multivalueModules: {},
    singleModules: {},
    relatedModulesMeta: {},
  });

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Default option MUST be "all" as requested
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [lastInsertedTag, setLastInsertedTag] = useState<string | null>(null);
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [imagesGroupOpen, setImagesGroupOpen] = useState(false);
  const [pinsModalOpen, setPinsModalOpen] = useState(false);
  const [subformModalOpen, setSubformModalOpen] = useState(false);
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});

  const loadVariables = useCallback(async (targetModule: string) => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchModuleVariables(targetModule);
      setModuleData(data);
      onVariablesLoaded?.(data.allVariables);
    } catch (err: any) {
      console.warn(`Could not load variables for ${targetModule}:`, err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        `Failed to load ${targetModule} variables from API`;
      setLoadError(typeof msg === "string" ? msg : "Error loading variables");
      setModuleData({
        moduleName: targetModule,
        primaryKeys: [],
        relatedModules: {},
        allVariables: [],
        multivalueModules: {},
        singleModules: {},
        relatedModulesMeta: {},
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVariables(activeModule);
  }, [activeModule, loadVariables]);

  const handleSwitchModule = (target: "quotations" | "orders") => {
    if (activeModule === target) return;
    setActiveModule(target);
    setSelectedModuleFilter("all"); // Always default to "All Variables"
    setSearch("");
    // Components tab stays visible for both modules (signature is always available)
  };

  const toggleSectionCollapse = (sectionKey: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  const primaryName = moduleData.moduleName.toLowerCase();
  const primaryDisplay = formatModuleDisplayName(primaryName);

  // Group variables by module for display
  const groupedSections = useMemo(() => {
    const q = search.trim().toLowerCase();

    const filterList = (items: VariableItem[]) => {
      if (!q) return items;
      return items.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.key.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q)),
      );
    };

    const sections: {
      key: string;
      title: string;
      isPrimary: boolean;
      items: VariableItem[];
    }[] = [];

    // 1. Primary Module Section
    if (selectedModuleFilter === "all" || selectedModuleFilter === primaryName) {
      const filteredPrimary = filterList(moduleData.primaryKeys);
      if (filteredPrimary.length > 0 || !q) {
        sections.push({
          key: primaryName,
          title: `${primaryDisplay} (Primary)`,
          isPrimary: true,
          items: filteredPrimary,
        });
      }
    }

    // 2. Related Modules Sections (only "single" type relations shown in Variables tab)
    const singleMods = moduleData.singleModules && Object.keys(moduleData.singleModules).length > 0
      ? moduleData.singleModules
      : moduleData.relatedModules;
    Object.entries(singleMods).forEach(([relName, items]) => {
      const relKey = relName.toLowerCase();
      if (selectedModuleFilter === "all" || selectedModuleFilter === relKey) {
        const filteredRelated = filterList(items);
        if (filteredRelated.length > 0 || !q) {
          sections.push({
            key: relKey,
            title: formatFieldLabel(relName),
            isPrimary: false,
            items: filteredRelated,
          });
        }
      }
    });

    return sections;
  }, [moduleData, selectedModuleFilter, search, primaryName, primaryDisplay]);

  const totalMatchingCount = useMemo(() => {
    return groupedSections.reduce((acc, sec) => acc + sec.items.length, 0);
  }, [groupedSections]);

  const insertVariable = (tag: string) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "text",
        text: `${tag} `,
      })
      .run();

    setLastInsertedTag(tag);
    setTimeout(() => {
      setLastInsertedTag((curr) => (curr === tag ? null : curr));
    }, 1200);
  };

  const handleInsertSignature = () => {
    if (!editor) return;
    (editor.chain().focus() as any)
      .insertSignature({
        imageKey: "",
        width: "320px",
        alignment: "left",
      })
      .run();
  };

  const handleInsertImageLayout = useCallback(
    (layout: "single" | "two" | "three") => {
      if (!editor) return;
      const count = layout === "single" ? 1 : layout === "two" ? 2 : 3;
      (editor.chain().focus() as any)
        .insertImageLayout({
          layout,
          srcs: Array(count).fill(""),
          alts: Array(count).fill(""),
          gap: "12px",
          height: "200px",
          fit: "contain",
        })
        .run();
    },
    [editor],
  );


  const TABS: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    {
      id: "variables",
      label: "Variables",
      icon: <Tag className="size-3" />,
    },
    {
      id: "components",
      label: "Components",
      icon: <Table2 className="size-3" />,
    },
  ];

  if (collapsed) {
    return (
      <div className="w-10 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-3 select-none">
        <button
          type="button"
          onClick={onToggleCollapse}
          title="Expand Options & Variables"
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 transition"
        >
          <ChevronRight size={16} />
        </button>
        <div className="mt-8 [writing-mode:vertical-rl] rotate-180 text-[11px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider flex items-center gap-1.5">
          <Tag size={12} />
          <span>VARIABLES & OPTIONS</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="w-80 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full min-h-0 select-none z-10 shadow-xs">
      {/* ── Header ── */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-900">
        <div className="flex items-center gap-1.5 min-w-0">
          <FileSpreadsheet className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <h2 className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
            Options & Variables
          </h2>
          <span className="text-[10px] text-slate-400 font-mono">
            ({moduleData.allVariables.length})
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void loadVariables(activeModule)}
            disabled={loading}
            title={`Reload from API (listmodules?module_name=${activeModule})`}
            className="p-1 rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition disabled:opacity-40"
          >
            <RotateCw size={13} className={cn(loading && "animate-spin text-blue-500")} />
          </button>
          <button
            type="button"
            onClick={onToggleCollapse}
            title="Collapse panel"
            className="p-1 rounded text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      {/* ── Module Switcher Buttons (always visible) ── */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5 bg-slate-50/40 dark:bg-slate-900/40">
        <div className="grid grid-cols-2 gap-2">
          <AppButton
            variant={activeModule === "quotations" ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleSwitchModule("quotations")}
            className="w-full justify-center"
          >
            <Receipt className="size-3.5" />
            <span>Quotation</span>
          </AppButton>
          <AppButton
            variant={activeModule === "orders" ? "primary" : "secondary"}
            size="sm"
            onClick={() => handleSwitchModule("orders")}
            className="w-full justify-center"
          >
            <ShoppingCart className="size-3.5" />
            <span>Orders</span>
          </AppButton>
        </div>

        {/* ── Search (always visible) ── */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${moduleData.allVariables.length} fields…`}
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* ── Tabs: Variables | Components ── */}
        <div className="flex gap-0.5 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800/60">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              title={tab.label}
              className={cn(
                "flex-1 flex items-center justify-center gap-1 px-1.5 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-150 cursor-pointer",
                activeTab === tab.id
                  ? "bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200",
              )}
            >
              {tab.icon}
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </div>

        {loadError && (
          <div className="flex items-center justify-between gap-1 text-[10px] text-amber-600 dark:text-amber-400 px-0.5">
            <span className="truncate flex items-center gap-1">
              <AlertCircle size={11} className="shrink-0" />
              {loadError}
            </span>
            <button
              type="button"
              onClick={() => void loadVariables(activeModule)}
              className="underline font-semibold shrink-0 cursor-pointer hover:text-amber-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ══ VARIABLES TAB ══ */}
        {activeTab === "variables" && (
          <div className="p-2.5 space-y-2.5">
            {/* Filter Dropdown */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-0.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Filter By Module
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  {selectedModuleFilter === "all"
                    ? `${moduleData.allVariables.length} total`
                    : selectedModuleFilter === primaryName
                      ? `${moduleData.primaryKeys.length} fields`
                      : `${moduleData.relatedModules[selectedModuleFilter]?.length ?? 0} fields`}
                </span>
              </div>
              <div className="relative">
                <select
                  value={selectedModuleFilter}
                  onChange={(e) => setSelectedModuleFilter(e.target.value)}
                  className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none shadow-2xs"
                >
                  <option value="all">All Variables ({moduleData.allVariables.length})</option>
                  {moduleData.primaryKeys.length > 0 && (
                    <option value={primaryName}>
                      {primaryDisplay} ({moduleData.primaryKeys.length}) — Primary
                    </option>
                  )}
                  {Object.keys(moduleData.singleModules ?? moduleData.relatedModules).length > 0 && (
                    <optgroup label="Related Modules">
                      {Object.entries(moduleData.singleModules ?? moduleData.relatedModules).map(([relName, items]) => (
                        <option key={relName} value={relName.toLowerCase()}>
                          {formatFieldLabel(relName)} ({items.length})
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown
                  size={13}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                />
              </div>
            </div>

            {/* Variables List */}
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500">
                Click variable to insert
              </p>
              {loading && (
                <span className="flex items-center gap-1 text-[10px] text-blue-500">
                  <Loader2 size={10} className="animate-spin" />
                  Loading…
                </span>
              )}
            </div>

            {loading && moduleData.allVariables.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                <Loader2 size={18} className="animate-spin text-blue-500" />
                <span>Loading {primaryDisplay} variables from API…</span>
              </div>
            ) : totalMatchingCount === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500 space-y-2">
                <p>
                  {search
                    ? `No variables match "${search}"`
                    : `No variables returned from API for ${primaryDisplay}`}
                </p>
                {selectedModuleFilter !== "all" && search ? (
                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter("all")}
                    className="text-blue-600 dark:text-blue-400 hover:underline text-[11px]"
                  >
                    Search in All Variables
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void loadVariables(activeModule)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition cursor-pointer"
                  >
                    <RotateCw size={11} />
                    <span>Reload</span>
                  </button>
                )}
              </div>
            ) : (
              groupedSections.map((section) => {
                const isCollapsed = Boolean(collapsedSections[section.key]);
                return (
                  <div
                    key={section.key}
                    className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/40 overflow-hidden"
                  >
                    {/* Section Accordion Header */}
                    <button
                      type="button"
                      onClick={() => toggleSectionCollapse(section.key)}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left transition cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {section.isPrimary ? (
                          activeModule === "orders" ? (
                            <ShoppingCart size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          ) : (
                            <Receipt size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                          )
                        ) : (
                          <FolderTree size={13} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {section.title}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          ({section.items.length})
                        </span>
                      </div>
                      <ChevronDown
                        size={14}
                        className={cn(
                          "text-slate-400 transition-transform duration-200 shrink-0",
                          isCollapsed && "-rotate-90",
                        )}
                      />
                    </button>

                    {/* Section Items */}
                    {!isCollapsed && (
                      <div className="p-1.5 space-y-1">
                        {section.items.length === 0 ? (
                          <p className="text-[10.5px] text-slate-400 py-1.5 px-2 text-center">
                            No fields match filter
                          </p>
                        ) : (
                          section.items.map((item) => {
                            const isInserted = lastInsertedTag === item.tag;
                            const isExpanded = Boolean(expandedFields[item.key]);

                            if (item.hasChildren && item.children && item.children.length > 0) {
                              // Expandable parent field (single relation)
                              return (
                                <div key={item.key} className="space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setExpandedFields((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                                    title={`Expand ${item.label} fields`}
                                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-left transition-all duration-150 cursor-pointer group border-blue-200/70 bg-blue-50/40 hover:border-blue-400 hover:bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-950/20 dark:hover:border-blue-700"
                                  >
                                    <span className="shrink-0 text-[11.5px] font-semibold text-blue-700 dark:text-blue-300 whitespace-nowrap flex items-center gap-1">
                                      <FolderTree size={11} className="text-blue-500" />
                                      {item.label}
                                    </span>
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 truncate">{item.tag}</span>
                                      <ChevronDown size={12} className={cn("text-blue-400 transition-transform shrink-0", isExpanded && "rotate-180")} />
                                    </div>
                                  </button>
                                  {isExpanded && (
                                    <div className="ml-3 space-y-0.5 border-l-2 border-blue-200 dark:border-blue-800 pl-2">
                                      {item.children.map((child) => {
                                        const childInserted = lastInsertedTag === child.tag;
                                        return (
                                          <button
                                            key={child.key}
                                            type="button"
                                            onClick={() => insertVariable(child.tag)}
                                            title={`Click to insert ${child.tag}`}
                                            className={cn(
                                              "w-full flex items-center justify-between gap-2 px-2 py-1 rounded-md border text-left transition-all duration-150 cursor-pointer group text-[11px]",
                                              childInserted
                                                ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                                                : "border-slate-200/80 bg-white hover:border-blue-300 hover:bg-blue-50/40 dark:border-slate-700/60 dark:bg-slate-800 dark:hover:border-blue-600/60"
                                            )}
                                          >
                                            <span className="shrink-0 font-medium text-slate-700 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap">
                                              {child.label}
                                            </span>
                                            <span className={cn(
                                              "min-w-0 font-mono text-[9px] px-1 py-0.5 rounded transition truncate",
                                              childInserted
                                                ? "bg-emerald-600 text-white"
                                                : "bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-slate-900 dark:text-slate-400"
                                            )}>
                                              {childInserted ? <span className="flex items-center gap-0.5"><Check size={9} />Inserted</span> : child.tag}
                                            </span>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            }

                            return (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => insertVariable(item.tag)}
                                title={`Click to insert ${item.tag}`}
                                className={cn(
                                  "w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md border text-left transition-all duration-150 cursor-pointer group",
                                  isInserted
                                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                                    : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs dark:border-slate-700/80 dark:bg-slate-800 dark:hover:border-blue-500/70 dark:hover:bg-slate-700/60",
                                )}
                              >
                                {/* Label — takes priority, never wraps */}
                                <span className="shrink-0 text-[11.5px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 whitespace-nowrap">
                                  {item.label}
                                </span>

                                {/* Badge Tag — fills remaining space, truncates with … */}
                                <span
                                  className={cn(
                                    "min-w-0 font-mono text-[9.5px] font-medium px-1.5 py-0.5 rounded transition truncate",
                                    isInserted
                                      ? "bg-emerald-600 text-white"
                                      : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300 dark:border dark:border-slate-700/60 dark:group-hover:bg-blue-950/70 dark:group-hover:text-blue-300 dark:group-hover:border-blue-700/70",
                                  )}
                                >
                                  {isInserted ? (
                                    <span className="flex items-center justify-end gap-0.5">
                                      <Check size={10} />
                                      Inserted
                                    </span>
                                  ) : (
                                    item.tag
                                  )}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ══ COMPONENTS TAB: Items Table + Signature ══ */}
        {activeTab === "components" && (
          <div className="p-3 space-y-4">

            {/* ─── Items Table Section (Quotation only) ─── */}
            {activeModule === "quotations" ? (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                  Items Table
                </p>
                <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                  Configure columns and insert a dynamic items table. Quantity and pricing columns are always included.
                </div>
                <button
                  type="button"
                  onClick={() => (onOpenPinsListModal ? onOpenPinsListModal() : setPinsModalOpen(true))}
                  className="w-full flex items-center justify-between gap-2.5 p-3 rounded-lg border border-slate-200/90 hover:border-blue-400/80 bg-white hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition shadow-2xs group cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                      <Table2 className="size-4" />
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="text-xs font-semibold leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                        <span>Items Table</span>
                        <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                          Config
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate mt-0.5">
                        Choose columns &amp; insert into editor
                      </div>
                    </div>
                  </div>
                  <SlidersHorizontal className="size-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3 text-[10.5px] text-slate-400 dark:text-slate-500 text-center">
                Items Table is only available for the Quotation module.
              </div>
            )}

            {/* ─── Subform Table Section ─── */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                Subform Table
              </p>
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Create a dynamic table from any related module (e.g. sections, sites). Select variables to generate custom columns.
              </div>
              <div
                draggable
                onDragStart={(e) => {
                  const mvMods = moduleData.multivalueModules && Object.keys(moduleData.multivalueModules).length > 0
                    ? moduleData.multivalueModules
                    : moduleData.relatedModules;
                  const firstRelModule = Object.keys(mvMods)[0] || "sections";
                  const relVars = mvMods[firstRelModule] || [];
                  const defaultCols = relVars.slice(0, 4).map((v) => v.key.replace(/^.*?\./, "")) || ["name"];
                  const payload = {
                    key: "subform",
                    module: firstRelModule,
                    type: "subformtable",
                    title: "",
                    columns: defaultCols,
                  };
                  e.dataTransfer.setData("application/x-subform-table", JSON.stringify(payload));
                  e.dataTransfer.setData(
                    "text/html",
                    `<div data-subform-table="true" data-key="subform" data-module="${firstRelModule}" data-type="subformtable" data-columns="${defaultCols.join(",")}" data-title=""></div>`,
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => setSubformModalOpen(true)}
                className="w-full flex items-center justify-between gap-2.5 p-3 rounded-lg border border-slate-200/90 hover:border-blue-400/80 bg-white hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition shadow-2xs group cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <Table2 className="size-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-semibold leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                      <span>Subform Table</span>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Dynamic
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate mt-0.5">
                      Select module &amp; columns to insert
                    </div>
                  </div>
                </div>
                <SlidersHorizontal className="size-4 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 group-hover:scale-110 transition-transform" />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* ─── Signature Section ─── */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 px-0.5">
                Signature
              </p>
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-2.5 text-[10.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Drag into the document to place a signature block. Configure the signature image key directly on the placed block.
              </div>

              {/* Draggable Component Card */}
              <div
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-signature-block", "true");
                  e.dataTransfer.setData(
                    "text/html",
                    '<div data-signature-block="true" data-image-key="" data-width="320px" data-alignment="left"></div>',
                  );
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={handleInsertSignature}
                className="w-full flex items-center justify-between gap-2.5 p-3 rounded-lg border border-slate-200/90 hover:border-blue-400/80 bg-white hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition shadow-2xs group cursor-grab active:cursor-grabbing select-none"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                    <PenLine className="size-4" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-semibold leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 flex items-center gap-1.5">
                      <span>Signature Block</span>
                      <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        Drag
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate mt-0.5">
                      Drag into document or click to insert
                    </div>
                  </div>
                </div>
                <div className="flex items-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  <GripVertical className="size-4" />
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-slate-100 dark:border-slate-800" />

            {/* ─── Images Group Container ─── */}
            <div className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/40 overflow-hidden shadow-2xs">
              {/* Group Header */}
              <button
                type="button"
                onClick={() => setImagesGroupOpen((prev) => !prev)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-slate-100/70 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <ImageIcon className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block leading-tight">
                      Images
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Multi-layout image blocks
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700/60 px-1.5 py-0.5 rounded">
                    3 options
                  </span>
                  <ChevronDown
                    size={14}
                    className={cn(
                      "text-slate-400 transition-transform duration-200 shrink-0",
                      !imagesGroupOpen && "-rotate-90",
                    )}
                  />
                </div>
              </button>

              {/* Group Body: Options lined in order */}
              {imagesGroupOpen && (
                <div className="p-2 space-y-2 bg-white/60 dark:bg-slate-900/30">
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 px-1 leading-relaxed">
                    Drag any layout into the document or click to insert.
                  </div>

                  <div className="space-y-1.5">
                    {[
                      {
                        layout: "single" as const,
                        count: 1,
                        title: "1 Image",
                        subtitle: "Single full-width image",
                        icon: <ImageIcon className="size-3.5" />,
                        preview: (
                          <div className="w-full h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                        ),
                      },
                      {
                        layout: "two" as const,
                        count: 2,
                        title: "2 Images",
                        subtitle: "Side by side (2 columns)",
                        icon: <Columns2 className="size-3.5" />,
                        preview: (
                          <div className="flex gap-1 w-full">
                            <div className="flex-1 h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                            <div className="flex-1 h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                          </div>
                        ),
                      },
                      {
                        layout: "three" as const,
                        count: 3,
                        title: "3 Images",
                        subtitle: "3 equal columns layout",
                        icon: <Columns3 className="size-3.5" />,
                        preview: (
                          <div className="flex gap-1 w-full">
                            <div className="flex-1 h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                            <div className="flex-1 h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                            <div className="flex-1 h-2.5 rounded bg-blue-100 dark:bg-blue-950/70 border border-blue-200/60 dark:border-blue-800/40" />
                          </div>
                        ),
                      },
                    ].map((item) => (
                      <div
                        key={item.layout}
                        draggable
                        onDragStart={(e) => {
                          const payload = {
                            layout: item.layout,
                            srcs: Array(item.count).fill(""),
                            alts: Array(item.count).fill(""),
                            gap: "12px",
                            height: "200px",
                            fit: "contain",
                          };
                          e.dataTransfer.setData("application/x-image-layout", JSON.stringify(payload));
                          e.dataTransfer.setData(
                            "text/html",
                            `<div data-image-layout-block="true" data-layout="${item.layout}" data-gap="12px" data-height="200px" data-fit="contain"></div>`,
                          );
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => handleInsertImageLayout(item.layout)}
                        className="w-full flex items-center justify-between gap-2.5 p-2 rounded-lg border border-slate-200/80 hover:border-blue-400/80 bg-white hover:bg-blue-50/40 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 transition shadow-2xs group cursor-grab active:cursor-grabbing select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="size-7 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center shrink-0 transition-colors shadow-2xs">
                            {item.icon}
                          </div>
                          <div className="min-w-0 flex-1 text-left">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold leading-tight truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                {item.title}
                              </span>
                              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                                Drag
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-tight truncate mt-0.5 mb-1">
                              {item.subtitle}
                            </div>
                            {item.preview}
                          </div>
                        </div>
                        <div className="flex items-center text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 shrink-0 transition-colors">
                          <GripVertical className="size-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>


          </div>
        )}

      </div>

      {/* ── Pins List Configurator Modal ── */}
      <PinsListModal
        open={pinsModalOpen}
        onClose={() => setPinsModalOpen(false)}
        editor={editor}
        variables={moduleData.allVariables}
      />

      {/* ── Subform Table Configurator Modal ── */}
      <SubformModal
        open={subformModalOpen}
        onClose={() => setSubformModalOpen(false)}
        editor={editor}
        moduleData={moduleData}
      />
    </aside>
  );
});
