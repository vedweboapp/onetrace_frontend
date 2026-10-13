"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import type { Editor } from "@tiptap/react";
import {
  FileSpreadsheet,
  Receipt,
  ShoppingCart,
  Search,
  Plus,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  Check,
  RotateCw,
  Loader2,
  AlertCircle,
  FolderTree,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  fetchModuleVariables,
  formatFieldLabel,
  formatModuleDisplayName,
  type VariableItem,
  type ModuleVariablesData,
} from "../../api/template-variables.api";

interface TemplateVariablesSidebarProps {
  editor: Editor | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  moduleName?: string;
}

export const TemplateVariablesSidebar = React.memo(function TemplateVariablesSidebar({
  editor,
  collapsed,
  onToggleCollapse,
  moduleName = "quotations",
}: TemplateVariablesSidebarProps) {
  // Current active top-level module: "quotations" or "orders"
  const [activeModule, setActiveModule] = useState<string>(
    moduleName.toLowerCase() === "orders" ? "orders" : "quotations",
  );

  const [moduleData, setModuleData] = useState<ModuleVariablesData>({
    moduleName: activeModule,
    primaryKeys: [],
    relatedModules: {},
    allVariables: [],
  });

  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // Default option MUST be "all" as requested
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [lastInsertedTag, setLastInsertedTag] = useState<string | null>(null);
  const [customTagInput, setCustomTagInput] = useState("");
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const loadVariables = useCallback(async (targetModule: string) => {
    try {
      setLoading(true);
      setLoadError(null);
      const data = await fetchModuleVariables(targetModule);
      setModuleData(data);
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
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadVariables(activeModule);
  }, [activeModule, loadVariables]);

  // Keep in sync if parent moduleName prop changes
  useEffect(() => {
    const next = moduleName.toLowerCase() === "orders" ? "orders" : "quotations";
    if (next !== activeModule) {
      setActiveModule(next);
      setSelectedModuleFilter("all");
      setSearch("");
    }
  }, [moduleName]);

  const handleSwitchModule = (target: "quotations" | "orders") => {
    if (activeModule === target) return;
    setActiveModule(target);
    setSelectedModuleFilter("all"); // Always default to "All Variables"
    setSearch("");
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

    // 2. Related Modules Sections
    Object.entries(moduleData.relatedModules).forEach(([relName, items]) => {
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

  const handleInsertCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customTagInput.trim().replace(/^<|>$/g, "");
    if (!clean) return;
    insertVariable(`<${clean}>`);
    setCustomTagInput("");
  };

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
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-850">
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

      {/* ── Controls: Module Buttons + Filter Dropdown + Search ── */}
      <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0 space-y-2.5 bg-slate-50/40 dark:bg-slate-850/40">
        {/* Module Switcher Buttons (Quotation & Orders) */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-200/70 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => handleSwitchModule("quotations")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeModule === "quotations"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
            )}
          >
            <Receipt size={13} />
            <span>Quotation</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchModule("orders")}
            className={cn(
              "flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              activeModule === "orders"
                ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100",
            )}
          >
            <ShoppingCart size={13} />
            <span>Orders</span>
          </button>
        </div>

        {/* Dropdown with "All Variables" as Default */}
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
              {/* "All Variables" is the default first option */}
              <option value="all">
                All Variables ({moduleData.allVariables.length})
              </option>

              {moduleData.primaryKeys.length > 0 && (
                <option value={primaryName}>
                  {primaryDisplay} ({moduleData.primaryKeys.length}) — Primary
                </option>
              )}

              {Object.keys(moduleData.relatedModules).length > 0 && (
                <optgroup label="Related Modules">
                  {Object.entries(moduleData.relatedModules).map(([relName, items]) => (
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

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              selectedModuleFilter === "all"
                ? `Search all ${moduleData.allVariables.length} fields…`
                : `Search ${selectedModuleFilter === primaryName ? primaryDisplay : formatFieldLabel(selectedModuleFilter)} fields…`
            }
            className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
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

      {/* ── Variables List ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-0">
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
                      <FolderTree size={13} className="text-purple-600 dark:text-purple-400 shrink-0" />
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
                                : "border-slate-200/90 bg-white hover:border-blue-400 hover:bg-blue-50/50 hover:shadow-xs dark:border-slate-800 dark:bg-slate-850 dark:hover:border-blue-600 dark:hover:bg-blue-950/20",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11.5px] font-medium text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400">
                                  {item.label}
                                </span>
                              </div>
                              {item.description && (
                                <p className="text-[9.5px] text-slate-400 dark:text-slate-500 truncate mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>

                            {/* Badge Tag */}
                            <div className="shrink-0 flex items-center gap-1">
                              <span
                                className={cn(
                                  "font-mono text-[9.5px] font-medium px-1.5 py-0.5 rounded transition",
                                  isInserted
                                    ? "bg-emerald-600 text-white"
                                    : "bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-slate-800 dark:text-slate-300 dark:group-hover:bg-blue-900/60 dark:group-hover:text-blue-300",
                                )}
                              >
                                {isInserted ? (
                                  <span className="flex items-center gap-0.5">
                                    <Check size={10} />
                                    Inserted
                                  </span>
                                ) : (
                                  item.tag
                                )}
                              </span>
                            </div>
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

      {/* ── Custom Variable Creator ── */}
      <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 shrink-0">
        <form onSubmit={handleInsertCustomTag} className="space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
            Insert Custom Tag
          </label>
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              placeholder="e.g. custom_variable"
              className="flex-1 min-w-0 px-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={!customTagInput.trim()}
              title="Insert custom tag"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
            >
              <Plus size={13} />
              <span>Add</span>
            </button>
          </div>
        </form>
      </div>
    </aside>
  );
});
