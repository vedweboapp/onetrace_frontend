"use client";

import React, { useState, useMemo } from "react";
import type { Editor } from "@tiptap/react";
import {
  Table2,
  CheckSquare,
  Square,
  RotateCcw,
  Plus,
  Eye,
  Sliders,
  Sparkles,
  Lock,
} from "lucide-react";
import { AppModal, AppButton } from "@/shared/ui";
import { toastSuccess } from "@/shared/feedback/app-toast";

export interface PinColumnOption {
  id: string;
  label: string;
  category: "core" | "details" | "pricing" | "status";
  tag: string;
  sampleValue: string;
  defaultSelected: boolean;
  required?: boolean;
  align?: "left" | "center" | "right";
  width?: string;
}

export const REQUIRED_COLUMN_IDS = new Set<string>(["quantity", "unit_price", "total_price"]);

export const PIN_COLUMNS: PinColumnOption[] = [
  {
    id: "pin_number",
    label: "Pin #",
    category: "core",
    tag: "<pins.pin_number>",
    sampleValue: "#1",
    defaultSelected: true,
    align: "center",
    width: "70px",
  },
  {
    id: "snapshot",
    label: "Snapshot",
    category: "core",
    tag: "<pins.snapshot>",
    sampleValue: "[Drawing Pin Snapshot]",
    defaultSelected: true,
    align: "center",
    width: "110px",
  },
  {
    id: "location",
    label: "Location",
    category: "core",
    tag: "<pins.location>",
    sampleValue: "Level 1 - Plot A",
    defaultSelected: true,
    align: "left",
  },
  {
    id: "item_name",
    label: "Item / Description",
    category: "core",
    tag: "<pins.item_name>",
    sampleValue: "Fire Stop Collar 110mm",
    defaultSelected: true,
    align: "left",
  },
  {
    id: "sku",
    label: "SKU",
    category: "details",
    tag: "<pins.sku>",
    sampleValue: "FSC-110",
    defaultSelected: false,
    align: "left",
  },
  {
    id: "description",
    label: "Description",
    category: "details",
    tag: "<pins.description>",
    sampleValue: "Standard pipe penetration collar",
    defaultSelected: false,
    align: "left",
  },
  {
    id: "variation",
    label: "Variation",
    category: "details",
    tag: "<pins.variation>",
    sampleValue: "No",
    defaultSelected: true,
    align: "center",
    width: "80px",
  },
  {
    id: "quantity",
    label: "Quantity",
    category: "pricing",
    tag: "<pins.quantity>",
    sampleValue: "2",
    defaultSelected: true,
    required: true,
    align: "center",
    width: "80px",
  },
  {
    id: "unit_price",
    label: "Unit Price",
    category: "pricing",
    tag: "<pins.unit_price>",
    sampleValue: "£45.00",
    defaultSelected: true,
    required: true,
    align: "right",
    width: "90px",
  },
  {
    id: "total_price",
    label: "Total Price",
    category: "pricing",
    tag: "<pins.total_price>",
    sampleValue: "£90.00",
    defaultSelected: true,
    required: true,
    align: "right",
    width: "95px",
  },
  {
    id: "status",
    label: "Status",
    category: "status",
    tag: "<pins.status>",
    sampleValue: "Installed",
    defaultSelected: true,
    align: "center",
    width: "90px",
  },
  {
    id: "form",
    label: "Form",
    category: "status",
    tag: "<pins.form>",
    sampleValue: "Fire Penetration QA",
    defaultSelected: false,
    align: "left",
  },
];

interface PinsListModalProps {
  open: boolean;
  onClose: () => void;
  editor: Editor | null;
  initialColumns?: string[];
  initialTitle?: string;
  initialIncludeTotal?: boolean;
  onSave?: (config: { columns: string[]; title: string; includeTotal: boolean }) => void;
  isEditing?: boolean;
}

export function PinsListModal({
  open,
  onClose,
  editor,
  initialColumns,
  initialTitle,
  initialIncludeTotal,
  onSave,
  isEditing = false,
}: PinsListModalProps) {
  // Selected columns set (always includes required quantity and price)
  const [selectedColIds, setSelectedColIds] = useState<Set<string>>(() => {
    const initial = new Set(PIN_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
    REQUIRED_COLUMN_IDS.forEach((id) => initial.add(id));
    return initial;
  });

  const [includeHeading, setIncludeHeading] = useState(true);
  const [headingText, setHeadingText] = useState("Pins List");
  const [rowCount, setRowCount] = useState<number>(2);

  React.useEffect(() => {
    if (open) {
      if (initialColumns && initialColumns.length > 0) {
        const next = new Set(initialColumns);
        REQUIRED_COLUMN_IDS.forEach((id) => next.add(id));
        setSelectedColIds(next);
      } else if (!isEditing) {
        const defaultSet = new Set(PIN_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
        REQUIRED_COLUMN_IDS.forEach((id) => defaultSet.add(id));
        setSelectedColIds(defaultSet);
      }
      if (initialTitle !== undefined) {
        setHeadingText(initialTitle);
        setIncludeHeading(Boolean(initialTitle.trim()));
      }
    }
  }, [open, initialColumns, initialTitle, isEditing]);

  const toggleColumn = (id: string) => {
    // Quantity and Price are required by rule and cannot be unchecked
    if (REQUIRED_COLUMN_IDS.has(id)) {
      return;
    }
    setSelectedColIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      // Guarantee required columns remain selected
      REQUIRED_COLUMN_IDS.forEach((reqId) => next.add(reqId));
      return next;
    });
  };

  const selectAll = () => {
    setSelectedColIds(new Set(PIN_COLUMNS.map((c) => c.id)));
  };

  const deselectAll = () => {
    // Keep required columns (Quantity and Price) selected
    setSelectedColIds(new Set(REQUIRED_COLUMN_IDS));
  };

  const resetToDefault = () => {
    const defaultSet = new Set(PIN_COLUMNS.filter((c) => c.defaultSelected).map((c) => c.id));
    REQUIRED_COLUMN_IDS.forEach((id) => defaultSet.add(id));
    setSelectedColIds(defaultSet);
    setIncludeHeading(true);
    setHeadingText("Pins List");
    setRowCount(2);
  };

  const activeColumns = useMemo(() => {
    return PIN_COLUMNS.filter((c) => selectedColIds.has(c.id));
  }, [selectedColIds]);

  const hasPricing = useMemo(() => {
    return selectedColIds.has("total_price") || selectedColIds.has("unit_price");
  }, [selectedColIds]);

  const handleInsert = () => {
    if (activeColumns.length === 0) return;

    const cols = Array.from(selectedColIds);
    const title = includeHeading ? headingText.trim() : "";
    const total = false;

    if (onSave) {
      onSave({ columns: cols, title, includeTotal: total });
      toastSuccess("Configuration updated");
      onClose();
      return;
    }

    if (!editor) return;

    const cmd = (editor.commands as any).insertPinsTable;
    if (typeof cmd === "function") {
      cmd({
        columns: cols,
        title: title || "Pins List",
        includeTotal: total,
      });
    } else {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "pinsTable",
          attrs: {
            columns: cols,
            title: title || "Pins List",
            includeTotal: total,
          },
        })
        .run();
    }

    toastSuccess("Pins List inserted into document");
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={isEditing ? "Edit Items Table Configuration" : "Insert Items Table / Pins List"}
      size="xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {activeColumns.length} of {PIN_COLUMNS.length} columns selected
          </div>
          <div className="flex items-center gap-2">
            <AppButton variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </AppButton>
            <AppButton
              variant="primary"
              size="sm"
              disabled={activeColumns.length === 0}
              onClick={handleInsert}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>{isEditing ? "Save Configuration" : "Insert Placeholder"}</span>
            </AppButton>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure which columns and options should appear in your Pins List table. The table will be inserted at your current cursor location in the document.
        </p>

        {/* ── Configuration Section ── */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-3.5 space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2.5">
            <div className="flex items-center gap-1.5">
              <Sliders className="size-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                Select Columns to Show
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={selectAll}
                className="px-2 py-0.5 rounded text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/40 font-medium cursor-pointer transition"
              >
                Select All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={deselectAll}
                className="px-2 py-0.5 rounded text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-medium cursor-pointer transition"
              >
                Clear All
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={resetToDefault}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 font-medium cursor-pointer transition"
              >
                <RotateCcw className="size-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Column Checkboxes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {PIN_COLUMNS.map((col) => {
              const isSelected = selectedColIds.has(col.id);
              const isRequired = REQUIRED_COLUMN_IDS.has(col.id);
              return (
                <button
                  key={col.id}
                  type="button"
                  disabled={isRequired}
                  onClick={() => toggleColumn(col.id)}
                  title={isRequired ? `${col.label} is required and cannot be unchecked` : undefined}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all ${
                    isRequired
                      ? "border-blue-400 bg-blue-50/90 dark:border-blue-600 dark:bg-blue-950/60 text-blue-950 dark:text-blue-100 cursor-not-allowed opacity-95"
                      : isSelected
                        ? "border-blue-500 bg-blue-50/70 dark:border-blue-600 dark:bg-blue-950/40 text-blue-950 dark:text-blue-100 shadow-2xs cursor-pointer"
                        : "border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer"
                  }`}
                >
                  {isSelected ? (
                    <CheckSquare className="size-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <Square className="size-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold block truncate">{col.label}</span>
                      {isRequired && (
                        <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-blue-200/70 text-blue-800 dark:bg-blue-900 dark:text-blue-200 shrink-0">
                          <Lock className="size-2.5" />
                          Required
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono block truncate">
                      {col.tag}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Options Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70 dark:border-slate-800 text-xs">
            {/* Title toggle */}
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={includeHeading}
                  onChange={(e) => setIncludeHeading(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                />
                <span>Table Title:</span>
              </label>
              <input
                type="text"
                value={headingText}
                disabled={!includeHeading}
                onChange={(e) => setHeadingText(e.target.value)}
                placeholder="e.g. Pins List"
                className="flex-1 px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 disabled:opacity-40"
              />
            </div>

            {/* Sample Rows */}
            <div className="flex items-center justify-end gap-1.5 text-slate-500 dark:text-slate-400">
              <span>Rows:</span>
              <select
                value={rowCount}
                onChange={(e) => setRowCount(Number(e.target.value))}
                className="px-2 py-0.5 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100"
              >
                <option value={1}>1</option>
                <option value={2}>2</option>
                <option value={3}>3</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── Live Preview Section ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <Eye className="size-3.5 text-slate-400" />
            <span>Table Preview</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
            {activeColumns.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 dark:text-slate-500">
                No columns selected. Select at least one column above to preview and insert the table.
              </div>
            ) : (
              <div className="p-4 overflow-x-auto">
                {includeHeading && headingText.trim() && (
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {headingText.trim()}
                  </p>
                )}

                <table className="w-full border-collapse text-xs rounded-md overflow-hidden">
                  <thead>
                    <tr className="bg-[#2b394b] text-white">
                      {activeColumns.map((col) => (
                        <th
                          key={col.id}
                          className="px-3 py-2.5 text-xs font-bold text-white tracking-wide whitespace-nowrap"
                          style={{ textAlign: col.align || "left", width: col.width }}
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {Array.from({ length: rowCount }, (_, rowIdx) => (
                      <tr
                        key={rowIdx}
                        className={rowIdx % 2 === 1 ? "bg-slate-50/50 dark:bg-slate-850/40" : "bg-white dark:bg-slate-900"}
                      >
                        {activeColumns.map((col) => {
                          let display = col.sampleValue;
                          if (col.id === "pin_number") display = `#${rowIdx === 0 ? "6" : "7"}`;
                          if (col.id === "location") display = `#${rowIdx === 0 ? "6" : "7"}`;
                          if (col.id === "item_name") display = "AC KIT";
                          if (col.id === "variation") display = "No";
                          if (col.id === "quantity") display = "1";

                          return (
                            <td
                              key={col.id}
                              className="px-3 py-3 text-xs text-slate-700 dark:text-slate-300 align-middle whitespace-nowrap"
                              style={{ textAlign: col.align || "left" }}
                            >
                              {col.id === "snapshot" ? (
                                <div className="w-28 h-16 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 relative flex items-center justify-center shrink-0">
                                  <div className="absolute inset-0 flex flex-col justify-evenly px-2 py-0.5 opacity-40">
                                    <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
                                    <div className="border-b border-slate-200 dark:border-slate-700 w-full" />
                                  </div>
                                  <div className="relative z-10 size-5 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900 flex items-center justify-center">
                                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                      {rowIdx === 0 ? "8" : "7"}
                                    </span>
                                  </div>
                                </div>
                              ) : col.id === "status" ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  {display}
                                </span>
                              ) : (
                                <span className="font-medium">{display}</span>
                              )}
                            </td>
                          );
                        })}
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
