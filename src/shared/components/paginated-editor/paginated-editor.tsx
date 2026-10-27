"use client";

import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { PaginationPlus, PAGE_SIZES } from "tiptap-pagination-plus";
import "./paginated-editor.css";

/**
 * PaginatedEditor
 *
 * A Tiptap editor that automatically splits content into A4 pages.
 * Each page is rendered as a white "paper sheet" on a gray background.
 *
 * Printing / PDF export:
 *   - Click "Download PDF" → triggers window.print()
 *   - @page { size: A4; margin: 0 } ensures the OS print dialog maps each
 *     editor page to exactly one printed sheet.
 *
 * Known print limitations (inherent to window.print()):
 *   - Headers and footers defined in PaginationPlus options are NOT
 *     reproduced in the print output — the browser uses its own header/footer
 *     mechanism instead.
 *   - Printed margins may differ by ±1–2 mm across browsers/OSes.
 *   - Sub-pixel rounding can occasionally produce a thin extra blank page
 *     in Chrome if content fills a page exactly to its boundary. Workaround:
 *     leave a few pixels of bottom padding on your last page.
 */
export function PaginatedEditor() {
  const editor = useEditor({
    immediatelyRender: false, // required by Next.js to avoid hydration mismatch
    extensions: [
      StarterKit,
      PaginationPlus.configure({
        // ── Page dimensions (A4 at 96 dpi screen resolution) ──────────
        pageWidth: PAGE_SIZES.A4.pageWidth,   // 794 px
        pageHeight: PAGE_SIZES.A4.pageHeight, // 1123 px

        // ── Inner content margins (mirrors typical A4 document margins) ─
        marginTop: 72,    // ≈ 19 mm
        marginBottom: 72,
        marginLeft: 90,   // ≈ 24 mm
        marginRight: 90,

        // ── Gap between pages on screen (removed in print CSS) ────────
        pageGap: 24,
        pageGapBorderSize: 1,        // subtle border line between pages
        pageGapBorderColor: "#cbd5e1",
        pageBreakBackground: "#e2e8f0", // same as shell background
        footerRight: "Page {page}",
      }),
    ],
    content: "<p>Start typing here — when this page fills up, a new page will appear automatically.</p>",
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="paginated-editor-shell">
      {/* ── Top bar ─────────────────────────────────── */}
      <div className="paginated-editor-bar">
        <button
          type="button"
          className="paginated-editor-pdf-btn"
          onClick={handlePrint}
          aria-label="Download as PDF"
        >
          {/* Printer icon (inline SVG — no icon library dependency) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Download PDF
        </button>
      </div>

      {/* ── Editor ──────────────────────────────────── */}
      <EditorContent editor={editor} className="paginated-editor-content" />
    </div>
  );
}
