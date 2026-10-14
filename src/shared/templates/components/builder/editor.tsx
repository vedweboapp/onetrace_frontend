"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
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
import { ImageUploaderModal } from "./image-uploader-modal";
import { TemplateVariablesSidebar } from "./variables-sidebar";
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

const TemplateDocStyles = React.memo(function TemplateDocStyles() {
  return (
    <style>{`
      .template-doc-editor .ProseMirror { outline: none; min-height: 600px; }
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
      .template-doc-editor .ProseMirror table {
        border-collapse: collapse;
        width: 100%;
        margin: 0.75rem 0;
        table-layout: fixed;
        overflow: hidden;
      }
      .template-doc-editor .ProseMirror table td,
      .template-doc-editor .ProseMirror table th {
        border: 1px solid #cbd5e1;
        padding: 6px 10px;
        min-width: 60px;
        vertical-align: top;
        position: relative;
        box-sizing: border-box;
      }
      .template-doc-editor .ProseMirror table th {
        background: #f1f5f9;
        font-weight: 600;
        font-size: 0.8em;
        text-align: left;
        color: #475569;
      }
      .dark .template-doc-editor .ProseMirror table td,
      .dark .template-doc-editor .ProseMirror table th {
        border-color: #334155;
      }
      .dark .template-doc-editor .ProseMirror table th {
        background: #1e293b;
        color: #94a3b8;
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
        padding: 0.25rem 0;
        overflow-x: auto;
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
}

function TemplateEditorRibbon({
  editor,
  variablesSidebarCollapsed,
  onToggleVariablesSidebar,
  onOpenImageModal,
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
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        isActive={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter size={14} />
      </ToolbarButton>
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

      <Divider />

      {/* Variables & Options Sidebar Toggle */}
      <ToolbarButton
        onClick={onToggleVariablesSidebar}
        title={variablesSidebarCollapsed ? "Show Options & Variables" : "Hide Options & Variables"}
        isActive={!variablesSidebarCollapsed}
      >
        <Tag size={14} />
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
  const [variablesSidebarCollapsed, setVariablesSidebarCollapsed] = useState(false);

  const flushChange = useCallback((ed?: Editor | null) => {
    if (updateTimerRef.current) {
      clearTimeout(updateTimerRef.current);
      updateTimerRef.current = null;
    }
    const target = ed || editor;
    if (target) {
      onChangeRef.current?.(target.getHTML(), Array.from(uploadedFilesRef.current.values()));
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
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: { class: "text-blue-600 underline cursor-pointer" },
      }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      TransformableImageExtension,
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    editable: !readOnly,
    autofocus: autoFocus,
    onUpdate: ({ editor: ed }) => {
      // Debounce expensive getHTML serialization so typing is 0ms latency
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
      updateTimerRef.current = setTimeout(() => {
        onChangeRef.current?.(ed.getHTML(), Array.from(uploadedFilesRef.current.values()));
      }, 200);
    },
    editorProps: {
      handleDOMEvents: {
        blur: (_view, _event) => {
          if (updateTimerRef.current) {
            clearTimeout(updateTimerRef.current);
            updateTimerRef.current = null;
            if (editor) {
              onChangeRef.current?.(editor.getHTML(), Array.from(uploadedFilesRef.current.values()));
            }
          }
          return false;
        },
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
        editor.commands.setContent(value);
      }
    }
  }, [editor, value]);

  // Sync editable
  useEffect(() => {
    if (editor) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  // Cleanup pending timer on unmount
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  const handleInsertImage = useCallback(
    (url: string, alt?: string, file?: File) => {
      if (!editor) return;
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
        />
      )}

      {/* === MAIN CONTENT ROW: OPTIONS/VARIABLES SIDEBAR (LEFT) + DOCUMENT CANVAS (RIGHT) === */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {!readOnly && editor && (
          <TemplateVariablesSidebar
            editor={editor}
            collapsed={variablesSidebarCollapsed}
            onToggleCollapse={() => setVariablesSidebarCollapsed((v) => !v)}
            moduleName={moduleName}
          />
        )}

        {/* === DOCUMENT CANVAS === */}
        <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 min-h-0">
          {/* A4-like page wrapper */}
          <div className="max-w-4xl mx-auto my-8 px-4">
            <div
              className="template-doc-editor bg-white dark:bg-slate-900 shadow-lg rounded-sm border border-slate-200 dark:border-slate-700"
              style={{ minHeight: "calc(297mm * 0.75)", padding: "48px 64px" }}
            >
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
      />
    </div>
  );
}