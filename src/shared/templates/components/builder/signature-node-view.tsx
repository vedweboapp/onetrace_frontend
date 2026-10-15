"use client";

import React, { useState, useEffect } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  PenLine,
  Trash2,
  GripVertical,
  SlidersHorizontal,
  Check,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import {
  fetchModuleVariables,
  formatFieldLabel,
  formatModuleDisplayName,
  type VariableItem,
} from "../../api/template-variables.api";

export function SignatureNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const imageKey: string = node.attrs.imageKey || "";
  const label: string = node.attrs.label || "Client Sign";

  // Automatically show configuration when first dragged/dropped (imageKey is empty) or toggled
  const [isConfiguring, setIsConfiguring] = useState<boolean>(!imageKey);
  const [moduleVars, setModuleVars] = useState<{
    primary: VariableItem[];
    related: Record<string, VariableItem[]>;
    primaryName: string;
  }>({
    primary: [],
    related: {},
    primaryName: "quotations",
  });
  const [loadingVars, setLoadingVars] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoadingVars(true);
      try {
        const data = await fetchModuleVariables("quotations");
        if (mounted) {
          setModuleVars({
            primary: data.primaryKeys,
            related: data.relatedModules,
            primaryName: data.moduleName || "quotations",
          });
        }
      } catch (e) {
        console.warn("Could not load variables for signature config:", e);
      } finally {
        if (mounted) setLoadingVars(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <NodeViewWrapper
      className={cn(
        "my-6 select-none outline-none transition-all duration-200",
        selected && "ring-2 ring-blue-500 rounded-xl",
      )}
    >
      <div contentEditable={false} className="group relative">
        {/* ── Top toolbar ── */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            {/* Drag Handle */}
            <div
              data-drag-handle
              title="Drag to reposition block"
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
            >
              <GripVertical className="size-4" />
            </div>

            <div className="flex size-6 items-center justify-center rounded-md bg-slate-700 text-white">
              <PenLine className="size-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {label}
            </span>
            {imageKey && (
              <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 px-1.5 py-0.5 rounded">
                {`<${imageKey}>`}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsConfiguring((prev) => !prev)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold shadow-2xs transition cursor-pointer active:scale-95",
                isConfiguring
                  ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                  : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700",
              )}
            >
              <SlidersHorizontal className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>{isConfiguring ? "Done" : "Configure"}</span>
            </button>

            <button
              type="button"
              onClick={deleteNode}
              title="Remove Signature Block"
              className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── Configuration Panel (shows when dragged or configured) ── */}
        {isConfiguring && (
          <div className="mb-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 p-3.5 space-y-3 transition-all animate-in fade-in-50 duration-150">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                <SlidersHorizontal className="size-3.5 text-blue-600 dark:text-blue-400" />
                Configure Signature Block
              </span>
              <button
                type="button"
                onClick={() => setIsConfiguring(false)}
                className="text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
              >
                <Check className="size-3.5" />
                Done
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Label Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Section Label
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => updateAttributes({ label: e.target.value })}
                  placeholder="e.g. Client Sign"
                  className="w-full text-xs py-1.5 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Image Key Selector */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Signature Image Key
                </label>
                <div className="relative">
                  <select
                    value={imageKey}
                    onChange={(e) => updateAttributes({ imageKey: e.target.value })}
                    className="w-full text-xs font-semibold py-1.5 pl-2.5 pr-7 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-850 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer appearance-none shadow-2xs"
                  >
                    <option value="">— Select signature image variable —</option>
                    {moduleVars.primary.length > 0 && (
                      <optgroup label={`${formatModuleDisplayName(moduleVars.primaryName)} (Primary)`}>
                        {moduleVars.primary.map((v) => (
                          <option key={v.key} value={v.key}>
                            {v.label} ({v.key})
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {Object.entries(moduleVars.related).map(([relName, items]) => (
                      <optgroup key={relName} label={formatFieldLabel(relName)}>
                        {items.map((v) => (
                          <option key={v.key} value={v.key}>
                            {v.label} ({v.key})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
                {loadingVars && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Loader2 size={9} className="animate-spin" /> Loading variables…
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Signature Card Preview ── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xs overflow-hidden p-5">
          {/* SIGNATURE label */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
            {label || "Signature"}
          </p>

          {/* Dashed signature area with centered image placeholder */}
          <div className="rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center min-h-[110px] gap-2 p-4">
            {imageKey ? (
              <div className="flex flex-col items-center gap-1.5">
                <div className="size-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <PenLine className="size-5 text-slate-500 dark:text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                  Image from{" "}
                  <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {`<${imageKey}>`}
                  </span>{" "}
                  will appear here
                </p>
              </div>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-[12px] text-slate-400 dark:text-slate-500 italic">
                  Approved without a drawn signature
                </p>
                <p className="text-[10px] text-slate-400">
                  Click <span className="font-semibold text-blue-600 dark:text-blue-400">Configure</span> to attach a signature image variable.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}
