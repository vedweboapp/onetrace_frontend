"use client";

import React, { useState } from "react";
import { AppModal, AppButton } from "@/shared/ui";
import { PanelTop, Copy } from "lucide-react";
import { cn } from "@/core/utils/http.util";
import type { DocumentHeaderAttributes } from "./document-header-extension";

interface HeaderModalProps {
  open: boolean;
  onClose: () => void;
  onInsertHeader: (attrs: DocumentHeaderAttributes, atTop?: boolean) => void;
}

export function HeaderModal({ open, onClose, onInsertHeader }: HeaderModalProps) {
  const [copyToWhole, setCopyToWhole] = useState(false);
  const [insertAtTop, setInsertAtTop] = useState(true);

  const handleConfirm = () => {
    onInsertHeader({ copyToWhole }, insertAtTop);
    onClose();
  };

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title="Insert Header"
      size="sm"
      className="max-w-[360px] w-full"
      footer={
        <div className="flex items-center justify-end gap-2 w-full">
          <AppButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </AppButton>
          <AppButton variant="primary" size="sm" onClick={handleConfirm} className="gap-1.5">
            <PanelTop className="size-3.5" />
            <span>Insert</span>
          </AppButton>
        </div>
      }
    >
      <div className="space-y-4">

        {/* Copy to whole document */}
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-xl border cursor-pointer transition",
            copyToWhole
              ? "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 dark:border-emerald-700"
              : "border-slate-200 dark:border-slate-700 hover:border-slate-300",
          )}
          onClick={() => setCopyToWhole((v) => !v)}
        >
          <div className="flex items-center gap-2.5">
            <Copy
              size={16}
              className={copyToWhole ? "text-emerald-600" : "text-slate-400"}
            />
            <div>
              <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                Copy to whole document
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Repeat on every page when rendered
              </div>
            </div>
          </div>
          {/* Toggle */}
          <div className={cn("relative w-10 h-5 rounded-full transition-colors shrink-0", copyToWhole ? "bg-emerald-500" : "bg-slate-300 dark:bg-slate-600")}>
            <div className={cn("absolute top-0.5 size-4 bg-white rounded-full shadow-sm transition-transform", copyToWhole ? "translate-x-5" : "translate-x-0.5")} />
          </div>
        </div>

        {/* Placement */}
        <div className="flex items-center gap-5 text-sm text-slate-700 dark:text-slate-300">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Place at:</span>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="hdr-placement" checked={insertAtTop} onChange={() => setInsertAtTop(true)} className="accent-blue-600" />
            Top of document
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="radio" name="hdr-placement" checked={!insertAtTop} onChange={() => setInsertAtTop(false)} className="accent-blue-600" />
            Cursor position
          </label>
        </div>

      </div>
    </AppModal>
  );
}
