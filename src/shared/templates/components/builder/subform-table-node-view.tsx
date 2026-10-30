"use client";

import React, { useState, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  SlidersHorizontal,
  Trash2,
  Table2,
  GripVertical,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  fetchModuleVariables,
  formatFieldLabel,
  formatModuleDisplayName,
  type ModuleVariablesData,
} from "../../api/template-variables.api";
import { SubformModal, type SubformConfig } from "./subform-modal";

export function SubformTableNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [moduleData, setModuleData] = useState<ModuleVariablesData>({
      moduleName: node.attrs.module || "sections",
      primaryKeys: [],
      relatedModules: {},
      allVariables: [],
      multivalueModules: {},
      singleModules: {},
      relatedModulesMeta: {},
    });

  const title: string = node.attrs.title || "Subform Table";
  const rawCols = node.attrs.columns;
  const parsedCols: string[] = Array.isArray(rawCols)
    ? rawCols
    : typeof rawCols === "string" && rawCols.trim()
    ? rawCols.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  // Default fallback columns if empty
  const columns: string[] =
    parsedCols.length > 0 ? parsedCols : ["name", "description", "status", "created_at"];

  const key: string = node.attrs.key || "subform_table";
  const moduleName: string = node.attrs.module || "sections";
  const columnLabels: Record<string, string> = node.attrs.columnLabels || {};
  const includeHeading: boolean = node.attrs.includeHeading !== false;

  // Load module data for the modal configurator
  useEffect(() => {
    let isMounted = true;
    fetchModuleVariables("quotations")
      .then((data) => {
        if (isMounted) setModuleData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveConfig = (cfg: SubformConfig) => {
    updateAttributes({
      title: cfg.title,
      key: cfg.key,
      module: cfg.module,
      columns: cfg.columns,
      columnLabels: cfg.columnLabels,
      includeHeading: cfg.includeHeading,
    });
  };

  return (
    <NodeViewWrapper
      className={cn(
        "subform-table-node-view my-6 group/subform relative transition-all select-none",
        selected && "ring-2 ring-blue-500 rounded-xl shadow-lg shadow-blue-500/15",
      )}
      style={{
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
      data-drag-handle
    >
      <div contentEditable={false} className="group relative">
        {/* ── Top Floating / Hover Toolbar ── */}
        <div
          className={cn(
            "absolute -top-9 left-0 flex items-center gap-1.5 z-30 transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover/subform:opacity-100"
          )}
        >
          <span className="flex items-center gap-1.5 bg-[#2b394b] dark:bg-slate-800 text-white text-[10.5px] font-semibold px-2.5 py-0.5 rounded-full shadow-sm">
            <Table2 className="size-3" />
            <span>Subform: {moduleName}</span>
            <span className="text-[9px] opacity-80 font-mono">({key})</span>
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:text-blue-600 hover:border-blue-300 transition shadow-xs text-[10.5px] font-semibold cursor-pointer"
            title="Configure columns & module"
          >
            <SlidersHorizontal className="size-3 text-blue-600" />
            <span>Edit Configuration</span>
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded bg-white dark:bg-slate-800 text-slate-400 hover:text-red-600 border border-slate-200 dark:border-slate-700 transition shadow-xs cursor-pointer"
            title="Delete subform"
          >
            <Trash2 className="size-3.5" />
          </button>
          <div
            className="p-1 rounded bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing shadow-xs"
            data-drag-handle
            title="Drag to reposition"
          >
            <GripVertical className="size-3.5" />
          </div>
        </div>

        {/* ── Main Subform Table Card ── */}
        <div className="overflow-hidden rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          {/* Header Bar */}
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="size-3 text-blue-600 dark:text-blue-400" />
              <span>Configure</span>
            </button>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-semibold uppercase">
              subform: {moduleName}
            </span>
          </div>

          {/* Table Element with proper classes for styling and pagination protection */}
          <div className="overflow-x-auto">
            <table className="subform-preview-table pins-preview-table w-full border-collapse">
              {/* Table Header: Dark Navy theme matching Pins Table */}
              <thead>
                <tr className="bg-[#2b394b] text-white">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-xs font-bold tracking-wide text-white whitespace-nowrap text-left border-none"
                    >
                      <div>{columnLabels[col] || formatFieldLabel(col)}</div>
                      <div className="text-[9.5px] font-mono text-slate-300 font-normal opacity-85 mt-0.5">
                        &lt;{moduleName}.{col}&gt;
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body with 2 Sample Preview Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {[1, 2].map((rowIdx) => (
                  <tr
                    key={rowIdx}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col}
                        className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300 align-middle whitespace-nowrap border-none"
                      >
                        <span className="font-medium text-slate-600 dark:text-slate-400">
                          Sample {formatFieldLabel(col)} #{rowIdx}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Subform Configuration Modal ── */}
        <SubformModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editor={editor}
          moduleData={moduleData}
          initialConfig={{
            title,
            key,
            module: moduleName,
            type: "subformtable",
            columns,
            columnLabels,
            includeHeading,
          }}
          isEditing={true}
          onSave={handleSaveConfig}
        />
      </div>
    </NodeViewWrapper>
  );
}
