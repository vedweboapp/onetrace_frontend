// components/form/FileUploader.tsx

import React, { useEffect, useState, useRef } from "react";
import {
    Controller,
    Control,
    FieldValues,
    RegisterOptions,
} from "react-hook-form";
import { X, File, ChevronDown } from "lucide-react";
import { surfaceInputClassName } from "@/shared/ui";

interface FileUploaderProps {
    control: Control<FieldValues>;
    name: string;
    label?: string;
    rules?: RegisterOptions;
    className?: string;
    accept?: string;
    allowedTypes?: string;
    maxFileSize?: number;
    maxSize?: number;
    properties?: Record<string, any>;
    onFileSelect?: (file: {
        name: string;
        type: string;
        size: number;
        rawFile: File;
    }) => void;
}

const resolveAcceptTypes = (props: FileUploaderProps): string => {
    const allowed =
        props.allowedTypes ??
        props.properties?.allowedTypes ??
        props.properties?.validation_rules?.allowedTypes ??
        props.properties?.validation_rules?.allowed_types;

    if (!allowed || allowed === "*") return "*";
    return String(allowed);
};

const resolveMaxSizeBytes = (props: FileUploaderProps): number => {
    if (props.maxSize != null) return props.maxSize;

    const mbRaw =
        props.maxFileSize ??
        props.properties?.maxFileSize ??
        props.properties?.validation_rules?.maxFileSize ??
        props.properties?.validation_rules?.max_file_size;

    if (mbRaw == null || mbRaw === "") return 1073741824;
    const mb = Number(mbRaw);
    return isNaN(mb) || mb <= 0 ? 1073741824 : mb * 1024 * 1024;
};

const fileMatchesAccept = (file: File, accept: string): boolean => {
    if (!accept || accept === "*") return true;

    const patterns = accept.split(",").map((p) => p.trim()).filter(Boolean);

    return patterns.some((pattern) => {
        if (pattern === "*") return true;
        if (pattern.endsWith("/*")) {
            const prefix = pattern.slice(0, -1);
            return file.type.startsWith(prefix);
        }
        if (pattern.startsWith(".")) {
            return file.name.toLowerCase().endsWith(pattern.toLowerCase());
        }
        return file.type === pattern;
    });
};

const formatAcceptLabel = (accept: string): string => {
    if (accept === "*") return "all file types";
    if (accept === "image/*") return "images";
    if (accept.includes("pdf")) return "PDF files";
    return "the allowed file types";
};

const FileUploader: React.FC<FileUploaderProps> = (props) => {
    const {
        control,
        name,
        label,
        rules = {},
        className = "",
        accept: acceptProp,
        onFileSelect,
    } = props;

    const accept = acceptProp ?? resolveAcceptTypes(props);
    const maxSize = resolveMaxSizeBytes(props);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileType, setFileType] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isImageFile = (type?: string | null): boolean =>
        !!type?.startsWith("image/");

    const handleFileChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        onChange: (value: string | null) => void
    ) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setError(null);

        if (file.size > maxSize) {
            setError(
                `File size must be less than ${maxSize / 1024 / 1024
                }MB`
            );

            return;
        }

        if (file.type === "image/gif") {
            setError("GIF files are not allowed");

            return;
        }

        if (!fileMatchesAccept(file, accept)) {
            setError(`Please select ${formatAcceptLabel(accept)} only`);

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }

            return;
        }

        setFileName(file.name);
        setFileType(file.type);
        setFileSize(file.size);

        if (onFileSelect) {
            onFileSelect({
                name: file.name,
                type: file.type,
                size: file.size,
                rawFile: file,
            });
        }

        const reader = new FileReader();

        reader.onloadend = () => {
            const base64String = reader.result as string;

            setPreview(isImageFile(file.type) ? base64String : null);

            onChange(base64String);
        };

        reader.readAsDataURL(file);
    };

    const handleRemove = (
        onChange: (value: string | null) => void
    ) => {
        setPreview(null);
        setFileName(null);
        setFileType(null);
        setFileSize(null);
        setError(null);

        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }

        onChange(null);
    };

    return (
        <Controller
            name={name}
            control={control}
            rules={rules}
            render={({
                field: { onChange, value },
                fieldState: { error: fieldError },
            }) => {
                useEffect(() => {
                    if (value && typeof value === "string") {
                        if (!fileName) {
                            if (value.startsWith("data:")) {
                                const type = value
                                    .split(";")[0]
                                    .split(":")[1];

                                setFileType(type);
                                setFileName("Attached File");
                                setPreview(isImageFile(type) ? value : null);
                            } else {
                                const nameFromUrl = value.split("/").pop();

                                setFileName(
                                    nameFromUrl || "Uploaded File"
                                );
                                setPreview(null);
                            }
                        }
                    } else if (!value) {
                        setPreview(null);
                        setFileName(null);
                        setFileType(null);
                        setFileSize(null);
                        setError(null);
                    }
                }, [value]);

                const handleContainerClick = () => {
                    fileInputRef.current?.click();
                };

                return (
                    <div
                        className={`flex flex-col gap-1 w-full ${className}`}
                    >
                        {label && (
                            <label
                                htmlFor={name}
                                className="text-sm font-medium text-mutedtext"
                            >
                                {label}
                            </label>
                        )}

                        <div className="w-full relative space-y-2">
                            {isImageFile(fileType) && preview ? (
                                <div className="relative rounded-[8px] border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 overflow-hidden">
                                    <img
                                        src={preview}
                                        alt={fileName || "Preview"}
                                        className="w-full max-h-40 object-contain"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(onChange)}
                                        className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-slate-900/90 text-gray-500 hover:text-red-500 rounded-full shadow-sm border border-gray-200 dark:border-slate-600 transition-colors"
                                        title="Remove file"
                                    >
                                        <X size={16} />
                                    </button>
                                    {fileName && (
                                        <div className="px-3 py-2 border-t border-gray-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 truncate">
                                            {fileName}
                                            {fileSize != null && (
                                                <span className="text-xs text-gray-400 dark:text-slate-500 ml-1.5">
                                                    ({(fileSize / 1024).toFixed(1)} KB)
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={handleContainerClick}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            handleContainerClick();
                                        }
                                    }}
                                    className={`
                                    flex items-center justify-between w-full h-[42px] px-3 
                                    bg-white dark:bg-slate-900 border rounded-[8px] 
                                    text-left cursor-pointer transition-all duration-200 outline-none
                                     hover:shadow-sm
                                     hover:border-[color:var(--dash-accent,#111111)] 
                                    ${(error || fieldError)
                                            ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                            : "border-gray-300 dark:border-slate-700"
                                        }
                                `}
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        {fileName ? (
                                            <>
                                                <File size={16} className="text-red-500 flex-shrink-0" />
                                                <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                                                    {fileName}
                                                    {fileSize != null && (
                                                        <span className="text-xs text-gray-400 dark:text-slate-500 font-normal ml-1.5">
                                                            ({(fileSize / 1024).toFixed(1)} KB)
                                                        </span>
                                                    )}
                                                </span>
                                            </>
                                        ) : (
                                            <span className="text-sm text-gray-400 dark:text-slate-500">
                                                Choose file
                                            </span>
                                        )}
                                    </div>

                                    <div
                                        className="flex items-center gap-1.5 flex-shrink-0 ml-2"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {fileName ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemove(onChange);
                                                }}
                                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-full transition-colors cursor-pointer"
                                                title="Remove file"
                                            >
                                                <X size={16} />
                                            </button>
                                        ) : (
                                            <ChevronDown size={16} className="text-gray-400 dark:text-slate-500" />
                                        )}
                                    </div>
                                </div>
                            )}

                            <input
                                id={name}
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept={accept === "*" ? undefined : accept}
                                onChange={(e) =>
                                    handleFileChange(e, onChange)
                                }
                            />

                            {isImageFile(fileType) && preview && (
                                <button
                                    type="button"
                                    onClick={handleContainerClick}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    Replace image
                                </button>
                            )}
                        </div>

                        {error && (
                            <span className="text-red-500 text-xs font-medium mt-1">
                                {error}
                            </span>
                        )}

                        {fieldError && (
                            <span className="text-red-500 text-xs font-medium mt-1">
                                {fieldError.message}
                            </span>
                        )}
                    </div>
                );
            }}
        />
    );
};

export default FileUploader;