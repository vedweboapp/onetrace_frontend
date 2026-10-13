"use client";

import React, { useState, useRef, useId, useCallback } from "react";
import { UploadCloud, Link as LinkIcon, Image as ImageIcon, X, AlertCircle } from "lucide-react";
import { AppModal, AppButton, AppTabs, type AppTabItem } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";

interface ImageUploaderModalProps {
  open: boolean;
  onClose: () => void;
  onInsert: (url: string, alt?: string, file?: File) => void;
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
    id: "url",
    label: (
      <span className="flex items-center gap-1.5">
        <LinkIcon className="size-4" />
        <span>Image URL</span>
      </span>
    ),
  },
];

export function ImageUploaderModal({
  open,
  onClose,
  onInsert,
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

  // URL tab state
  const [imageUrl, setImageUrl] = useState("");
  const [urlError, setUrlError] = useState(false);

  const fileInputId = useId();

  const resetState = useCallback(() => {
    setSelectedFile(null);
    setFileDataUrl(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
    setImageUrl("");
    setAltText("");
    setUrlError(false);
    setIsDragging(false);
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
    // Limit to 10MB
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
      if (typeof reader.result === "string") {
        setFileDataUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setFileError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileDataUrl(null);
    setFileName(null);
    setFileSize(null);
    setFileError(null);
  };

  const canInsert =
    activeTab === "upload"
      ? Boolean(fileDataUrl)
      : Boolean(imageUrl.trim() && !urlError);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!canInsert) return;

    if (activeTab === "upload" && fileDataUrl) {
      onInsert(fileDataUrl, altText.trim() || fileName || undefined, selectedFile || undefined);
    } else if (activeTab === "url" && imageUrl.trim()) {
      onInsert(imageUrl.trim(), altText.trim() || undefined);
    }
    handleClose();
  };

  return (
    <AppModal
      open={open}
      onClose={handleClose}
      title="Insert Image"
      description="Upload an image file from your device or paste an image URL."
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
        {/* Tabs for Upload vs URL */}
        <AppTabs
          tabs={TABS}
          value={activeTab}
          onValueChange={setActiveTab}
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
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Click to upload
                  </span>{" "}
                  <span className="text-slate-500 dark:text-slate-400">
                    or drag and drop
                  </span>
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
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-750 dark:bg-slate-850">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={fileDataUrl}
                      alt="Preview"
                      className="size-full object-contain"
                    />
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <p className="font-medium text-slate-800 dark:text-slate-200 truncate">
                      {fileName}
                    </p>
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

        {/* Tab 2: URL */}
        {activeTab === "url" && (
          <div className="space-y-3">
            <div>
              <label
                htmlFor="image-url-input"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Image URL
              </label>
              <input
                id="image-url-input"
                type="url"
                value={imageUrl}
                onChange={(e) => {
                  setImageUrl(e.target.value);
                  setUrlError(false);
                }}
                placeholder="https://example.com/image.png"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 shadow-xs outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
            </div>

            {imageUrl.trim() && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-900/60">
                <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                  Preview:
                </div>
                <div className="relative flex max-h-40 items-center justify-center overflow-hidden rounded bg-white p-2 dark:bg-slate-850">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl.trim()}
                    alt="Preview"
                    onError={() => setUrlError(true)}
                    className="max-h-36 max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {urlError && (
              <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>Unable to load image from this URL. Please check the link.</span>
              </div>
            )}
          </div>
        )}

        {/* Optional Alt text for both tabs */}
        <div>
          <label
            htmlFor="image-alt-input"
            className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
          >
            Alt Text / Caption{" "}
            <span className="text-[10px] text-slate-400 font-normal">
              (optional)
            </span>
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
      </div>
    </AppModal>
  );
}
