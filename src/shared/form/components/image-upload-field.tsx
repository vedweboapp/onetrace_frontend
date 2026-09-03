"use client";

import React, { ChangeEvent, useMemo, useRef } from "react";
import { ImagePlus, Upload, X } from "lucide-react";
import { cn } from "@/core/utils/http.util";

type ImageValue = File | Blob | string | null | undefined;

type ImageUploadFieldProps = {
  image: ImageValue;
  setImage: (image: ImageValue) => void;
  allowedTypes?: string[];
  readOnly?: boolean;
  className?: string;
};

export function ImageUploadField({
  image,
  setImage,
  allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"],
  readOnly = false,
  className,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const previewUrl = useMemo(() => {
    if (!image) return "";
    if (typeof image === "string") return image;
    if (!(image instanceof Blob)) return "";
    return URL.createObjectURL(image);
  }, [image]);

  function openFilePicker() {
    if (readOnly) return;
    inputRef.current?.click();
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      alert("Invalid file type");
      return;
    }
    setImage(file);
    e.target.value = "";
  }

  function handleRemove(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setImage(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  if (readOnly && previewUrl) {
    return (
      <div
        className={cn(
          "inline-flex h-36 w-full max-w-[220px] items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/50",
          className,
        )}
      >
        <img src={previewUrl} alt="Uploaded image" className="max-h-full max-w-full object-contain" />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div
        className={cn(
          "flex h-36 w-full max-w-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-500",
          className,
        )}
      >
        No image
      </div>
    );
  }

  return (
    <div className={cn("image-upload-root relative w-full max-w-[220px]", className)}>
      <button
        type="button"
        onClick={openFilePicker}
        className={cn(
          "group relative flex h-36 w-full flex-col items-center justify-center overflow-hidden rounded-lg border text-left transition",
          previewUrl
            ? "border-slate-200 bg-white hover:border-[color:var(--dash-accent,#111111)] dark:border-slate-700 dark:bg-slate-900"
            : "border-dashed border-slate-300 bg-slate-50 hover:border-[color:var(--dash-accent,#111111)] hover:bg-slate-100/80 dark:border-slate-600 dark:bg-slate-900/50 dark:hover:bg-slate-900",
        )}
        aria-label={previewUrl ? "Change image" : "Upload image"}
      >
        {previewUrl ? (
          <>
            <img
              src={previewUrl}
              alt="Uploaded image preview"
              className="h-full w-full object-contain p-2"
            />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-900/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
              <Upload className="size-5" aria-hidden />
              <span className="text-xs font-semibold">Change image</span>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-slate-500 dark:text-slate-400">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-slate-800">
              <ImagePlus className="size-5 text-[color:var(--dash-accent,#111111)]" aria-hidden />
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Upload image</span>
            <span className="text-xs text-slate-400 dark:text-slate-500">Click to browse</span>
          </div>
        )}
      </button>

      {previewUrl ? (
        <button
          type="button"
          onClick={handleRemove}
          className="absolute right-1.5 top-1.5 z-10 inline-flex size-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          aria-label="Remove image"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={allowedTypes.join(",")}
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default ImageUploadField;
