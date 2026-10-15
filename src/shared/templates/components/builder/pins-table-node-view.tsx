"use client";

import React, { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  SlidersHorizontal,
  Trash2,
  Table2,
} from "lucide-react";
import { cn } from "@/core/utils/http.util";
import { PIN_COLUMNS, REQUIRED_COLUMN_IDS, PinsListModal } from "./pins-list-modal";

interface SampleRowData {
  pin_number: string;
  pin_marker: number;
  has_plan_notes?: boolean;
  snapshot: string;
  location: string;
  item_name: string;
  sku: string;
  description: string;
  variation: string;
  quantity: string;
  unit_price: string;
  total_price: string;
  status: string;
  statusType: "success" | "warning";
  form: string;
}

const SAMPLE_PREVIEW_ROWS: SampleRowData[] = [
  {
    pin_number: "#6",
    pin_marker: 8,
    has_plan_notes: false,
    snapshot: "Pin #6 Snapshot",
    location: "#6",
    item_name: "AC KIT",
    sku: "AC-KIT-01",
    description: "Standard HVAC Split Unit Kit",
    variation: "No",
    quantity: "1",
    unit_price: "Kč 150,000",
    total_price: "Kč 150,000",
    status: "Completed",
    statusType: "success",
    form: "HVAC Installation QA",
  },
  {
    pin_number: "#7",
    pin_marker: 7,
    has_plan_notes: true,
    snapshot: "Pin #7 Snapshot",
    location: "#7",
    item_name: "AC KIT",
    sku: "AC-KIT-01",
    description: "Standard HVAC Split Unit Kit",
    variation: "No",
    quantity: "1",
    unit_price: "Kč 150,000",
    total_price: "Kč 150,000",
    status: "Completed",
    statusType: "success",
    form: "HVAC Installation QA",
  },
];

function DrawingSnapshotThumbnail({
  pinMarker,
  hasPlanNotes,
}: {
  pinMarker: number;
  hasPlanNotes?: boolean;
}) {
  return (
    <div className="w-36 h-20 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 relative overflow-hidden flex items-center justify-center shrink-0 shadow-2xs">
      {/* Background blueprint/plan schematic lines */}
      <div className="absolute inset-0 flex flex-col justify-evenly px-2 py-1 opacity-50 pointer-events-none">
        <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
        <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
        <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
      </div>

      {hasPlanNotes && (
        <div className="absolute right-2 top-2 text-[8px] font-mono text-slate-600 dark:text-slate-400 leading-tight text-right pointer-events-none font-semibold">
          <div>Kč 118</div>
          <div>Kč 118</div>
          <div className="mt-1">Kč 20,700</div>
          <div>Kč 20,700</div>
        </div>
      )}

      {/* Circular green pin marker */}
      <div className="relative z-10 size-6 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center">
        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 leading-none">
          {pinMarker}
        </span>
      </div>
    </div>
  );
}

export function PinsTableNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const title: string = node.attrs.title || "Pins List";
  const rawCols = node.attrs.columns;
  const parsedCols = Array.isArray(rawCols)
    ? rawCols
    : typeof rawCols === "string"
      ? (rawCols as string).split(",").map((s) => s.trim()).filter(Boolean)
      : ["snapshot", "location", "item_name", "variation", "quantity", "unit_price", "total_price"];

  const colSet = new Set(parsedCols);
  REQUIRED_COLUMN_IDS.forEach((id) => colSet.add(id));
  const columns = Array.from(colSet);
  const includeTotal: boolean =
    node.attrs.includeTotal !== undefined ? Boolean(node.attrs.includeTotal) : true;

  const activeColDefs = PIN_COLUMNS.filter((c) => columns.includes(c.id));

  const handleSaveConfig = (newConfig: {
    columns: string[];
    title: string;
    includeTotal: boolean;
  }) => {
    const finalSet = new Set(newConfig.columns);
    REQUIRED_COLUMN_IDS.forEach((id) => finalSet.add(id));
    updateAttributes({
      columns: Array.from(finalSet),
      title: newConfig.title,
      includeTotal: newConfig.includeTotal,
    });
    setModalOpen(false);
  };

  return (
    <NodeViewWrapper
      className={cn(
        "my-6 select-none outline-none transition-all duration-200",
        selected && "ring-2 ring-blue-500 rounded-xl",
      )}
    >
      <div contentEditable={false} className="group relative">
        {/* ── Top Hover Toolbar / Edit Configuration Bar ── */}
        <div className="flex items-center justify-between gap-2 mb-2 px-1">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-[#2b394b] text-white">
              <Table2 className="size-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {title}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              ({activeColDefs.length} columns)
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer active:scale-95"
            >
              <SlidersHorizontal className="size-3.5 text-blue-600 dark:text-blue-400" />
              <span>Edit Configuration</span>
            </button>
            <button
              type="button"
              onClick={deleteNode}
              title="Remove Table"
              className="inline-flex size-6 items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 hover:border-red-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition cursor-pointer"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        </div>

        {/* ── Main Table Card Rendered Exactly Like Screenshot ── */}
        <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
          <div className="overflow-x-auto">
            <table className="pins-preview-table w-full border-collapse">
              {/* Dark Navy Header Row (#2b394b) */}
              <thead>
                <tr className="bg-[#2b394b] text-white">
                  {activeColDefs.map((col) => (
                    <th
                      key={col.id}
                      className="px-4 py-3 text-xs font-bold tracking-wide text-white whitespace-nowrap"
                      style={{ textAlign: col.align || "left", width: col.width }}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body with Spacious Rows */}
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {SAMPLE_PREVIEW_ROWS.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
                  >
                    {activeColDefs.map((col) => {
                      const val = (row as any)[col.id] || "—";
                      return (
                        <td
                          key={col.id}
                          className="px-4 py-4 text-xs text-slate-700 dark:text-slate-300 align-middle whitespace-nowrap"
                          style={{ textAlign: col.align || "left" }}
                        >
                          {col.id === "snapshot" ? (
                            <DrawingSnapshotThumbnail
                              pinMarker={row.pin_marker}
                              hasPlanNotes={row.has_plan_notes}
                            />
                          ) : col.id === "location" ? (
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {val}
                            </span>
                          ) : col.id === "item_name" ? (
                            <span className="font-semibold text-slate-800 dark:text-slate-100 tracking-wide">
                              {val}
                            </span>
                          ) : col.id === "variation" ? (
                            <span className="text-slate-600 dark:text-slate-400">
                              {val}
                            </span>
                          ) : col.id === "quantity" ? (
                            <span className="text-slate-700 dark:text-slate-300 font-medium">
                              {val}
                            </span>
                          ) : col.id === "status" ? (
                            <span
                              className={cn(
                                "inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold border",
                                row.statusType === "success"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                                  : "bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border-amber-200 dark:border-amber-800",
                              )}
                            >
                              {val}
                            </span>
                          ) : col.id === "sku" ? (
                            <span className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300">
                              {val}
                            </span>
                          ) : (
                            <span>{val}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Totals Card & Section Total Banner (Bottom Right) ── */}
        {includeTotal && (
          <div className="mt-4 flex flex-col items-end gap-2.5">
            <div className="w-72 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden text-xs shadow-2xs">
              <div className="flex justify-between px-3.5 py-2 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <span>Sub-Total ex VAT</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Kč 300,000
                </span>
              </div>
              <div className="flex justify-between px-3.5 py-2 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <span>VAT (20%)</span>
                <span className="font-medium text-slate-900 dark:text-slate-100">
                  Kč 60,000
                </span>
              </div>
              <div className="flex justify-between px-3.5 py-2.5 bg-slate-100/80 dark:bg-slate-800/80 font-bold text-slate-900 dark:text-white">
                <span>Total inc VAT</span>
                <span>Kč 360,000</span>
              </div>
            </div>

            {/* Dark Navy Section Total Button/Pill */}
            <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-md bg-[#2b394b] text-white text-xs font-bold uppercase tracking-wider shadow-xs">
              SECTION TOTAL INC VAT Kč 360,000
            </div>
          </div>
        )}
      </div>

      {/* ── Edit Configuration Modal ── */}
      <PinsListModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editor={null}
        initialColumns={columns}
        initialTitle={title}
        initialIncludeTotal={includeTotal}
        onSave={handleSaveConfig}
        isEditing
      />
    </NodeViewWrapper>
  );
}
