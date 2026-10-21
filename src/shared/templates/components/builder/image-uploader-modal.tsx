"use client";

import React, { useState, useRef, useId, useCallback, useMemo } from "react";
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, X, AlertCircle, Variable, Search, Check } from "lucide-react";
import { AppModal, AppButton, AppTabs, type AppTabItem } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import type { VariableItem } from "../../api/template-variables.api";

interface ImageUploaderModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string, alt?: string, file?: File) => void;
  /** Optional list of template variables to pick from for variable-based image insertion */
  variables?: VariableItem[];
}

const TABS: AppTabItem[] = [
  {
    id: "upload",
    label: (
      <span className="flex items-center gap-1.5">
        <UploadCloud className="size-4" />
        <span>Upload File</span>
      </span>
    ),
  },
  {
    id: "variable",
    label: (
      <span className="flex items-center gap-1.5">
        <Variable className="size-4" />
        <span>Variable</span>
      </span>
    ),
  },
];

export function ImageUploaderModal({
  open,
  onClose,
  onInsert,
  variables = [],
}: ImageUploaderModalProps) {
  const [activeTab, setActiveTab] = useState<string>("upload");
  const [altText, setAltText] = useState("");

  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Variable tab state
  const [varSearch, setVarSearch] = useState("");
  const [selectedVarKey, setSelectedVarKey] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState("");

  const fileInputId = useId();

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setFileDataUrl(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
    setAltText("");
    setIsDragging(false);
    setVarSearch("");
    setSelectedVarKey(null);
    setCustomKey("");
  }, []);

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFile = (file: File) => {
    setFileError(null);
    if (!file.type.startsWith("image/")) {
      setFileError("Please select a valid image file (PNG, JPG, SVG, WebP, GIF).");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setFileError("File is too large. Maximum size is 10MB.");
      return;
    }
    setSelectedFile(file);
    setFileName(file.name);
    setFileSize(
      file.size < 1024 * 1024
        ? `${Math.round(file.size / 1024)} KB`
        : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    );
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setFileDataUrl(reader.result);
    };
    reader.onerror = () => setFileError("Failed to read image file.");
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileDataUrl(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
  };

  const allAvailableVars = useMemo(() => {
    if (variables && variables.length > 0) return variables;
    return [
      { key: "company.logo", label: "Company Logo", tag: "<company.logo>", category: "Company", categoryLabel: "Company", parentModule: "company" },
      { key: "site.photo", label: "Site Photo", tag: "<site.photo>", category: "Site", categoryLabel: "Site", parentModule: "sites" },
      { key: "user.signature", label: "User Signature", tag: "<user.signature>", category: "User", categoryLabel: "User", parentModule: "users" },
      { key: "quotation.header_image", label: "Header Image", tag: "<quotation.header_image>", category: "Quotation", categoryLabel: "Quotation", parentModule: "quotations" },
      { key: "project.thumbnail", label: "Project Thumbnail", tag: "<project.thumbnail>", category: "Project", categoryLabel: "Project", parentModule: "projects" },
      { key: "location.drawing_thumbnail", label: "Drawing Thumbnail", tag: "<location.drawing_thumbnail>", category: "Location", categoryLabel: "Location", parentModule: "locations" },
    ] as VariableItem[];
  }, [variables]);

  // Filtered variables for search
  const filteredVars = useMemo(() => {
    const q = varSearch.trim().toLowerCase();
    if (!q) return allAvailableVars;
    return allAvailableVars.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.key.toLowerCase().includes(q) ||
        v.categoryLabel?.toLowerCase().includes(q),
    );
  }, [allAvailableVars, varSearch]);

  // Group by category for display
  const groupedVars = useMemo(() => {
    const map = new Map<string, VariableItem[]>();
    for (const v of filteredVars) {
      const cat = v.categoryLabel || v.category || "General";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(v);
    }
    return Array.from(map.entries());
  }, [filteredVars]);

  const effectiveVarKey = (customKey.trim() || selectedVarKey || "").replace(/^[<]|>$|^&lt;|&gt;$/g, "").trim();

  const canInsert =
    activeTab === "upload"
      ? Boolean(fileDataUrl)
      : activeTab === "variable"
        ? Boolean(effectiveVarKey)
        : false;

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canInsert) return;

    if (activeTab === "upload" && fileDataUrl) {
      onInsert(fileDataUrl, altText.trim() || fileName || undefined, selectedFile || undefined);
    } else if (activeTab === "variable" && effectiveVarKey) {
      // Dynamic image placeholder: <!--Image key="key" -->
      onInsert(`<!--Image key="${effectiveVarKey}" -->`, altText.trim() || effectiveVarKey);
    }
    handleClose();
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Insert Image"
      description={
        activeTab === "variable"
          ? "Select a variable — it will be rendered as an image when the template is generated."
          : "Upload an image file from your device."
      }
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <AppButton variant="secondary" size="sm" onClick={handleClose}>
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!canInsert}
          >
            Insert Image
          </AppButton>
        </div>
      }
    >
      <div className="space-y-4 pt-1">
        {/* Tabs */}
        <AppTabs
          tabs={TABS}
          value={activeTab}
          onValueChange={(v) => { setActiveTab(v); setSelectedVarKey(null); setVarSearch(""); }}
          ariaLabel="Image source tabs"
          panelIdPrefix="image-modal-tab"
        />

        {/* Tab 1: Upload */}
        {activeTab === "upload" && (
          <div className="space-y-3">
            <input
              ref={fileInputRef}
              type="file"
              id={fileInputId}
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif,image/svg+xml"
              onChange={handleFileInputChange}
              className="sr-only"
            />

            {!fileDataUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer",
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:border-blue-400 dark:bg-blue-950/20"
                    : "border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:border-slate-600",
                )}
              >
                <div className="flex size-11 items-center justify-center rounded-full bg-white shadow-xs dark:bg-slate-800">
                  <UploadCloud className="size-5 text-slate-600 dark:text-slate-300" />
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">Click to upload</span>{" "}
                  <span className="text-slate-500 dark:text-slate-400">or drag and drop</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  PNG, JPG, WebP, GIF, or SVG (max 10MB)
                </p>
              </div>
            ) : (
              <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/60">
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  title="Remove image"
                  className="absolute right-2 top-2 z-10 flex size-6 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition"
                >
                  <X className="size-3.5" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={fileDataUrl} alt="Preview" className="size-full object-contain" />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{fileName}</p>
                    <p className="text-[11px] text-slate-400">{fileSize}</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                    >
                      Choose another file
                    </button>
                  </div>
                </div>
              </div>
            )}

            {fileError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>{fileError}</span>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Variable Image */}
        {activeTab === "variable" && (
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={varSearch}
                onChange={(e) => setVarSearch(e.target.value)}
                placeholder="Search variables…"
                className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Variable list */}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/60 divide-y divide-slate-100 dark:divide-slate-800">
              {variables.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Variable className="size-8 text-slate-300 dark:text-slate-600" />
                  <p className="text-xs text-slate-400 dark:text-slate-500">No variables available</p>
                </div>
              ) : filteredVars.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No variables match &quot;{varSearch}&quot;
                </div>
              ) : (
                groupedVars.map(([cat, items]) => (
                  <div key={cat}>
                    <div className="sticky top-0 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                      {cat}
                    </div>
                    {items.map((v) => {
                      const isSelected = selectedVarKey === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setSelectedVarKey(isSelected ? null : v.key)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors",
                            isSelected
                              ? "bg-blue-50 dark:bg-blue-950/30"
                              : "hover:bg-slate-50 dark:hover:bg-slate-800/50",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={cn(
                              "text-xs font-semibold truncate",
                              isSelected ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-200",
                            )}>
                              {v.label}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate mt-0.5">
                              {`{{${v.key}}}`}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Custom Key Input */}
            <div className="pt-1">
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-400 mb-1">
                Or enter custom variable key:
              </label>
              <input
                type="text"
                value={customKey}
                onChange={(e) => {
                  setCustomKey(e.target.value);
                  if (e.target.value) setSelectedVarKey(null);
                }}
                placeholder="e.g. project.site_photo, drawing_snapshot"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {/* Preview of what will be inserted */}
            {effectiveVarKey && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900/50 dark:bg-blue-950/20 px-3 py-2.5">
                <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium mb-0.5">Will insert dynamic image:</p>
                <code className="text-xs font-mono font-semibold text-blue-800 dark:text-blue-300 break-all">
                  {`<!--Image key="${effectiveVarKey}" -->`}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Optional Alt text (upload tab only) */}
        {activeTab === "upload" && (
          <div>
            <label
              htmlFor="image-alt-input"
              className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
            >
              Alt Text / Caption{" "}
              <span className="text-[10px] text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              id="image-alt-input"
              type="text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Brief description of the image"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
            />
          </div>
        )}
      </div>
    </AppModal>
  );
}
