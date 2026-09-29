"use client";

import React, { ChangeEvent, useMemo, useRef, useState } from "react";
import { ImagePlus, Upload, X, Images } from "lucide-react";
import { cn } from "@/core/utils/http.util";

export type ImageItem = File | Blob | string;

export type MultiImageUploadFieldProps = {
  value?: (ImageItem | null | undefined)[] | ImageItem | null;
  onChange?: (images: ImageItem[]) => void;
  allowedTypes?: string[];
  maxFileSize?: number; // in MB
  maxFiles?: number;
  readOnly?: boolean;
  disabled?: boolean;
  className?: string;
  label?: React.ReactNode;
};

export function MultiImageUploadField({
  value,
  onChange,
  allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  maxFileSize = 5,
  maxFiles = 10,
  readOnly = false,
  disabled = false,
  className,
  label,
}: MultiImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Normalize incoming value into an array of ImageItem
  const imagesList = useMemo<ImageItem[]>(() => {
    if (!value) return [];
    if (Array.isArray(value)) {
      return value.filter(
        (item): item is ImageItem =>
          item !== null && item !== undefined && item !== ""
      );
    }
    return [value as ImageItem];
  }, [value]);

  const isLocked = readOnly || disabled;

  // Convert File/Blob or string URLs into previewable object URLs
  const previews = useMemo(() => {
    return imagesList.map((item) => {
      if (typeof item === "string") {
        return { item, url: item };
      }
      if (item instanceof Blob) {
        return { item, url: URL.createObjectURL(item) };
      }
      return { item, url: "" };
    });
  }, [imagesList]);

  function openFilePicker() {
    if (isLocked) return;
    if (imagesList.length >= maxFiles) {
      setError(`Maximum limit of ${maxFiles} images reached.`);
      return;
    }
    setError(null);
    inputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setError(null);
    const validFiles: File[] = [];

    const remainingSlots = maxFiles - imagesList.length;
    const filesToProcess = files.slice(0, remainingSlots);

    if (files.length > remainingSlots) {
      setError(`Only ${maxFiles} images are allowed in total.`);
    }

    for (const file of filesToProcess) {
      if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        setError(`Invalid file type: ${file.name}`);
        continue;
      }
      if (maxFileSize && file.size > maxFileSize * 1024 * 1024) {
        setError(`File ${file.name} exceeds maximum size of ${maxFileSize}MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      const nextList = [...imagesList, ...validFiles];
      onChange?.(nextList);
    }

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function handleRemove(index: number, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isLocked) return;

    const nextList = imagesList.filter((_, i) => i !== index);
    onChange?.(nextList);
    setError(null);
  }

  return (
    <div className={cn("w-full flex flex-col gap-2", className)}>
      {label ? <div>{label}</div> : null}

      <div className="flex flex-wrap items-center gap-3">
        {/* Previews Grid */}
        {previews.map(({ item, url }, index) => (
          <div
            key={`${url}-${index}`}
            className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          >
            {url ? (
              <img
                src={url}
                alt={`Image preview ${index + 1}`}
                className="h-full w-full object-cover p-1 rounded-md"
              />
            ) : (
              <Images className="size-6 text-slate-400" />
            )}

            {!isLocked ? (
              <button
                type="button"
                onClick={(e) => handleRemove(index, e)}
                className="absolute right-1 top-1 z-10 inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-600 shadow-sm transition hover:bg-red-50 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-300 dark:hover:bg-red-950 dark:hover:text-red-400"
                aria-label="Remove image"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        ))}

        {/* Upload Button Box */}
        {!isLocked && imagesList.length < maxFiles ? (
          <button
            type="button"
            onClick={openFilePicker}
            className={cn(
              "group flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-left transition",
              "border-slate-300 bg-slate-50 hover:border-[color:var(--dash-accent,#111111)] hover:bg-slate-100/80 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:bg-slate-900"
            )}
            aria-label="Upload multiple images"
          >
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
              <ImagePlus className="size-4 text-[color:var(--dash-accent,#111111)] dark:text-slate-200" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Add Images</span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {imagesList.length}/{maxFiles}
            </span>
          </button>
        ) : null}
      </div>

      {error ? (
        <span className="text-xs font-medium text-red-500">{error}</span>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={allowedTypes.join(",")}
        className="hidden"
        onChange={handleFileChange}
        disabled={isLocked}
      />
    </div>
  );
}

export default MultiImageUploadField;
