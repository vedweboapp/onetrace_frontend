"use client";

import React, { useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Trash2, Copy } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export function DocumentHeaderNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const copyToWhole = node.attrs.copyToWhole || false;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <NodeViewWrapper
      as="header"
      className="document-header-block relative group"
      style={{
        display: "block",
        width: "100%",
        paddingBottom: "2px",
        marginBottom: "10px",
        borderBottom: "1px solid #cbd5e1",
        boxSizing: "border-box",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tiny toolbar — top-right corner, shows on hover */}
      <div
        contentEditable={false}
        className={cn(
          "absolute top-0 right-0 z-20 flex items-center gap-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded shadow-sm px-1.5 py-0.5 transition-opacity duration-150 select-none",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        onMouseDown={(e) => e.preventDefault()}
      >
        {/* Copy to whole doc toggle */}
        <button
          type="button"
          onClick={() => updateAttributes({ copyToWhole: !copyToWhole })}
          title={copyToWhole ? "Remove from whole document" : "Copy to whole document"}
          className={cn(
            "flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition cursor-pointer",
            copyToWhole
              ? "bg-emerald-600 text-white"
              : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700",
          )}
        >
          <Copy size={10} />
          <span>Whole doc</span>
        </button>

        <div className="w-px h-3 bg-slate-200 dark:bg-slate-600" />

        {/* Delete */}
        <button
          type="button"
          onClick={deleteNode}
          title="Remove header"
          className="p-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
        >
          <Trash2 size={11} />
        </button>
      </div>

      {/* The actual editable content — users type freely here */}
      <NodeViewContent />
    </NodeViewWrapper>
  );
}
