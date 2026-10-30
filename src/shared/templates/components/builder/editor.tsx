"use client";

import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { mergeAttributes, Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyleKit } from "@tiptap/extension-text-style";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { TransformableImageExtension } from "./transformable-image-extension";
import { PinsTableExtension } from "./pins-table-extension";
import { SignatureExtension } from "./signature-extension";
import { TemplateVariablePillExtension } from "./template-variable-pill-extension";
import { ImageVariableExtension } from "./image-variable-extension";
import { ContainerBoxExtension } from "./container-box-extension";
import { DocumentHeaderExtension } from "./document-header-extension";
import { ImageLayoutExtension } from "./image-layout-extension";
import { SubformTableExtension } from "./subform-table-extension";
import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";
import { ImageUploaderModal } from "./image-uploader-modal";
import { PinsListModal } from "./pins-list-modal";
import { HeaderModal } from "./header-modal";
import { TemplateVariablesSidebar } from "./variables-sidebar";
import {
  fetchModuleVariables,
  type VariableItem,
} from "../../api/template-variables.api";
import { cn } from "@/core/utils/http.util";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Unlink,
  Undo2,
  Redo2,
  Minus,
  Quote,
  Code,
  Image as ImageIcon,
  ChevronDown,
  Tag,
  Table as TableIcon,
  TableProperties,
  Trash2,
  Columns2,
  PanelLeft,
  Palette,
  Check,
  Ban,
  Baseline,
  ArrowUpDown,
  ArrowLeftRight,
  Search,
  SquareDashed,
  PanelTop,
  Printer,
} from "lucide-react";

// ── Table Grid Picker ──────────────────────────────────────────────────────────
const TABLE_ROWS = 6;
const TABLE_COLS = 6;

function TableGridPicker({ onSelect }: { onSelect: (rows: number, cols: number) => void }) {
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);
  return (
    <div
      className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl p-2.5 select-none"
      style={{ minWidth: 160 }}
    >
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5 px-0.5">
        {hovered ? `${hovered.r} × ${hovered.c} Table` : "Insert Table"}
      </p>
      <div
        className="grid gap-0.5"
        style={{ gridTemplateColumns: `repeat(${TABLE_COLS}, 1fr)` }}
      >
        {Array.from({ length: TABLE_ROWS }, (_, ri) =>
          Array.from({ length: TABLE_COLS }, (_, ci) => {
            const r = ri + 1;
            const c = ci + 1;
            const isActive = hovered && r <= hovered.r && c <= hovered.c;
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                title={`${r}×${c}`}
                onMouseEnter={() => setHovered({ r, c })}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onSelect(r, c)}
                className={`w-5 h-5 rounded-sm border transition-all ${
                  isActive
                    ? "bg-blue-500 border-blue-600"
                    : "bg-slate-100 border-slate-200 dark:bg-slate-700 dark:border-slate-600 hover:bg-blue-100 hover:border-blue-300"
                }`}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Color Palettes (Solid Colors for Highlight and Font Color) ───────────────
const SOLID_COLOR_PALETTE = [
  { label: "Yellow", value: "#facc15" },
  { label: "Orange", value: "#ea580c" },
  { label: "Amber", value: "#d97706" },
  { label: "Red", value: "#dc2626" },
  { label: "Rose", value: "#e11d48" },
  { label: "Pink", value: "#db2777" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Indigo", value: "#4f46e5" },
  { label: "Blue", value: "#2563eb" },
  { label: "Teal", value: "#0d9488" },
  { label: "Emerald", value: "#059669" },
  { label: "Green", value: "#16a34a" },
  { label: "Dark Slate", value: "#334155" },
  { label: "Black", value: "#000000" },
];

function HighlightColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const isHighlightActive = editor.isActive("highlight");
  const currentColor = editor.getAttributes("highlight")?.color as string | undefined;

  const handleSelectColor = (color: string) => {
    editor.chain().focus().setHighlight({ color }).run();
    setOpen(false);
  };

  const handleRemoveHighlight = () => {
    editor.chain().focus().unsetHighlight().run();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Highlight color"
        className={`flex items-center gap-0.5 px-1 h-7 rounded text-[13px] transition-all duration-100 ${
          isHighlightActive || open
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-inner"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        <div className="flex flex-col items-center justify-center">
          <Highlighter size={14} />
          <span
            className="w-3.5 h-1 rounded-full mt-0.5"
            style={{
              backgroundColor: isHighlightActive
                ? currentColor || "#facc15"
                : "transparent",
            }}
          />
        </div>
        <ChevronDown size={10} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2.5 select-none w-52 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Remove Option */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Highlight
              </span>
              <button
                type="button"
                onClick={handleRemoveHighlight}
                disabled={!isHighlightActive}
                className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-red-600 dark:text-slate-100 dark:hover:text-red-400 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Remove highlight"
              >
                <Ban size={12} className="stroke-[2.5]" />
                <span>Remove</span>
              </button>
            </div>

            {/* Preset Color Swatches - Solid colors */}
            <div className="grid grid-cols-7 gap-1.5 mb-2.5">
              {SOLID_COLOR_PALETTE.map((item) => {
                const isSelected =
                  isHighlightActive &&
                  (currentColor?.toLowerCase() === item.value.toLowerCase() ||
                    (!currentColor && item.value === "#facc15"));
                const isLight = item.value === "#facc15";
                return (
                  <button
                    key={item.value}
                    type="button"
                    title={item.label}
                    onClick={() => handleSelectColor(item.value)}
                    style={{ backgroundColor: item.value }}
                    className={`size-5.5 rounded-[3px] border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-slate-900 dark:border-white ring-1.5 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800"
                        : "border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50"
                    }`}
                  >
                    {isSelected && (
                      <Check
                        size={11}
                        className={isLight ? "text-slate-900 stroke-[2.5]" : "text-white stroke-[2.5]"}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <label
                htmlFor="custom-highlight-color"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Palette size={13} className="text-slate-900 dark:text-slate-100" />
                <span>Custom color</span>
              </label>
              <div className="relative flex items-center">
                <div
                  className="size-5.5 rounded-[3px] border border-black/25 dark:border-white/30 shadow-2xs pointer-events-none"
                  style={{ backgroundColor: currentColor || "#facc15" }}
                />
                <input
                  id="custom-highlight-color"
                  type="color"
                  value={currentColor || "#facc15"}
                  onChange={(e) => {
                    editor.chain().focus().setHighlight({ color: e.target.value }).run();
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Pick custom color"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function TextColorPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const currentColor = editor.getAttributes("textStyle")?.color as string | undefined;
  const isColorActive = Boolean(currentColor);

  const handleSelectColor = (color: string) => {
    editor.chain().focus().setColor(color).run();
    setOpen(false);
  };

  const handleResetColor = () => {
    editor.chain().focus().unsetColor().run();
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title="Font color"
        className={`flex items-center gap-0.5 px-1 h-7 rounded text-[13px] transition-all duration-100 ${
          isColorActive || open
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-inner"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        <div className="flex flex-col items-center justify-center">
          <Baseline size={14} />
          <span
            className="w-3.5 h-1 rounded-full mt-0.5"
            style={{
              backgroundColor: isColorActive ? currentColor : "currentColor",
            }}
          />
        </div>
        <ChevronDown size={10} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2.5 select-none w-52 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header & Reset Option */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200 dark:border-slate-700">
              <span className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Font Color
              </span>
              <button
                type="button"
                onClick={handleResetColor}
                disabled={!isColorActive}
                className="flex items-center gap-1 text-xs font-semibold text-slate-900 hover:text-red-600 dark:text-slate-100 dark:hover:text-red-400 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Reset to default color"
              >
                <Ban size={12} className="stroke-[2.5]" />
                <span>Default</span>
              </button>
            </div>

            {/* Preset Color Swatches */}
            <div className="grid grid-cols-7 gap-1.5 mb-2.5">
              {SOLID_COLOR_PALETTE.map((item) => {
                const isSelected =
                  isColorActive &&
                  currentColor?.toLowerCase() === item.value.toLowerCase();
                const isLight = item.value === "#facc15";
                return (
                  <button
                    key={item.value}
                    type="button"
                    title={item.label}
                    onClick={() => handleSelectColor(item.value)}
                    style={{ backgroundColor: item.value }}
                    className={`size-5.5 rounded-[3px] border flex items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "border-slate-900 dark:border-white ring-1.5 ring-blue-500 ring-offset-1 dark:ring-offset-slate-800"
                        : "border-black/20 dark:border-white/20 hover:border-black/50 dark:hover:border-white/50"
                    }`}
                  >
                    {isSelected && (
                      <Check
                        size={11}
                        className={isLight ? "text-slate-900 stroke-[2.5]" : "text-white stroke-[2.5]"}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <label
                htmlFor="custom-text-color"
                className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              >
                <Palette size={13} className="text-slate-900 dark:text-slate-100" />
                <span>Custom color</span>
              </label>
              <div className="relative flex items-center">
                <div
                  className="size-5.5 rounded-[3px] border border-black/25 dark:border-white/30 shadow-2xs pointer-events-none"
                  style={{ backgroundColor: currentColor || "#000000" }}
                />
                <input
                  id="custom-text-color"
                  type="color"
                  value={currentColor || "#000000"}
                  onChange={(e) => {
                    editor.chain().focus().setColor(e.target.value).run();
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Pick custom color"
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Custom Extensions for Horizontal & Vertical Spacing ────────────────────────
export const LetterSpacingExtension = (Extension.create as any)({
  name: "letterSpacing",
  addOptions() {
    return { types: ["textStyle"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          letterSpacing: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.letterSpacing || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.letterSpacing) return {};
              return { style: `letter-spacing: ${attributes.letterSpacing}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setLetterSpacing:
        (letterSpacing: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { letterSpacing }).run();
        },
      unsetLetterSpacing:
        () =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { letterSpacing: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

export const BlockLineHeightExtension = (Extension.create as any)({
  name: "blockLineHeight",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.lineHeight || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.lineHeight) return {};
              return { style: `line-height: ${attributes.lineHeight}` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setBlockLineHeight:
        (lineHeight: string) =>
        ({ commands, chain }: any) => {
          commands.updateAttributes("paragraph", { lineHeight });
          commands.updateAttributes("heading", { lineHeight });
          return chain().setMark("textStyle", { lineHeight }).run();
        },
      unsetBlockLineHeight:
        () =>
        ({ commands, chain }: any) => {
          commands.resetAttributes("paragraph", "lineHeight");
          commands.resetAttributes("heading", "lineHeight");
          return chain().setMark("textStyle", { lineHeight: null }).removeEmptyTextStyle().run();
        },
    };
  },
});

interface FontItem {
  label: string;
  value: string;
}

interface FontCategoryGroup {
  category: string;
  fonts: FontItem[];
}

// ── Font Family Groups (Microsoft Word + Modern Typography) ───────────────────
const FONT_GROUPS: FontCategoryGroup[] = [
  {
    category: "Microsoft Word Standard",
    fonts: [
      { label: "Calibri", value: "Calibri, Carlito, 'Segoe UI', Candara, sans-serif" },
      { label: "Arial", value: "Arial, Arimo, 'Helvetica Neue', Helvetica, sans-serif" },
      { label: "Times New Roman", value: "'Times New Roman', Tinos, Times, Georgia, serif" },
      { label: "Georgia", value: "Georgia, Gelasio, serif" },
      { label: "Garamond", value: "Garamond, 'EB Garamond', Georgia, serif" },
      { label: "Verdana", value: "Verdana, Geneva, sans-serif" },
      { label: "Tahoma", value: "Tahoma, Verdana, Segoe, sans-serif" },
      { label: "Trebuchet MS", value: "'Trebuchet MS', 'Lucida Grande', sans-serif" },
      { label: "Century Gothic", value: "'Century Gothic', AppleGothic, sans-serif" },
      { label: "Palatino Linotype", value: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
      { label: "Courier New", value: "'Courier New', Cousine, Courier, monospace" },
      { label: "Comic Sans MS", value: "'Comic Sans MS', 'Comic Neue', cursive, sans-serif" },
      { label: "Impact", value: "Impact, Charcoal, sans-serif" },
    ],
  },
  {
    category: "Modern & Clean",
    fonts: [
      { label: "Inter", value: "Inter, system-ui, sans-serif" },
      { label: "Roboto", value: "Roboto, sans-serif" },
      { label: "Open Sans", value: "'Open Sans', sans-serif" },
      { label: "Montserrat", value: "Montserrat, sans-serif" },
      { label: "Poppins", value: "Poppins, sans-serif" },
      { label: "Lato", value: "Lato, sans-serif" },
    ],
  },
  {
    category: "Serif & Editorial",
    fonts: [
      { label: "Playfair Display", value: "'Playfair Display', Georgia, serif" },
      { label: "Merriweather", value: "Merriweather, Georgia, serif" },
      { label: "Lora", value: "Lora, serif" },
    ],
  },
  {
    category: "Monospace",
    fonts: [
      { label: "Fira Code", value: "'Fira Code', ui-monospace, monospace" },
    ],
  },
];

function FontFamilyPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const currentFamily = editor.getAttributes("textStyle")?.fontFamily as string | undefined;

  const activeFontLabel = useMemo(() => {
    if (!currentFamily) return "Calibri";
    const clean = currentFamily.toLowerCase();
    for (const group of FONT_GROUPS) {
      for (const font of group.fonts) {
        if (clean.includes(font.label.toLowerCase()) || font.value.toLowerCase().includes(clean)) {
          return font.label;
        }
      }
    }
    return currentFamily.split(",")[0].replace(/['"]/g, "");
  }, [currentFamily]);

  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return FONT_GROUPS;
    return FONT_GROUPS.map((group) => ({
      ...group,
      fonts: group.fonts.filter((f) => f.label.toLowerCase().includes(q)),
    })).filter((group) => group.fonts.length > 0);
  }, [search]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setSearch("");
        }}
        title="Font family (Microsoft Word fonts)"
        className={`flex items-center gap-1.5 px-2 h-7 rounded text-[12px] border border-slate-200 dark:border-slate-600 transition-colors w-[114px] justify-between ${
          open
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
        }`}
      >
        <span className="font-medium truncate text-left">{activeFontLabel}</span>
        <ChevronDown size={11} className="shrink-0 text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-1.5 select-none w-56 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search */}
            <div className="relative mb-1.5 px-1 pt-0.5">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search font..."
                className="w-full pl-6 pr-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Default Font Option */}
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().unsetFontFamily().run();
                setOpen(false);
              }}
              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-medium italic flex items-center justify-between cursor-pointer"
            >
              <span>Default (Calibri)</span>
              {!currentFamily && <Check size={12} className="text-blue-600 stroke-[2.5]" />}
            </button>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60 mt-1">
              {filteredGroups.map((group) => (
                <div key={group.category} className="py-1 first:pt-0 last:pb-0">
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-2 py-0.5">
                    {group.category}
                  </div>
                  {group.fonts.map((font) => {
                    const isSelected =
                      currentFamily?.toLowerCase().includes(font.label.toLowerCase()) ||
                      (!currentFamily && font.label === "Calibri");
                    return (
                      <button
                        key={font.label}
                        type="button"
                        onClick={() => {
                          editor.chain().focus().setFontFamily(font.value).run();
                          setOpen(false);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-[13px] flex items-center justify-between transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200"
                        }`}
                        style={{ fontFamily: font.value }}
                      >
                        <span className="truncate">{font.label}</span>
                        {isSelected && <Check size={12} className="text-blue-600 stroke-[2.5] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))}
              {filteredGroups.length === 0 && (
                <div className="text-[11px] text-slate-400 text-center py-3">No matching fonts</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Vertical Line Spacing Picker (Microsoft Word standard) ────────────────────
const LINE_SPACING_OPTIONS = [
  { label: "1.0 (Single)", value: "1.0" },
  { label: "1.15 (Default)", value: "1.15" },
  { label: "1.25", value: "1.25" },
  { label: "1.5 (1.5 lines)", value: "1.5" },
  { label: "1.75", value: "1.75" },
  { label: "2.0 (Double)", value: "2.0" },
  { label: "2.5", value: "2.5" },
  { label: "3.0", value: "3.0" },
];

function LineSpacingPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const currentLineHeight =
    (editor.getAttributes("paragraph")?.lineHeight as string) ||
    (editor.getAttributes("heading")?.lineHeight as string) ||
    (editor.getAttributes("textStyle")?.lineHeight as string) ||
    "";

  const applyLineSpacing = (val: string) => {
    (editor.commands as any).setBlockLineHeight?.(val);
    (editor.commands as any).setLineHeight?.(val);
    setOpen(false);
  };

  const resetLineSpacing = () => {
    (editor.commands as any).unsetBlockLineHeight?.();
    (editor.commands as any).unsetLineHeight?.();
    setOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customValue);
    if (!isNaN(num) && num > 0) {
      applyLineSpacing(num.toString());
      setCustomValue("");
    }
  };

  const isActive = Boolean(currentLineHeight);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Line spacing (Vertical spacing)"
        className={`flex items-center gap-0.5 px-1.5 h-7 rounded text-[13px] transition-all duration-100 cursor-pointer ${
          isActive || open
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-inner"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        <ArrowUpDown size={14} />
        <ChevronDown size={10} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2 select-none w-44 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-700 px-1">
              <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Line Spacing
              </span>
              <button
                type="button"
                onClick={resetLineSpacing}
                disabled={!isActive}
                className="text-[11px] font-semibold text-slate-800 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-0.5">
              {LINE_SPACING_OPTIONS.map((opt) => {
                const isSelected = currentLineHeight === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => applyLineSpacing(opt.value)}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={11} className="text-blue-600 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom line spacing input */}
            <form onSubmit={handleCustomSubmit} className="pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.05"
                  min="0.5"
                  max="4"
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  placeholder={currentLineHeight || "Custom..."}
                  className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={!customValue}
                  className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

// ── Horizontal Character Spacing Picker (Microsoft Word font spacing) ─────────
const LETTER_SPACING_OPTIONS = [
  { label: "Tight (-1px)", value: "-1px" },
  { label: "Semi-Tight (-0.5px)", value: "-0.5px" },
  { label: "Normal (0px)", value: "0px" },
  { label: "Semi-Expanded (+0.5px)", value: "0.5px" },
  { label: "Expanded (+1px)", value: "1px" },
  { label: "Wide (+2px)", value: "2px" },
  { label: "Extra Wide (+3px)", value: "3px" },
];

function LetterSpacingPicker({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const currentSpacing = (editor.getAttributes("textStyle")?.letterSpacing as string) || "";

  const applySpacing = (val: string) => {
    (editor.commands as any).setLetterSpacing?.(val);
    setOpen(false);
  };

  const resetSpacing = () => {
    (editor.commands as any).unsetLetterSpacing?.();
    setOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(customValue);
    if (!isNaN(num)) {
      applySpacing(`${num}px`);
      setCustomValue("");
    }
  };

  const isActive = Boolean(currentSpacing && currentSpacing !== "0px");

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Character spacing (Horizontal spacing)"
        className={`flex items-center gap-0.5 px-1.5 h-7 rounded text-[13px] transition-all duration-100 cursor-pointer ${
          isActive || open
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-inner"
            : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
        }`}
      >
        <ArrowLeftRight size={14} />
        <ChevronDown size={10} className="text-slate-400" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded shadow-md p-2 select-none w-48 text-slate-900 dark:text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-200 dark:border-slate-700 px-1">
              <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Character Spacing
              </span>
              <button
                type="button"
                onClick={resetSpacing}
                disabled={!isActive}
                className="text-[11px] font-semibold text-slate-800 hover:text-red-600 dark:text-slate-200 dark:hover:text-red-400 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
              >
                Reset
              </button>
            </div>

            <div className="space-y-0.5">
              {LETTER_SPACING_OPTIONS.map((opt) => {
                const isSelected =
                  currentSpacing === opt.value ||
                  (opt.value === "0px" && !currentSpacing);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => applySpacing(opt.value)}
                    className={`w-full text-left px-2 py-1 rounded text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                        : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={11} className="text-blue-600 stroke-[2.5]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom letter spacing input */}
            <form onSubmit={handleCustomSubmit} className="pt-2 mt-1.5 border-t border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1">
                <div className="relative flex-1">
                  <input
                    type="number"
                    step="0.5"
                    min="-5"
                    max="20"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    placeholder={currentSpacing.replace("px", "") || "0"}
                    className="w-full pl-2 pr-6 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                    px
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={!customValue}
                  className="px-2 py-1 text-xs font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors cursor-pointer"
                >
                  Set
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function ToolbarButton({
  onClick,
  isActive,
  children,
  title,
  disabled,
}: {
  onClick: () => void;
  isActive?: boolean;
  children: React.ReactNode;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`flex items-center justify-center p-1.5 rounded text-[13px] min-w-[28px] h-7 transition-all duration-100 ${
        isActive
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 shadow-inner"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px h-5 bg-slate-300 dark:bg-slate-600 mx-0.5 self-center shrink-0" />;
}

const FONT_SIZES = ["8", "9", "10", "11", "12", "14", "16", "18", "20", "24", "28", "32", "36", "48", "60", "72"];
const HEADING_OPTIONS = [
  { label: "Normal text", value: "paragraph" },
  { label: "Heading 1", value: "h1" },
  { label: "Heading 2", value: "h2" },
  { label: "Heading 3", value: "h3" },
];

function TableFloatingActions({ editor }: { editor: Editor | null }) {
  const [coords, setCoords] = useState<{ top: number; left: number; isColumns: boolean } | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;

    // When the user clicks anywhere in the editor content (child elements like text, paragraphs, cells, boxes),
    // automatically close the parent table/columns menu.
    const handleEditorMouseDown = () => {
      setIsOpen(false);
    };

    const dom = editor.view.dom;
    dom.addEventListener("mousedown", handleEditorMouseDown);

    const update = () => {
      if (!editor.isActive("table")) {
        setCoords(null);
        setIsOpen(false);
        return;
      }
      try {
        const { state, view } = editor;
        const { from } = state.selection;
        const resolved = view.domAtPos(from);
        const node = resolved.node instanceof HTMLElement ? resolved.node : resolved.node.parentElement;

        // If the user clicked/selected inside a container box or other nested block component with its own toolbar,
        // hide the parent handle/toolbar entirely so it doesn't collide with the child's controls.
        const isInsideNestedBlock =
          editor.isActive("containerBox") ||
          editor.isActive("signature") ||
          editor.isActive("imageVariable") ||
          Boolean(node?.closest(".container-box-wrapper")) ||
          Boolean(node?.closest("[data-node-view-wrapper]"));

        if (isInsideNestedBlock) {
          setCoords(null);
          setIsOpen(false);
          return;
        }

        const table = node?.closest("table");
        if (!table) {
          setCoords(null);
          setIsOpen(false);
          return;
        }

        const editorContainer = view.dom.closest(".template-doc-editor");
        if (!editorContainer) {
          setCoords(null);
          setIsOpen(false);
          return;
        }

        const tableRect = table.getBoundingClientRect();
        const containerRect = editorContainer.getBoundingClientRect();

        const isColumns = Boolean(
          table.classList.contains("borderless-table") ||
          table.getAttribute("data-borderless") === "true" ||
          editor.getAttributes("table").borderless
        );

        setCoords({
          top: Math.max(8, tableRect.top - containerRect.top - 28),
          left: Math.max(8, tableRect.left - containerRect.left),
          isColumns,
        });
      } catch {
        setCoords(null);
        setIsOpen(false);
      }
    };

    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("focus", update);

    return () => {
      dom.removeEventListener("mousedown", handleEditorMouseDown);
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("focus", update);
    };
  }, [editor]);

  if (!coords || !editor || !editor.isActive("table") || editor.isActive("containerBox")) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: coords.top,
        left: coords.left,
        zIndex: 40,
      }}
      className="flex items-center gap-1.5 select-none pointer-events-auto text-xs"
      onMouseDown={(e) => {
        // Prevent clicking inside toolbar from unfocusing editor
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      {/* 1. Parent Handle: Always unobtrusive, indicates the parent (Columns or Table) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-semibold transition-all shadow-xs cursor-pointer border",
          isOpen
            ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900"
            : "bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-400"
        )}
        title={isOpen ? "Close parent menu" : `Click to open ${coords.isColumns ? "Columns" : "Table"} options (Parent)`}
      >
        {coords.isColumns ? (
          <Columns2 size={13} className={isOpen ? "text-indigo-300 dark:text-indigo-600" : "text-indigo-600 dark:text-indigo-400"} />
        ) : (
          <TableIcon size={13} className={isOpen ? "text-blue-300 dark:text-blue-600" : "text-blue-600 dark:text-blue-400"} />
        )}
        <span>{coords.isColumns ? "Columns" : "Table"}</span>
        <ChevronDown size={11} className={cn("transition-transform duration-150 text-slate-400", isOpen && "rotate-180")} />
      </button>

      {/* 2. Parent Action Menu: ONLY opens when user explicitly clicks on the parent! */}
      {isOpen && (
        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xl rounded-md px-2 py-1 animate-in fade-in zoom-in-95 duration-100">
          <button
            type="button"
            onClick={() => {
              editor.chain().focus().deleteTable().run();
              setIsOpen(false);
            }}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold bg-red-600 hover:bg-red-700 text-white shadow-xs transition-colors cursor-pointer"
            title={coords.isColumns ? "Delete Columns" : "Delete Table"}
          >
            <Trash2 size={12} />
            <span>{coords.isColumns ? "Delete Columns" : "Delete Table"}</span>
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => editor.chain().focus().addRowAfter().run()}
            className="px-1.5 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Add Row Below"
          >
            + Row
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteRow().run()}
            className="px-1.5 py-1 rounded text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title="Delete Current Row"
          >
            - Row
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => editor.chain().focus().addColumnAfter().run()}
            className="px-1.5 py-1 rounded text-[11px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Add Column"
          >
            + Col
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().deleteColumn().run()}
            className="px-1.5 py-1 rounded text-[11px] font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
            title="Delete Current Column"
          >
            - Col
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700 mx-0.5" />

          <button
            type="button"
            onClick={() => {
              const isBorderless = Boolean(editor.getAttributes("table").borderless);
              editor.chain().focus().updateAttributes("table", { borderless: !isBorderless }).run();
            }}
            className={cn(
              "px-2 py-1 rounded text-[11px] font-medium transition cursor-pointer",
              editor.getAttributes("table").borderless
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200 font-semibold"
                : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            title="Toggle Borders (Clean / Bordered)"
          >
            {editor.getAttributes("table").borderless ? "Borders: Off (Clean)" : "Borders: On"}
          </button>
        </div>
      )}
    </div>
  );
}

const TemplateDocStyles = React.memo(function TemplateDocStyles() {
  return (
    <style>{`
      @import url("https://fonts.googleapis.com/css2?family=Arimo:wght@400;700&family=Carlito:wght@400;700&family=Comic+Neue:wght@400;700&family=Cousine:wght@400;700&family=EB+Garamond:wght@400;600&family=Fira+Code:wght@400;600&family=Gelasio:wght@400;600&family=Inter:wght@400;500;600;700&family=Lato:wght@400;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Merriweather:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Open+Sans:wght@400;600;700&family=Playfair+Display:wght@400;600;700&family=Poppins:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Tinos:wght@400;700&display=swap");

      .template-doc-editor {
        width: 794px;
      }
      .template-doc-editor .ProseMirror {
        outline: none;
      }
      .template-doc-editor .ProseMirror.rm-with-pagination {
        outline: none;
        background-color: #ffffff;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12), 0 1px 4px rgba(0, 0, 0, 0.06);
        border: 1px solid #cbd5e1;
        box-sizing: border-box;
        min-height: 1123px;
      }
      .dark .template-doc-editor .ProseMirror.rm-with-pagination {
        background-color: #0f172a;
        border-color: #1e293b;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      }
      .template-doc-editor .rm-pagination-gap {
        background-color: #e2e8f0 !important;
        height: 28px !important;
        border-top: 1px solid #cbd5e1 !important;
        border-bottom: 1px solid #cbd5e1 !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.06);
        position: relative;
        width: calc(100% + 2px) !important;
        left: -1px;
      }
      .dark .template-doc-editor .rm-pagination-gap {
        background-color: #020617 !important;
        border-color: #1e293b !important;
      }
      .template-doc-editor .rm-with-pagination .rm-page-header,
      .template-doc-editor .rm-with-pagination .rm-page-footer {
        font-size: 11px;
        color: #94a3b8;
        font-weight: 500;
        letter-spacing: 0.02em;
        user-select: none;
      }
      @media print {
        @page {
          size: A4;
          margin: 0;
        }
        html, body {
          background: #ffffff !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .template-doc-editor {
          width: 100% !important;
        }
        .template-doc-editor .ProseMirror.rm-with-pagination {
          box-shadow: none !important;
          border: none !important;
          width: 100% !important;
          min-height: unset !important;
        }
        .template-doc-editor .rm-pagination-gap {
          display: none !important;
          height: 0 !important;
        }
        .template-doc-editor .rm-with-pagination .rm-page-break {
          page-break-after: always !important;
          break-after: page !important;
        }
        .template-doc-editor .rm-with-pagination .rm-page-break:last-child {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
      }

      .template-doc-editor .ProseMirror p,
      .template-doc-editor .ProseMirror h1,
      .template-doc-editor .ProseMirror h2,
      .template-doc-editor .ProseMirror h3,
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) td,
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) th {
        white-space: pre-wrap;
      }

      /* Protect preview tables from vertical wrapping */
      .template-doc-editor .ProseMirror .pins-preview-table,
      .template-doc-editor .ProseMirror .pins-preview-table *,
      .template-doc-editor .ProseMirror .subform-preview-table,
      .template-doc-editor .ProseMirror .subform-preview-table * {
        word-break: normal !important;
      }
      .template-doc-editor .ProseMirror .pins-preview-table th,
      .template-doc-editor .ProseMirror .pins-preview-table td,
      .template-doc-editor .ProseMirror .subform-preview-table th,
      .template-doc-editor .ProseMirror .subform-preview-table td {
        white-space: nowrap !important;
      }

      /* ── Template variable pills (truncates with ... and expands on click) ── */
      .template-doc-editor .ProseMirror .template-var-pill {
        display: inline-block;
        max-width: 175px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        vertical-align: -2px;
        background-color: #f1f5f9;
        color: #1e40af;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        padding: 0 5px;
        margin: 0 1.5px;
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
        font-size: 0.85em;
        line-height: 1.35;
        font-weight: 500;
        cursor: pointer;
        user-select: all;
        transition: max-width 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
      }
      .template-doc-editor .ProseMirror .template-var-pill:hover {
        background-color: #e2e8f0;
        border-color: #94a3b8;
      }
      .template-doc-editor .ProseMirror .template-var-pill.is-expanded {
        max-width: 1000px;
        white-space: normal;
        background-color: #eff6ff;
        border-color: #93c5fd;
        color: #1d4ed8;
      }
      .dark .template-doc-editor .ProseMirror .template-var-pill {
        background-color: #1e293b;
        color: #60a5fa;
        border-color: #334155;
      }
      .dark .template-doc-editor .ProseMirror .template-var-pill:hover {
        background-color: #334155;
      }
      .dark .template-doc-editor .ProseMirror .template-var-pill.is-expanded {
        background-color: #1e3a5f;
        border-color: #3b82f6;
        color: #93c5fd;
      }

      .template-doc-editor .ProseMirror p.is-editor-empty:first-child::before {
        color: #94a3b8;
        content: attr(data-placeholder);
        float: left;
        height: 0;
        pointer-events: none;
      }
      .template-doc-editor .ProseMirror ul { list-style-type: disc; padding-left: 1.5rem; }
      .template-doc-editor .ProseMirror ol { list-style-type: decimal; padding-left: 1.5rem; }
      .template-doc-editor .ProseMirror h1 { font-size: 1.875rem; font-weight: 700; margin: 1rem 0 0.5rem; }
      .template-doc-editor .ProseMirror h2 { font-size: 1.5rem; font-weight: 600; margin: 0.875rem 0 0.4rem; }
      .template-doc-editor .ProseMirror h3 { font-size: 1.25rem; font-weight: 600; margin: 0.75rem 0 0.3rem; }
      .template-doc-editor .ProseMirror p { margin: 0.375rem 0; }
      .template-doc-editor .ProseMirror blockquote {
        border-left: 3px solid #3b82f6;
        margin: 0.75rem 0;
        padding: 0.5rem 1rem;
        background: rgba(59,130,246,0.06);
        border-radius: 0 4px 4px 0;
        color: #475569;
      }
      .template-doc-editor .ProseMirror code {
        background: #f1f5f9;
        border-radius: 3px;
        padding: 0.1em 0.3em;
        font-size: 0.875em;
        color: #e11d48;
      }
      .dark .template-doc-editor .ProseMirror code { background: #1e293b; color: #f472b6; }
      .template-doc-editor .ProseMirror hr { border: none; border-top: 1px solid #e2e8f0; margin: 1rem 0; }
      .dark .template-doc-editor .ProseMirror hr { border-top-color: #334155; }
      .dark .template-doc-editor .ProseMirror blockquote { color: #94a3b8; background: rgba(59,130,246,0.08); }
      .template-doc-editor .ProseMirror img {
        max-width: 100%;
        height: auto;
        border-radius: 4px;
        display: inline-block;
        margin: 0.5rem 0;
      }
      .template-doc-editor .ProseMirror img.ProseMirror-selectednode {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) {
        border-collapse: collapse;
        width: 100%;
        margin: 0.75rem 0;
        table-layout: fixed;
        overflow: visible !important;
      }
      .template-doc-editor .ProseMirror table {
        overflow: visible !important;
      }
      .template-doc-editor .ProseMirror td,
      .template-doc-editor .ProseMirror th {
        overflow: visible !important;
      }
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) td,
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) th {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
        min-width: 60px;
        vertical-align: top;
        position: relative;
        box-sizing: border-box;
      }
      .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) th {
        background: #f1f5f9;
        font-weight: 600;
        font-size: 0.8em;
        text-align: left;
        color: #475569;
      }
      .dark .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) td,
      .dark .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) th {
        border-color: #334155;
      }
      .dark .template-doc-editor .ProseMirror table:not(.pins-preview-table):not(.subform-preview-table) th {
        background: #1e293b;
        color: #94a3b8;
      }
      /* ── Borderless / Side-by-side column layout tables ─────────────────
         PaginationPlus injects display:contents + display:table + display:grid
         on ALL .rm-with-pagination tables, which completely breaks the side-by-side
         column layout. Override those injected rules specifically for borderless tables
         so they always render as a standard table with proper column widths. */

      /* 1. Restore standard table display (override PaginationPlus display:contents) */
      .template-doc-editor .ProseMirror.rm-with-pagination table.borderless-table,
      .template-doc-editor .ProseMirror.rm-with-pagination table[data-borderless="true"],
      .template-doc-editor .ProseMirror.rm-with-pagination table:has(td.borderless-cell) {
        display: table !important;
        table-layout: fixed !important;
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 0.25rem 0 !important;
        border: none !important;
        overflow: visible !important;
        box-sizing: border-box !important;
      }

      /* 2. Restore standard tbody display (override PaginationPlus display:table on tbody) */
      .template-doc-editor .ProseMirror.rm-with-pagination table.borderless-table tbody,
      .template-doc-editor .ProseMirror.rm-with-pagination table[data-borderless="true"] tbody,
      .template-doc-editor .ProseMirror.rm-with-pagination table:has(td.borderless-cell) tbody {
        display: table-row-group !important;
        max-height: none !important;
        overflow: visible !important;
      }

      /* 3. Restore standard tr display (override PaginationPlus display:grid on tr) */
      .template-doc-editor .ProseMirror.rm-with-pagination table.borderless-table tr,
      .template-doc-editor .ProseMirror.rm-with-pagination table[data-borderless="true"] tr,
      .template-doc-editor .ProseMirror.rm-with-pagination table:has(td.borderless-cell) tr {
        display: table-row !important;
        min-width: unset !important;
      }

      /* 4. Restore td as standard table cell with proper width */
      .template-doc-editor .ProseMirror table.borderless-table td,
      .template-doc-editor .ProseMirror table.borderless-table th,
      .template-doc-editor .ProseMirror table[data-borderless="true"] td,
      .template-doc-editor .ProseMirror table[data-borderless="true"] th,
      .template-doc-editor .ProseMirror td.borderless-cell,
      .template-doc-editor .ProseMirror td[data-borderless="true"],
      .template-doc-editor .ProseMirror table:has(td.borderless-cell) td {
        display: table-cell !important;
        position: relative !important;
        border: none !important;
        outline: none !important;
        padding: 2px 6px !important;
        background: transparent !important;
        overflow: visible !important;
        word-break: normal !important;
        box-sizing: border-box !important;
        /* Column resize: width comes from inline style set by TipTap's resizable table */
        min-width: 0;
      }
      /* Keep padding and margins minimal inside columns and boxes */
      .template-doc-editor .ProseMirror table.borderless-table td > p:first-child,
      .template-doc-editor .ProseMirror td.borderless-cell > p:first-child,
      .template-doc-editor .container-box-wrapper p:first-child {
        margin-top: 0 !important;
      }
      .template-doc-editor .ProseMirror table.borderless-table td > p:last-child,
      .template-doc-editor .ProseMirror td.borderless-cell > p:last-child,
      .template-doc-editor .container-box-wrapper p:last-child {
        margin-bottom: 0 !important;
      }
      .template-doc-editor .container-box-wrapper p {
        margin: 2px 0 !important;
      }
      /* Center separator only visible when actively typing/focused inside */
      .template-doc-editor .ProseMirror table.borderless-table:focus-within td:not(:last-child),
      .template-doc-editor .ProseMirror table[data-borderless="true"]:focus-within td:not(:last-child),
      .template-doc-editor .ProseMirror table:has(td.borderless-cell):focus-within td:not(:last-child),
      .template-doc-editor .ProseMirror tr:focus-within > td.borderless-cell:not(:last-child),
      .template-doc-editor .ProseMirror tr:has(td.borderless-cell):focus-within > td:not(:last-child) {
        border-right: 1px dashed #cbd5e1 !important;
      }
      .dark .template-doc-editor .ProseMirror table.borderless-table:focus-within td:not(:last-child),
      .dark .template-doc-editor .ProseMirror table[data-borderless="true"]:focus-within td:not(:last-child),
      .dark .template-doc-editor .ProseMirror table:has(td.borderless-cell):focus-within td:not(:last-child),
      .dark .template-doc-editor .ProseMirror tr:focus-within > td.borderless-cell:not(:last-child),
      .dark .template-doc-editor .ProseMirror tr:has(td.borderless-cell):focus-within > td:not(:last-child) {
        border-right: 1px dashed #475569 !important;
      }

      /* ── Subform Table Node View & Preview Table Styles ── */
      .template-doc-editor .subform-table-node-view {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
      }
      .template-doc-editor .ProseMirror table.subform-preview-table,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table {
        display: table !important;
        width: 100% !important;
        border-collapse: collapse !important;
        margin: 0 !important;
        border: none !important;
        overflow: visible !important;
      }
      .template-doc-editor .ProseMirror table.subform-preview-table thead,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table thead {
        display: table-header-group !important;
      }
      .template-doc-editor .ProseMirror table.subform-preview-table tbody,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table tbody {
        display: table-row-group !important;
        overflow: visible !important;
      }
      .template-doc-editor .ProseMirror table.subform-preview-table tr,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table tr {
        display: table-row !important;
      }
      .template-doc-editor .ProseMirror table.subform-preview-table th,
      .template-doc-editor .ProseMirror table.subform-preview-table td,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table th,
      .template-doc-editor .ProseMirror.rm-with-pagination table.subform-preview-table td {
        display: table-cell !important;
        border: none !important;
        padding: 10px 14px !important;
        vertical-align: middle !important;
        white-space: nowrap !important;
      }
      .template-doc-editor .ProseMirror table .selectedCell::after {
        background: rgba(59,130,246,0.12);
        content: '';
        left: 0; right: 0; top: 0; bottom: 0;
        pointer-events: none;
        position: absolute;
        z-index: 2;
      }
      .template-doc-editor .ProseMirror table .column-resize-handle {
        background-color: #3b82f6;
        bottom: -2px;
        pointer-events: none;
        position: absolute;
        right: -2px;
        top: 0;
        width: 3px;
      }
      .template-doc-editor .tableWrapper {
        padding: 0;
        overflow: visible !important;
      }
      .template-doc-editor .resize-cursor {
        cursor: col-resize;
      }
    `}</style>
  );
});

// ── Isolated Ribbon Toolbar Component ──────────────────────────────────────────
// Re-renders ONLY itself when selection or undo/redo changes, NEVER re-rendering the document!
interface TemplateEditorRibbonProps {
  editor: Editor | null;
  variablesSidebarCollapsed: boolean;
  onToggleVariablesSidebar: () => void;
  onOpenImageModal: () => void;
  onOpenPinsListModal?: () => void;
  /** Only shown when the doc does NOT yet have a global header */
  onOpenHeaderModal?: () => void;
  hasGlobalHeader?: boolean;
}

function TemplateEditorRibbon({
  editor,
  variablesSidebarCollapsed,
  onToggleVariablesSidebar,
  onOpenImageModal,
  onOpenPinsListModal,
  onOpenHeaderModal,
  hasGlobalHeader = false,
}: TemplateEditorRibbonProps) {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [tablePickerOpen, setTablePickerOpen] = useState(false);

  useEffect(() => {
    if (!editor) return;

    // Selection changes update button active states instantly
    editor.on("selectionUpdate", rerender);

    // Throttle transaction updates (undo/redo enable states) using requestAnimationFrame
    let rafId: number | null = null;
    const onTransaction = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        rerender();
      });
    };
    editor.on("transaction", onTransaction);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      editor.off("selectionUpdate", rerender);
      editor.off("transaction", onTransaction);
    };
  }, [editor]);

  const clearStoredLinkMark = useCallback(() => {
    if (!editor) return;
    const { link } = editor.schema.marks;
    if (!link) return;
    editor.view.dispatch(editor.state.tr.removeStoredMark(link));
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("Enter URL:", previousUrl);
    if (url === null) return;
    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      clearStoredLinkMark();
      return;
    }
    const href = url.trim();
    if (editor.state.selection.empty) {
      editor.chain().focus().insertContent(`<a href="${href}">${href}</a>`).run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    const end = editor.state.selection.to;
    editor.chain().focus().setTextSelection(end).unsetMark("link").run();
    clearStoredLinkMark();
  }, [editor, clearStoredLinkMark]);

  const handleInsertTable = useCallback(
    (rows: number, cols: number) => {
      if (!editor) return;
      editor
        .chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      setTablePickerOpen(false);
    },
    [editor],
  );

  const handleInsert2ColumnLayout = useCallback(() => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent(
        `<table data-borderless="true" class="borderless-table" style="width: 100%;"><tbody><tr><td class="borderless-cell" data-borderless="true" style="width: 50%; vertical-align: top;"><p>Left column text...</p></td><td class="borderless-cell" data-borderless="true" style="width: 50%; vertical-align: top;"><p>Right column text...</p></td></tr></tbody></table><p></p>`
      )
      .run();
  }, [editor]);

  const handleInsertImageSideText = useCallback(() => {
    if (!editor) return;
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100" viewBox="0 0 160 100"><rect width="100%" height="100%" fill="#f1f5f9" rx="6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="sans-serif" font-size="12" font-weight="600">Company Logo</text></svg>`;
    const placeholderSvg = `data:image/svg+xml;utf8,${encodeURIComponent(svgData)}`;
    editor
      .chain()
      .focus()
      .insertContent(
        `<table data-borderless="true" class="borderless-table" style="width: 100%;"><tbody><tr><td class="borderless-cell" data-borderless="true" style="width: 35%; vertical-align: top;"><p><img src="${placeholderSvg}" width="160" /></p></td><td class="borderless-cell" data-borderless="true" style="width: 65%; vertical-align: top; text-align: right;"><p><strong>Company Name</strong></p><p>Address line 1</p><p>Email: contact@example.com</p></td></tr></tbody></table><p></p>`
      )
      .run();
  }, [editor]);

  const getHeadingLabel = () => {
    if (!editor) return "Normal text";
    if (editor.isActive("heading", { level: 1 })) return "Heading 1";
    if (editor.isActive("heading", { level: 2 })) return "Heading 2";
    if (editor.isActive("heading", { level: 3 })) return "Heading 3";
    return "Normal text";
  };

  const getCurrentFontSize = (): string => {
    if (!editor) return "";
    const attrs = editor.getAttributes("textStyle");
    if (attrs?.fontSize) {
      return String(attrs.fontSize).replace(/[^0-9]/g, "");
    }
    return "";
  };

  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-0.5 gap-y-1 px-3 py-1.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-[60] shadow-sm overflow-visible">
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => editor.chain().focus().undo().run()}
        title="Undo (Ctrl+Z)"
        disabled={!editor.can().undo()}
      >
        <Undo2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().redo().run()}
        title="Redo (Ctrl+Y)"
        disabled={!editor.can().redo()}
      >
        <Redo2 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Font Family Dropdown */}
      <FontFamilyPicker editor={editor} />

      {/* Font Size Dropdown */}
      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1 px-2 h-7 rounded text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors w-[62px] justify-between"
          title="Font size"
        >
          <span className="font-medium">{getCurrentFontSize() || "Size"}</span>
          <ChevronDown size={11} />
        </button>
        <div className="absolute top-full left-0 mt-0.5 w-20 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-[9999] hidden group-hover:block max-h-56 overflow-y-auto">
          <button
            type="button"
            className="w-full text-left px-3 py-1 text-[12px] hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 italic first:rounded-t-md"
            onClick={() => editor.chain().focus().unsetFontSize().run()}
          >
            Default
          </button>
          {FONT_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`w-full text-left px-3 py-1 text-[12px] hover:bg-blue-50 dark:hover:bg-slate-700 last:rounded-b-md ${
                getCurrentFontSize() === size
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                  : "text-slate-700 dark:text-slate-200"
              }`}
              onClick={() => editor.chain().focus().setFontSize(`${size}px`).run()}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Paragraph style dropdown */}
      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1.5 px-2 h-7 rounded text-[12px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition-colors min-w-[96px] justify-between"
          title="Styles"
        >
          <span className="font-medium">{getHeadingLabel()}</span>
          <ChevronDown size={11} />
        </button>
        <div className="absolute top-full left-0 mt-0.5 w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-[9999] hidden group-hover:block py-1">
          {HEADING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-blue-50 dark:hover:bg-slate-700 ${
                (opt.value === "paragraph" && !editor.isActive("heading")) ||
                (opt.value === "h1" && editor.isActive("heading", { level: 1 })) ||
                (opt.value === "h2" && editor.isActive("heading", { level: 2 })) ||
                (opt.value === "h3" && editor.isActive("heading", { level: 3 }))
                  ? "bg-blue-50 text-blue-600 dark:bg-blue-900/40 dark:text-blue-300 font-semibold"
                  : "text-slate-700 dark:text-slate-200"
              }`}
              onClick={() => {
                if (opt.value === "paragraph") editor.chain().focus().setParagraph().run();
                if (opt.value === "h1") editor.chain().focus().toggleHeading({ level: 1 }).run();
                if (opt.value === "h2") editor.chain().focus().toggleHeading({ level: 2 }).run();
                if (opt.value === "h3") editor.chain().focus().toggleHeading({ level: 3 }).run();
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Divider />

      {/* Quick Heading buttons */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        isActive={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        isActive={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        isActive={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 size={14} />
      </ToolbarButton>

      <Divider />

      {/* Basic formatting marks */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        isActive={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        isActive={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        isActive={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        isActive={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </ToolbarButton>
      <TextColorPicker editor={editor} />
      <HighlightColorPicker editor={editor} />
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        isActive={editor.isActive("code")}
        title="Inline Code"
      >
        <Code size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        isActive={editor.isActive("blockquote")}
        title="Blockquote"
      >
        <Quote size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Line"
      >
        <Minus size={14} />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        isActive={editor.isActive("bulletList")}
        title="Bullet list"
      >
        <List size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        isActive={editor.isActive("orderedList")}
        title="Numbered list"
      >
        <ListOrdered size={14} />
      </ToolbarButton>

      <Divider />

      {/* Alignment */}
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        isActive={editor.isActive({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeft size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        isActive={editor.isActive({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenter size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        isActive={editor.isActive({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRight size={14} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
        isActive={editor.isActive({ textAlign: "justify" })}
        title="Justify"
      >
        <AlignJustify size={14} />
      </ToolbarButton>

      {/* Vertical & Horizontal Spacing Pickers */}
      <LineSpacingPicker editor={editor} />
      <LetterSpacingPicker editor={editor} />

      <Divider />

      {/* Link & Image */}
      <ToolbarButton
        onClick={setLink}
        isActive={editor.isActive("link")}
        title="Insert link"
      >
        <LinkIcon size={14} />
      </ToolbarButton>
      {editor.isActive("link") && (
        <ToolbarButton
          onClick={() => {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            clearStoredLinkMark();
          }}
          title="Remove link"
        >
          <Unlink size={14} />
        </ToolbarButton>
      )}
      <ToolbarButton onClick={onOpenImageModal} title="Insert image (Upload or URL)">
        <ImageIcon size={14} />
      </ToolbarButton>

      {/* Side-by-Side: Image (Left) + Text (Right) */}
      <ToolbarButton
        onClick={handleInsertImageSideText}
        title="Side-by-Side: Image (Left) + Text (Right)"
      >
        <PanelLeft size={14} className="text-indigo-600 dark:text-indigo-400" />
      </ToolbarButton>

      {/* 2-Column Side-by-Side Text */}
      <ToolbarButton
        onClick={handleInsert2ColumnLayout}
        title="2-Column Side-by-Side Text"
      >
        <Columns2 size={14} className="text-indigo-600 dark:text-indigo-400" />
      </ToolbarButton>

      {/* Container / Text Box */}
      <ToolbarButton
        onClick={() => (editor.commands as any).insertContainerBox?.()}
        isActive={editor.isActive("containerBox")}
        title="Insert Container / Text Box (Custom background & resizable)"
      >
        <SquareDashed size={14} className="text-indigo-600 dark:text-indigo-400" />
      </ToolbarButton>

      {/* Table Inserter */}
      <div className="relative">
        <ToolbarButton
          onClick={() => setTablePickerOpen((v) => !v)}
          isActive={editor.isActive("table") || tablePickerOpen}
          title="Insert table"
        >
          <TableIcon size={14} />
        </ToolbarButton>
        {tablePickerOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setTablePickerOpen(false)}
            />
            <TableGridPicker onSelect={handleInsertTable} />
          </>
        )}
      </div>


      {/* Pins List Table Button */}
      {onOpenPinsListModal && (
        <ToolbarButton
          onClick={onOpenPinsListModal}
          title="Insert Items Table / Pins List"
        >
          <TableProperties size={14} className="text-blue-600 dark:text-blue-400" />
        </ToolbarButton>
      )}

      {/* Document Header Button — hidden when a global header already exists */}
      {onOpenHeaderModal && !hasGlobalHeader && (
        <ToolbarButton
          onClick={onOpenHeaderModal}
          title="Create Document Header (Letterhead & Title)"
        >
          <PanelTop size={14} className="text-blue-600 dark:text-blue-400" />
        </ToolbarButton>
      )}

      <Divider />

      {/* Variables & Options Sidebar Toggle */}
      <ToolbarButton
        onClick={onToggleVariablesSidebar}
        title={variablesSidebarCollapsed ? "Show Options & Variables" : "Hide Options & Variables"}
        isActive={!variablesSidebarCollapsed}
      >
        <Tag size={14} />
      </ToolbarButton>

      <Divider />

      {/* Print / Download PDF */}
      <ToolbarButton
        onClick={() => window.print()}
        title="Print / Save as PDF (A4)"
      >
        <Printer size={14} className="text-slate-600 dark:text-slate-400" />
      </ToolbarButton>
    </div>
  );
}

// ── Main TemplateDocEditor ───────────────────────────────────────────────────
interface TemplateEditorProps {
  value?: string;
  onChange?: (html: string, files?: File[]) => void;
  placeholder?: string;
  readOnly?: boolean;
  autoFocus?: boolean;
  moduleName?: string;
}

export function preserveSpacesInHtml(html: string): string {
  if (!html) return html;
  let out = html.replace(/>([^<]+)</g, (_fullMatch, textContent) => {
    let res = textContent;
    if (res.startsWith(" ")) {
      res = "&nbsp;" + res.slice(1);
    }
    if (res.endsWith(" ")) {
      res = res.slice(0, -1) + "&nbsp;";
    }
    res = res.replace(/ {2,}/g, (spaces: string) => {
      let s = "";
      for (let i = 0; i < spaces.length; i++) {
        s += i % 2 === 1 ? "&nbsp;" : " ";
      }
      return s;
    });
    return `>${res}<`;
  });

  // Convert colwidth attributes on <td> and <th> tags to inline CSS widths and inject table cell styles
  out = out.replace(/<(td|th)\b([^>]*)>/gi, (match, tag, attrs) => {
    const isHeader = tag.toLowerCase() === "th";
    const isBorderless = attrs.includes("borderless");

    const defaultCellStyles = isBorderless
      ? "border: none; outline: none; padding: 4px 10px; vertical-align: middle;"
      : isHeader
      ? "border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9; font-weight: 600; text-align: left; color: #475569; vertical-align: top;"
      : "border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top;";

    const colMatch = attrs.match(/\bcolwidth="([^"]+)"/i);
    let totalWidth = 0;
    if (colMatch) {
      totalWidth = colMatch[1]
        .split(",")
        .reduce((sum: number, v: string) => sum + (parseInt(v.trim(), 10) || 0), 0);
    }

    if (attrs.includes("style=")) {
      return match.replace(/style="([^"]*)"/i, (_sMatch: string, styleVal: string) => {
        let updated = styleVal;
        if (totalWidth > 0 && !/width\s*:/i.test(updated)) {
          updated = `width: ${totalWidth}px; ${updated}`.trim();
        }
        if (!/border\s*:/i.test(updated)) {
          updated = `${defaultCellStyles} ${updated}`.trim();
        }
        return `style="${updated}"`;
      });
    } else {
      const widthStyle = totalWidth > 0 ? ` width: ${totalWidth}px;` : "";
      return `<${tag}${attrs} style="${defaultCellStyles}${widthStyle}">`;
    }
  });

  // Ensure all tables retain inline table styles (border-collapse, width, borders)
  out = out.replace(/<table\b([^>]*)>/gi, (match, attrs) => {
    const isBorderless =
      attrs.includes("borderless") ||
      attrs.includes("data-borderless=\"true\"");

    const defaultTableStyles = isBorderless
      ? "width: 100%; border-collapse: collapse; border: none; table-layout: fixed;"
      : "width: 100%; border-collapse: collapse; table-layout: fixed; border: 1px solid #cbd5e1;";

    if (attrs.includes("style=")) {
      return match.replace(/style="([^"]*)"/i, (_sMatch, styleVal) => {
        let updated = styleVal;
        if (!/width\s*:/i.test(updated)) {
          updated = `width: 100%; ${updated}`.trim();
        }
        if (!/border-collapse\s*:/i.test(updated)) {
          updated = `border-collapse: collapse; ${updated}`.trim();
        }
        if (!/table-layout\s*:/i.test(updated)) {
          updated = `table-layout: fixed; ${updated}`.trim();
        }
        if (!/border\s*:/i.test(updated)) {
          const borderPart = isBorderless ? "border: none;" : "border: 1px solid #cbd5e1;";
          updated = `${borderPart} ${updated}`.trim();
        }
        return `style="${updated}"`;
      });
    } else {
      return `<table${attrs} style="${defaultTableStyles}">`;
    }
  });

  return out;
}

const CustomTable = Table.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderless: {
        default: false,
        parseHTML: (element) =>
          element.classList.contains("borderless-table") ||
          element.getAttribute("data-borderless") === "true",
        renderHTML: (attributes) => {
          if (!attributes.borderless) return {};
          return {
            "data-borderless": "true",
            class: "borderless-table",
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const existingStyle = (HTMLAttributes?.style as string) || "";
    let updatedStyle = existingStyle;
    if (!existingStyle.includes("width:") && !existingStyle.includes("width :")) {
      updatedStyle = existingStyle ? `width: 100%; ${existingStyle}` : "width: 100%;";
    }
    if (!updatedStyle.includes("border-collapse:") && !updatedStyle.includes("border-collapse :")) {
      updatedStyle = `${updatedStyle} border-collapse: collapse;`.trim();
    }
    const isBorderless =
      HTMLAttributes.borderless ||
      (HTMLAttributes.class as string)?.includes("borderless-table") ||
      HTMLAttributes["data-borderless"] === "true";
    if (isBorderless) {
      if (!updatedStyle.includes("table-layout:") && !updatedStyle.includes("table-layout :")) {
        updatedStyle = `${updatedStyle} table-layout: fixed;`.trim();
      }
      if (!updatedStyle.includes("border:") && !updatedStyle.includes("border :")) {
        updatedStyle = `${updatedStyle} border: none;`.trim();
      }
    } else {
      if (!updatedStyle.includes("table-layout:") && !updatedStyle.includes("table-layout :")) {
        updatedStyle = `${updatedStyle} table-layout: fixed;`.trim();
      }
      if (!updatedStyle.includes("border:") && !updatedStyle.includes("border :")) {
        updatedStyle = `${updatedStyle} border: 1px solid #cbd5e1;`.trim();
      }
    }
    return [
      "table",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style: updatedStyle }),
      ["tbody", 0],
    ];
  },
});

const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      borderless: {
        default: false,
        parseHTML: (element) =>
          element.classList.contains("borderless-cell") ||
          element.getAttribute("data-borderless") === "true" ||
          Boolean(element.closest("table")?.classList.contains("borderless-table")) ||
          element.closest("table")?.getAttribute("data-borderless") === "true",
        renderHTML: (attributes) => {
          if (!attributes.borderless) return {};
          return {
            "data-borderless": "true",
            class: "borderless-cell",
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const colwidth = HTMLAttributes.colwidth;
    let style = (HTMLAttributes?.style as string) || "";
    if (colwidth) {
      const widthVals = Array.isArray(colwidth) ? colwidth : String(colwidth).split(",");
      const totalWidth = widthVals.reduce(
        (sum: number, v: string | number) => sum + (parseInt(String(v).trim(), 10) || 0),
        0
      );
      if (totalWidth > 0 && !style.includes("width:") && !style.includes("width :")) {
        style = style ? `width: ${totalWidth}px; ${style}` : `width: ${totalWidth}px;`;
      }
    }

    const isBorderless =
      HTMLAttributes.borderless ||
      (HTMLAttributes.class as string)?.includes("borderless-cell") ||
      HTMLAttributes["data-borderless"] === "true";

    const baseStyle = isBorderless
      ? "border: none; outline: none; padding: 4px 10px; vertical-align: middle;"
      : "border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top;";

    const finalStyle = style ? `${baseStyle} ${style}`.trim() : baseStyle;

    return [
      "td",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style: finalStyle }),
      0,
    ];
  },
});

const CustomTableHeader = TableHeader.extend({
  renderHTML({ HTMLAttributes }) {
    const colwidth = HTMLAttributes.colwidth;
    let style = (HTMLAttributes?.style as string) || "";
    if (colwidth) {
      const widthVals = Array.isArray(colwidth) ? colwidth : String(colwidth).split(",");
      const totalWidth = widthVals.reduce(
        (sum: number, v: string | number) => sum + (parseInt(String(v).trim(), 10) || 0),
        0
      );
      if (totalWidth > 0 && !style.includes("width:") && !style.includes("width :")) {
        style = style ? `width: ${totalWidth}px; ${style}` : `width: ${totalWidth}px;`;
      }
    }

    const isBorderless =
      HTMLAttributes.borderless ||
      (HTMLAttributes.class as string)?.includes("borderless-cell") ||
      HTMLAttributes["data-borderless"] === "true";

    const baseStyle = isBorderless
      ? "border: none; outline: none; padding: 4px 10px; vertical-align: middle;"
      : "border: 1px solid #cbd5e1; padding: 6px 10px; background-color: #f1f5f9; font-weight: 600; text-align: left; color: #475569; vertical-align: top;";

    const finalStyle = style ? `${baseStyle} ${style}`.trim() : baseStyle;

    return [
      "th",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { style: finalStyle }),
      0,
    ];
  },
});

export default function TemplateDocEditor({
  value = "",
  onChange,
  placeholder = "Start typing your template here…",
  readOnly = false,
  autoFocus = false,
  moduleName = "quotations",
}: TemplateEditorProps) {
  const uploadedFilesRef = useRef<Map<string, File>>(new Map());
  const updateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pinsModalOpen, setPinsModalOpen] = useState(false);
  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [variablesSidebarCollapsed, setVariablesSidebarCollapsed] = useState(false);
  const [templateVariables, setTemplateVariables] = useState<VariableItem[]>([]);
  /** True when the document already contains a global (copy-to-whole) header node. */
  const [hasGlobalHeader, setHasGlobalHeader] = useState(false);

  /** Re-checks whether a global header exists in the current doc. */
  const syncGlobalHeaderState = useCallback((ed: Editor) => {
    let found = false;
    ed.state.doc.forEach((node) => {
      if (node.type.name === "documentHeader" && (node.attrs.isGlobalHeader || node.attrs.copyToWhole)) {
        found = true;
      }
    });
    setHasGlobalHeader(found);
  }, []);

  const flushChange = useCallback((ed?: Editor | null) => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    const target = ed || editor;
    if (target) {
      const html = preserveSpacesInHtml(target.getHTML());
      onChangeRef.current?.(html, Array.from(uploadedFilesRef.current.values()));
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { keepMarks: false, keepAttributes: false },
        orderedList: { keepMarks: false, keepAttributes: false },
      }),
      Underline,
      TextStyleKit,
      LetterSpacingExtension,
      BlockLineHeightExtension,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      CustomTable.configure({ resizable: true }),
      TableRow,
      CustomTableHeader,
      CustomTableCell,
      TransformableImageExtension,
      PinsTableExtension,
      SignatureExtension,
      ContainerBoxExtension,
      DocumentHeaderExtension,
      ImageVariableExtension,
      ImageLayoutExtension,
      SubformTableExtension,
      TemplateVariablePillExtension,
      Placeholder.configure({ placeholder }),
      PaginationPlus.configure({
        pageWidth: PAGE_SIZES.A4.pageWidth,
        pageHeight: PAGE_SIZES.A4.pageHeight,
        marginTop: 48,
        marginBottom: 48,
        marginLeft: 64,
        marginRight: 64,
        pageGap: 28,
        pageGapBorderSize: 1,
        pageGapBorderColor: "#cbd5e1",
        pageBreakBackground: "#e2e8f0",
        footerRight: "Page {page}",
      }),
    ],
    immediatelyRender: false,
    content: value,
    parseOptions: {
      preserveWhitespace: "full",
    },
    editable: !readOnly,
    autofocus: autoFocus,
    onUpdate: ({ editor: ed }) => {
      // Debounce expensive getHTML serialization so typing is 0ms latency
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(() => {
        const html = preserveSpacesInHtml(ed.getHTML());
        onChangeRef.current?.(html, Array.from(uploadedFilesRef.current.values()));
      }, 200);
      // Keep global-header indicator in sync
      syncGlobalHeaderState(ed);
    },
    editorProps: {
      handleDOMEvents: {
        blur: (_view, _event) => {
          if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
            if (editor) {
              const html = preserveSpacesInHtml(editor.getHTML());
              onChangeRef.current?.(html, Array.from(uploadedFilesRef.current.values()));
            }
          }
          return false;
        },
      },
      handleDrop: (view, event) => {
        const isSignature = event.dataTransfer?.getData("application/x-signature-block");
        if (isSignature) {
          event.preventDefault();
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coordinates) {
            const node = view.state.schema.nodes.signature?.create({
              imageKey: "",
            });
            if (node) {
              const tr = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(tr);
              return true;
            }
          }
        }

        const isContainerBox = event.dataTransfer?.getData("application/x-container-box");
        if (isContainerBox) {
          event.preventDefault();
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coordinates) {
            const pNode = view.state.schema.nodes.paragraph?.create(null, [
              view.state.schema.text("Type your content in this box..."),
            ]);
            const node = view.state.schema.nodes.containerBox?.create(
              { backgroundColor: "#f8fafc", width: "100%", borderRadius: "8px", padding: "6px 10px", minHeight: "32px" },
              pNode ? [pNode] : undefined,
            );
            if (node) {
              const tr = view.state.tr.insert(coordinates.pos, node);
              view.dispatch(tr);
              return true;
            }
          }
        }

        const isHeader = event.dataTransfer?.getData("application/x-header-block");
        if (isHeader) {
          event.preventDefault();
          if (!editor) return true;
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          const pos = coordinates ? coordinates.pos : 0;
          editor
            .chain()
            .focus()
            .insertContentAt(pos, {
              type: "documentHeader",
              attrs: { copyToWhole: false },
              content: [{ type: "paragraph" }],
            })
            .setTextSelection(pos + 1)
            .run();
          flushChange(editor);
          return true;
        }

        const imageLayoutData = event.dataTransfer?.getData("application/x-image-layout");
        if (imageLayoutData) {
          event.preventDefault();
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coordinates) {
            try {
              const attrs = JSON.parse(imageLayoutData);
              const node = view.state.schema.nodes.imageLayout?.create(attrs);
              if (node) {
                const tr = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(tr);
                return true;
              }
            } catch { /* ignore */ }
          }
        }

        const subformData = event.dataTransfer?.getData("application/x-subform-table");
        if (subformData) {
          event.preventDefault();
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coordinates) {
            try {
              const attrs = JSON.parse(subformData);
              const node = view.state.schema.nodes.subformTable?.create(attrs);
              if (node) {
                const tr = view.state.tr.insert(coordinates.pos, node);
                view.dispatch(tr);
                return true;
              }
            } catch { /* ignore */ }
          }
        }

        return false;
      },
      attributes: {
        class:
          "focus:outline-none text-slate-900 dark:text-slate-100 prose prose-base dark:prose-invert max-w-none leading-relaxed",
      },
    },
  });

  // Sync external value changes (e.g. initial load), avoiding cursor resets while typing
  const lastLoadedValueRef = useRef(value);
  useEffect(() => {
    if (editor && value !== undefined && value !== lastLoadedValueRef.current) {
      lastLoadedValueRef.current = value;
      if (value !== editor.getHTML()) {
        const timer = setTimeout(() => {
          if (!editor.isDestroyed) {
            (editor.commands.setContent as (output: any, emitUpdate?: boolean, parseOptions?: any) => boolean)(
              value,
              false,
              { preserveWhitespace: "full" },
            );
          }
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [editor, value]);

  // Sync editable
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Sync hasGlobalHeader on initial mount and after external content loads
  useEffect(() => {
    if (editor) syncGlobalHeaderState(editor);
  }, [editor, value, syncGlobalHeaderState]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // Preload template variables on mount so Image modal has access to them immediately
  useEffect(() => {
    let active = true;
    fetchModuleVariables(moduleName)
      .then((data) => {
        if (active && data.allVariables && data.allVariables.length > 0) {
          setTemplateVariables(data.allVariables);
        }
      })
      .catch((err) => {
        console.warn("Failed to preload variables in editor:", err);
      });
    return () => {
      active = false;
    };
  }, [moduleName]);

  useEffect(() => {
    if (editor && templateVariables && templateVariables.length > 0) {
      (editor as any).templateVariables = templateVariables;
    }
  }, [editor, templateVariables]);

  const handleInsertImage = useCallback(
    (url: string, alt?: string, file?: File) => {
      if (!editor) return;

      // Dynamic image variable marker: <!--Image key="key" --> or <!image key=...>
      const varMatch =
        url.match(/^<!--\s*Image\s+key=["']?([^"'>]+)["']?\s*(?:-->|--1>)?$/i) ||
        url.match(/^<!image\s+key=([^>]+)>$/i);
      if (varMatch) {
        const key = varMatch[1].replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();
        editor
          .chain()
          .focus()
          .insertContent({
            type: "imageVariable",
            attrs: {
              imageKey: key,
              width: "360px",
              alignment: "left",
            },
          })
          .run();
        flushChange(editor);
        return;
      }

      // Regular file/URL image
      if (file) {
        uploadedFilesRef.current.set(url, file);
      }
      editor
        .chain()
        .focus()
        .setImage({ src: url, alt, filename: file?.name } as unknown as { src: string; alt?: string })
        .run();
      flushChange(editor);
    },
    [editor, flushChange],
  );

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      <TemplateDocStyles />

      {/* === WORD-LIKE RIBBON TOOLBAR === */}
      {!readOnly && editor && (
        <TemplateEditorRibbon
          editor={editor}
          variablesSidebarCollapsed={variablesSidebarCollapsed}
          onToggleVariablesSidebar={() => setVariablesSidebarCollapsed((v) => !v)}
          onOpenImageModal={() => setImageModalOpen(true)}
          onOpenPinsListModal={() => setPinsModalOpen(true)}
          onOpenHeaderModal={() => setHeaderModalOpen(true)}
          hasGlobalHeader={hasGlobalHeader}
        />
      )}

      {/* === MAIN CONTENT ROW: OPTIONS/VARIABLES SIDEBAR (LEFT) + DOCUMENT CANVAS (RIGHT) === */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!readOnly && editor && (
          <TemplateVariablesSidebar
            editor={editor}
            collapsed={variablesSidebarCollapsed}
            onToggleCollapse={() => setVariablesSidebarCollapsed((v) => !v)}
            onOpenPinsListModal={() => setPinsModalOpen(true)}
            onOpenHeaderModal={() => setHeaderModalOpen(true)}
            moduleName={moduleName}
            onVariablesLoaded={(vars) => setTemplateVariables(vars)}
          />
        )}

        {/* === DOCUMENT CANVAS === */}
        <div className="flex-1 overflow-y-auto bg-slate-200 dark:bg-slate-950 min-h-0">
          <div className="flex justify-center px-8 py-10">
            <div className="template-doc-editor relative w-[794px]">
              <TableFloatingActions editor={editor} />
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
      </div>

      {/* Image Uploader Modal (File Upload + URL Link) */}
      <ImageUploaderModal
        open={imageModalOpen}
        onClose={() => setImageModalOpen(false)}
        onInsert={handleInsertImage}
        variables={templateVariables}
      />

      {/* Pins List Configurator Modal */}
      <PinsListModal
        open={pinsModalOpen}
        onClose={() => setPinsModalOpen(false)}
        editor={editor}
        variables={templateVariables}
      />

      {/* Document Header Configurator Modal */}
      <HeaderModal
        open={headerModalOpen}
        onClose={() => setHeaderModalOpen(false)}
        onInsertHeader={(attrs, atTop) => {
          if (!editor) return;
          // When copyToWhole is enabled, also mark it as a global header
          const resolvedAttrs: typeof attrs = {
            ...attrs,
            isGlobalHeader: attrs.copyToWhole ?? false,
          };
          const content = {
            type: "documentHeader",
            attrs: resolvedAttrs,
            content: [{ type: "paragraph" }],
          };
          if (atTop) {
            editor
              .chain()
              .focus()
              .insertContentAt(0, content)
              .setTextSelection(1)
              .run();
          } else {
            const currentPos = editor.state.selection.from;
            editor
              .chain()
              .focus()
              .insertContent(content)
              .setTextSelection(currentPos + 1)
              .run();
          }
          flushChange(editor);
          // Update the global header indicator immediately after insert
          syncGlobalHeaderState(editor);
        }}
      />
    </div>
  );
}