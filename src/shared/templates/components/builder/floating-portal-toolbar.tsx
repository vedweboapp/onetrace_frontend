"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

interface FloatingPortalToolbarProps {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  children: React.ReactNode;
  offsetY?: number;
}

/**
 * Renders a floating toolbar via React Portal directly into document.body.
 * This completely escapes:
 *  - ProseMirror widget boundaries (.rm-page-header, .rm-first-page-header)
 *  - Pagination margins & overflow:hidden / overflow:clip on parent elements
 *  - Table cell stacking contexts and overflow boundaries
 */
export function FloatingPortalToolbar({
  anchorRef,
  open,
  children,
  offsetY = 8,
}: FloatingPortalToolbarProps) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (!open || !anchorRef.current) {
      setCoords(null);
      return;
    }

    // Check if any modal or dialog is currently open on screen
    if (document.querySelector(".app-modal") || document.querySelector("[role='dialog']")) {
      setCoords(null);
      return;
    }

    const anchorRect = anchorRef.current.getBoundingClientRect();
    const toolbar = toolbarRef.current;
    const toolbarHeight = toolbar ? toolbar.offsetHeight : 36;
    const toolbarWidth = toolbar ? toolbar.offsetWidth : 240;

    // Check headroom above the anchor element
    const hasHeadroom = anchorRect.top >= toolbarHeight + offsetY + 60; // 60px accounts for top app bar

    let top: number;
    if (hasHeadroom) {
      top = anchorRect.top - toolbarHeight - offsetY;
    } else {
      top = anchorRect.bottom + offsetY;
    }

    // Align toolbar with left of anchor, clamp within viewport
    let left = anchorRect.left;
    if (left + toolbarWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - toolbarWidth - 12);
    }
    left = Math.max(12, left);

    setCoords({ top, left });
  }, [anchorRef, open, offsetY]);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    // Listen to scrolling inside editor container and window
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    // Watch for modals mounting or unmounting in document.body
    const observer = new MutationObserver(() => {
      updatePosition();
    });
    if (typeof document !== "undefined" && document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      observer.disconnect();
    };
  }, [open, updatePosition]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        top: coords ? coords.top : -9999,
        left: coords ? coords.left : -9999,
        zIndex: 500,
        opacity: coords ? 1 : 0,
        pointerEvents: coords ? "auto" : "none",
      }}
      className="transition-opacity duration-75"
      onMouseDown={(e) => {
        // Prevent ProseMirror editor from stealing focus or closing toolbar
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
