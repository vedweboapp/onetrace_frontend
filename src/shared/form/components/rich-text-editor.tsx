"use client";

import React, { useCallback, useEffect, useReducer } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Undo2,
  Redo2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter,
  Link as LinkIcon,
  Unlink,
} from "lucide-react";

interface RichTextEditorProps {
  label?: any;
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  errors?: any;
  readOnly?: boolean;
  placeholder?: string;
  name?: string;
  /** `plain` drops the editor border so a parent card can own the frame. */
  chrome?: "default" | "plain";
  toolbarPlacement?: "top" | "bottom";
  /** Rendered between the writing area and a bottom toolbar. */
  between?: React.ReactNode;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  label,
  value,
  onChange,
  onBlur,
  errors,
  readOnly,
  placeholder,
  name,
  chrome = "default",
  toolbarPlacement = "top",
  between,
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: false,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: false,
          keepAttributes: false,
        },
      }),
      Underline,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        HTMLAttributes: {
          class: "text-blue-500 underline cursor-pointer",
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Enter text...",
      }),
    ],
    content: value || "",
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    onBlur: () => {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[150px] p-3 text-slate-900 dark:text-white prose prose-sm dark:prose-invert max-w-none",
      },
    },
  });

  // Keep content in sync if value is updated from outside
  useEffect(() => {
    if (editor && value !== undefined && value !== editor.getHTML()) {
      editor.commands.setContent(value || "");
    }
  }, [value, editor]);

  // Keep editable status in sync
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [readOnly, editor]);

  // Re-render toolbar when selection or marks change (stored marks, toggles, links)
  const [, rerenderToolbar] = useReducer((n: number) => n + 1, 0);

  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => rerenderToolbar();

    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
    };
  }, [editor]);

  const clearStoredLinkMark = useCallback(() => {
    if (!editor) return;
    const { link } = editor.schema.marks;
    if (!link) return;
    const tr = editor.state.tr.removeStoredMark(link);
    editor.view.dispatch(tr);
  }, [editor]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("URL", previousUrl);

    if (url === null) return;

    if (url.trim() === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      clearStoredLinkMark();
      return;
    }

    const href = url.trim();
    const { empty } = editor.state.selection;

    if (empty) {
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${href}">${href}</a>`)
        .insertContent(" ")
        .run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }

    // Cursor after link; do not keep linking newly typed text
    const end = editor.state.selection.to;
    editor.chain().focus().setTextSelection(end).unsetMark("link").run();
    clearStoredLinkMark();
  }, [editor, clearStoredLinkMark]);

  const isBoldActive = editor?.isActive("bold");
  const isItalicActive = editor?.isActive("italic");
  const isUnderlineActive = editor?.isActive("underline");
  const isStrikeActive = editor?.isActive("strike");
  const isCodeActive = editor?.isActive("code");
  const isHeading1Active = editor?.isActive("heading", { level: 1 });
  const isHeading2Active = editor?.isActive("heading", { level: 2 });
  const isHeading3Active = editor?.isActive("heading", { level: 3 });
  const isBulletListActive = editor?.isActive("bulletList");
  const isOrderedListActive = editor?.isActive("orderedList");
  const isBlockquoteActive = editor?.isActive("blockquote");
  const isAlignLeftActive = editor?.isActive({ textAlign: "left" });
  const isAlignCenterActive = editor?.isActive({ textAlign: "center" });
  const isAlignRightActive = editor?.isActive({ textAlign: "right" });
  const isAlignJustifyActive = editor?.isActive({ textAlign: "justify" });
  const isHighlightActive = editor?.isActive("highlight");

  const ToolbarButton = ({ onClick, isActive, children, title }: any) => (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={readOnly}
      className={`p-1.5 rounded transition-colors ${
        isActive
          ? "bg-[color:var(--dash-accent,#111111)]/10 text-[color:var(--dash-accent,#111111)] dark:bg-[color:var(--dash-accent,#111111)]/20"
          : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex flex-col gap-1 w-full">
      <style>{`
        .ProseMirror {
          min-height: 150px;
        }
        .ProseMirror:focus {
          outline: none;
        }
        .ProseMirror ul {
          list-style-type: disc;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.25rem;
        }
        .ProseMirror ol {
          list-style-type: decimal;
          margin-top: 0.5rem;
          margin-bottom: 0.5rem;
          padding-left: 1.25rem;
        }
        .ProseMirror p {
          margin-top: 0.25rem;
          margin-bottom: 0.25rem;
        }
        .ProseMirror blockquote {
          border-left: 3px solid var(--dash-accent, #111111);
          margin: 0.5rem 0;
          padding: 0.25rem 0.75rem;
          background: rgba(0, 0, 0, 0.03);
          border-radius: 0 4px 4px 0;
        }
        .dark .ProseMirror blockquote {
          background: rgba(255, 255, 255, 0.04);
        }
        .ProseMirror hr {
          border: none;
          border-top: 1px solid #cbd5e1;
          margin: 0.75rem 0;
        }
        .ProseMirror code {
          background-color: rgba(0, 0, 0, 0.06);
          padding: 0.15rem 0.35rem;
          border-radius: 4px;
          font-family: monospace;
          font-size: 0.85em;
        }
        .dark .ProseMirror code {
          background-color: rgba(255, 255, 255, 0.1);
        }
      `}</style>

      {label && (
        <div className="mb-0.5">
          {label}
        </div>
      )}

      <div
        className={`
          flex flex-col
          rounded-xl
          w-full
          transition
          ${chrome === "plain"
            ? "border-none bg-transparent"
            : readOnly
            ? "border-none bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
            : `bg-white dark:bg-slate-950 border ${
                errors
                  ? "border-red-500"
                  : "border-slate-200 dark:border-slate-700"
              } focus-within:border-[color:var(--dash-accent,#111111)] focus-within:ring-2 focus-within:ring-[color:var(--dash-accent,#111111)]/20`
          }
        `}
      >
        {editor && !readOnly && toolbarPlacement === "top" ? (
          <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 rounded-t-xl">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={isBoldActive} title="Bold">
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={isItalicActive} title="Italic">
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={isUnderlineActive} title="Underline">
              <UnderlineIcon size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={isStrikeActive} title="Strikethrough">
              <Strikethrough size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} isActive={isCodeActive} title="Code">
              <Code size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={isHighlightActive} title="Highlight / Color">
              <Highlighter size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={isHeading1Active} title="Heading 1">
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={isHeading2Active} title="Heading 2">
              <Heading2 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={isHeading3Active} title="Heading 3">
              <Heading3 size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={isBulletListActive} title="Bullet List">
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={isOrderedListActive} title="Ordered List">
              <ListOrdered size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={isBlockquoteActive} title="Blockquote">
              <Quote size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Line">
              <Minus size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo">
              <Undo2 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo">
              <Redo2 size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={isAlignLeftActive} title="Align Left">
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={isAlignCenterActive} title="Align Center">
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={isAlignRightActive} title="Align Right">
              <AlignRight size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} isActive={isAlignJustifyActive} title="Align Justify">
              <AlignJustify size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton
              onClick={setLink}
              isActive={editor?.isActive("link")}
              title="Add or edit link"
            >
              <LinkIcon size={16} />
            </ToolbarButton>
            {editor?.isActive("link") && (
              <ToolbarButton
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  clearStoredLinkMark();
                }}
                title="Remove link"
              >
                <Unlink size={16} />
              </ToolbarButton>
            )}
          </div>
        ) : null}
        <div className="p-1">
          <EditorContent editor={editor} />
        </div>
        {between}
        {editor && !readOnly && toolbarPlacement === "bottom" ? (
          <div className="flex flex-wrap items-center gap-1 border-t border-gray-200 p-2 dark:border-slate-700">
            <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={isBoldActive} title="Bold">
              <Bold size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={isItalicActive} title="Italic">
              <Italic size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={isUnderlineActive} title="Underline">
              <UnderlineIcon size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={isStrikeActive} title="Strikethrough">
              <Strikethrough size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={isHeading1Active} title="Heading 1">
              <Heading1 size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={isHeading2Active} title="Heading 2">
              <Heading2 size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={isBulletListActive} title="Bullet List">
              <List size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={isOrderedListActive} title="Ordered List">
              <ListOrdered size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} isActive={isAlignLeftActive} title="Align Left">
              <AlignLeft size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} isActive={isAlignCenterActive} title="Align Center">
              <AlignCenter size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} isActive={isAlignRightActive} title="Align Right">
              <AlignRight size={16} />
            </ToolbarButton>
            <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} isActive={isAlignJustifyActive} title="Align Justify">
              <AlignJustify size={16} />
            </ToolbarButton>

            <div className="w-px h-5 bg-gray-300 dark:bg-slate-700 mx-1" />

            <ToolbarButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={isHighlightActive} title="Highlight">
              <Highlighter size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={setLink}
              isActive={editor?.isActive("link")}
              title="Add or edit link"
            >
              <LinkIcon size={16} />
            </ToolbarButton>
            {editor?.isActive("link") && (
              <ToolbarButton
                onClick={() => {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                  clearStoredLinkMark();
                }}
                title="Remove link"
              >
                <Unlink size={16} />
              </ToolbarButton>
            )}
          </div>
        ) : null}
      </div>

      {errors && (
        <span className="text-red-500 text-xs mt-1">
          {errors.message}
        </span>
      )}
    </div>
  );
};

export default RichTextEditor;
