"use client";

import React, { useState, useMemo, useEffect } from "react";
import type { Editor } from "@tiptap/react";
import {
  Table2,
  CheckSquare,
  Square,
  Search,
  SlidersHorizontal,
  FolderTree,
  X,
  Plus,
  Trash2,
  ChevronRight,
  Layers,
} from "lucide-react";
import { AppModal, AppButton } from "@/shared/ui";
import { toastSuccess } from "@/shared/feedback/app-toast";
import { cn } from "@/core/utils/http.util";
import {
  formatFieldLabel,
  formatModuleDisplayName,
  type ModuleVariablesData,
  type VariableItem,
} from "../../api/template-variables.api";

export interface SubformConfig {
  title: string;
  key: string;
  module: string;
  type: string;
  columns: string[];
  columnLabels: Record<string, string>;
  includeHeading: boolean;
}

interface SubformModalProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  moduleData: ModuleVariablesData;
  initialConfig?: Partial<SubformConfig>;
  isEditing?: boolean;
  onSave?: (config: SubformConfig) => void;
}

export function SubformModal({
  open,
  onClose,
  editor,
  moduleData,
  initialConfig,
  isEditing = false,
  onSave,
}: SubformModalProps) {
  // Related module list from moduleData
  const availableModules = useMemo(() => {
    const list: Array<{ id: string; label: string; count: number; isPrimary?: boolean }> = [];
    
    // Add only multivalues-type related modules (these are subform candidates)
    const mvMods = moduleData?.multivalueModules && Object.keys(moduleData.multivalueModules).length > 0
      ? moduleData.multivalueModules
      : moduleData?.relatedModules;
    if (mvMods) {
      Object.entries(mvMods).forEach(([modName, vars]) => {
        list.push({
          id: modName,
          label: formatModuleDisplayName(modName),
          count: vars.length,
          isPrimary: false,
        });
      });
    }

    return list;
  }, [moduleData]);

  // Selected module
  const [selectedModule, setSelectedModule] = useState<string>(() => {
    if (initialConfig?.module) return initialConfig.module;
    return availableModules[0]?.id || "sections";
  });

  // Table Key (sent in payload as `Key`)
  const [tableKey, setTableKey] = useState<string>("subform");

  // Table Title
  const [title, setTitle] = useState<string>(() => {
    if (initialConfig?.title) return initialConfig.title;
    const initialMod = initialConfig?.module || availableModules[0]?.id || "sections";
    return `${formatModuleDisplayName(initialMod)} List`;
  });

  const [includeHeading, setIncludeHeading] = useState<boolean>(() => {
    return initialConfig?.includeHeading !== undefined ? initialConfig.includeHeading : true;
  });

  // Selected column IDs (variable keys)
  const [selectedColumns, setSelectedColumns] = useState<string[]>(() => {
    return initialConfig?.columns || [];
  });

  // Custom column labels dictionary
  const [columnLabels, setColumnLabels] = useState<Record<string, string>>(() => {
    return initialConfig?.columnLabels || {};
  });

  const [search, setSearch] = useState("");

  // Re-sync on modal open or when editing
  useEffect(() => {
    if (!open) return;
    if (initialConfig) {
      if (initialConfig.module) setSelectedModule(initialConfig.module);
      if (initialConfig.key) setTableKey(initialConfig.key);
      if (initialConfig.title) setTitle(initialConfig.title);
      if (initialConfig.columns) setSelectedColumns(initialConfig.columns);
      if (initialConfig.columnLabels) setColumnLabels(initialConfig.columnLabels);
      if (initialConfig.includeHeading !== undefined) setIncludeHeading(initialConfig.includeHeading);
    } else {
      const defaultMod = availableModules[0]?.id || "sections";
      setSelectedModule(defaultMod);
      setTableKey("subform");
      setTitle(`${formatModuleDisplayName(defaultMod)} List`);
      setIncludeHeading(true);
      // Auto-select first 4 variables
      const vars = getVariablesForModule(defaultMod);
      const defaultCols = vars.slice(0, 4).map((v) => extractCleanKey(v.key));
      setSelectedColumns(defaultCols);
      const labels: Record<string, string> = {};
      vars.slice(0, 4).forEach((v) => {
        labels[extractCleanKey(v.key)] = v.label;
      });
      setColumnLabels(labels);
    }
  }, [open, initialConfig, availableModules]);

  // Extract clean column key (stripping module prefix if present)
  function extractCleanKey(rawKey: string): string {
    if (!rawKey) return "";
    return rawKey.includes(".") ? rawKey.split(".").slice(1).join(".") : rawKey;
  }

  // Get variables available for the chosen module
  function getVariablesForModule(mod: string): VariableItem[] {
    if (!moduleData) return [];
    // Check multivalueModules first (new API)
    if (moduleData.multivalueModules?.[mod]) {
      return moduleData.multivalueModules[mod];
    }
    if (moduleData.relatedModules?.[mod]) {
      return moduleData.relatedModules[mod];
    }
    if (moduleData.moduleName === mod && moduleData.primaryKeys) {
      return moduleData.primaryKeys;
    }
    // Fallback: search allVariables
    return (moduleData.allVariables || []).filter(
      (v) => v.parentModule?.toLowerCase() === mod.toLowerCase() || v.category?.toLowerCase() === mod.toLowerCase()
    );
  }

  const currentVariables = useMemo(() => {
    return getVariablesForModule(selectedModule);
  }, [selectedModule, moduleData]);

  // Handle module change
  const handleModuleChange = (newMod: string) => {
    setSelectedModule(newMod);
    setTableKey("subform");
    setTitle(`${formatModuleDisplayName(newMod)} List`);
    const vars = getVariablesForModule(newMod);
    const defaultCols = vars.slice(0, 4).map((v) => extractCleanKey(v.key));
    setSelectedColumns(defaultCols);
    const labels: Record<string, string> = {};
    vars.slice(0, 4).forEach((v) => {
      labels[extractCleanKey(v.key)] = v.label;
    });
    setColumnLabels(labels);
  };

  // Filtered variables based on search
  const filteredVariables = useMemo(() => {
    if (!search.trim()) return currentVariables;
    const q = search.toLowerCase();
    return currentVariables.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.tag.toLowerCase().includes(q)
    );
  }, [currentVariables, search]);

  const toggleColumn = (cleanKey: string, defaultLabel: string) => {
    setSelectedColumns((prev) => {
      if (prev.includes(cleanKey)) {
        return prev.filter((k) => k !== cleanKey);
      } else {
        return [...prev, cleanKey];
      }
    });

    setColumnLabels((prev) => {
      if (prev[cleanKey]) return prev;
      return { ...prev, [cleanKey]: defaultLabel };
    });
  };

  const selectAll = () => {
    const all = currentVariables.map((v) => extractCleanKey(v.key));
    setSelectedColumns(all);
    const labels: Record<string, string> = {};
    currentVariables.forEach((v) => {
      labels[extractCleanKey(v.key)] = v.label;
    });
    setColumnLabels(labels);
  };

  const deselectAll = () => {
    setSelectedColumns([]);
  };

  const handleInsert = () => {
    if (selectedColumns.length === 0) return;

    const config: SubformConfig = {
      title: "",
      key: "subform",
      module: selectedModule,
      type: "subformtable",
      columns: selectedColumns,
      columnLabels,
      includeHeading: false,
    };

    if (onSave) {
      onSave(config);
      toastSuccess("Subform table updated");
      onClose();
      return;
    }

    if (!editor) return;

    const cmd = (editor.commands as any).insertSubformTable;
    if (typeof cmd === "function") {
      cmd(config);
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "subformTable",
          attrs: config,
        })
        .run();
    }

    toastSuccess("Subform table inserted into document");
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Subform Table" : "Configure & Insert Subform Table"}
      size="2xl"
      className="max-w-[760px] w-full"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedColumns.length} {selectedColumns.length === 1 ? "column" : "columns"} selected
          </div>
          <div className="flex items-center gap-2">
            <AppButton variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              disabled={selectedColumns.length === 0}
              onClick={handleInsert}
            >
              {isEditing ? "Save Configuration" : "Insert Subform Table"}
            </AppButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto px-0.5">
        {/* ── Related Module Selector ── */}
        <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
            <FolderTree className="size-3.5 text-blue-600" />
            <span>Related Module</span>
          </label>
          <select
            value={selectedModule}
            onChange={(e) => handleModuleChange(e.target.value)}
            className="w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 cursor-pointer shadow-2xs"
          >
            {availableModules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label} ({m.count} fields)
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">
            Select related module to generate dynamic table columns from its variables.
          </p>
        </div>

        {/* ── Column / Variable Selector ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                Select Columns from {formatModuleDisplayName(selectedModule)}
              </p>
              <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                Check the fields you want to appear as table columns.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-0.5 text-[10.5px] rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer font-medium"
              >
                Select All
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-0.5 text-[10.5px] rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition cursor-pointer font-medium"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${currentVariables.length} ${selectedModule} variables…`}
              className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 outline-none focus:border-blue-500 shadow-2xs"
            />
          </div>

          {/* Variables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-1.5 max-h-48 overflow-y-auto p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30">
            {filteredVariables.length === 0 ? (
              <div className="col-span-full py-6 text-center text-xs text-slate-400">
                No variables found matching &quot;{search}&quot;
              </div>
            ) : (
              filteredVariables.map((v) => {
                const cleanKey = extractCleanKey(v.key);
                const isSelected = selectedColumns.includes(cleanKey);

                return (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => toggleColumn(cleanKey, v.label)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-lg border text-left transition cursor-pointer select-none",
                      isSelected
                        ? "border-blue-300 bg-blue-50/80 dark:border-blue-800 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-2xs"
                        : "border-slate-200/80 bg-white hover:bg-slate-100/60 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    )}
                  >
                    <div className="shrink-0 text-blue-600 dark:text-blue-400">
                      {isSelected ? <CheckSquare className="size-4" /> : <Square className="size-4 text-slate-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold truncate leading-tight">{v.label}</div>
                      <div className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                        {v.tag}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ── Live Table Preview ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Document Preview
            </span>
            <span className="text-[10.5px] text-blue-600 dark:text-blue-400 font-medium">
              Live Table Preview
            </span>
          </div>

          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-end">
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold">
                subform: {selectedModule}
              </span>
            </div>

            {selectedColumns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Please select at least one column above to preview the table.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-slate-800/60">
                      {selectedColumns.map((colKey) => (
                        <th key={colKey} className="px-3 py-2 font-semibold text-slate-700 dark:text-slate-200">
                          <div>{columnLabels[colKey] || formatFieldLabel(colKey)}</div>
                          <div className="text-[9.5px] font-mono text-blue-600/80 dark:text-blue-400 font-normal">
                            &lt;{selectedModule}.{colKey}&gt;
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[1, 2].map((rowIdx) => (
                      <tr key={rowIdx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/30">
                        {selectedColumns.map((colKey) => (
                          <td key={colKey} className="px-3 py-2 text-slate-600 dark:text-slate-300 text-xs">
                            <span className="text-slate-400 dark:text-slate-500 italic">
                              Sample {formatFieldLabel(colKey)} {rowIdx}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
