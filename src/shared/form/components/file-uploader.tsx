// components/form/FileUploader.tsx

import React, { useEffect, useState, useRef } from "react";
import {
    Controller,
    Control,
    FieldValues,
    RegisterOptions,
} from "react-hook-form";
import { X, File, Image as ImageIcon, ChevronDown } from "lucide-react";

interface FileUploaderProps {
    control: Control<FieldValues>;
    name: string;
    label?: string;
    rules?: RegisterOptions;
    className?: string;
    accept?: string;
    maxSize?: number;
    onFileSelect?: (file: {
        name: string;
        type: string;
        size: number;
        rawFile: File;
    }) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({
    control,
    name,
    label,
    rules = {},
    className = "",
    accept = "image/jpeg,image/png,image/webp,.pdf,.doc,.docx",
    maxSize = 1073741824, // 1GB
    onFileSelect,
}) => {
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

            setPreview(base64String);

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
                        if (!preview) {
                            setPreview(value);

                            if (value.startsWith("data:")) {
                                setFileName(fileName || "Attached File");

                                const type = value
                                    .split(";")[0]
                                    .split(":")[1];

                                setFileType(type);
                            } else {
                                const nameFromUrl = value.split("/").pop();

                                setFileName(
                                    nameFromUrl || "Uploaded File"
                                );
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

                        <div className="w-full relative">
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
                                    hover:border-blue-500 hover:shadow-sm
                                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
                                    ${(error || fieldError)
                                        ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                                        : "border-gray-300 dark:border-slate-700"
                                    }
                                `}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {fileName ? (
                                        <>
                                            {isImageFile(fileType) && preview ? (
                                                <div className="w-6 h-6 rounded border border-gray-200 dark:border-slate-700 overflow-hidden bg-gray-50 flex-shrink-0">
                                                    <img src={preview} alt="" className="w-full h-full object-cover" />
                                                </div>
                                            ) : isImageFile(fileType) ? (
                                                <ImageIcon size={16} className="text-blue-500 flex-shrink-0" />
                                            ) : (
                                                <File size={16} className="text-red-500 flex-shrink-0" />
                                            )}
                                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate flex-1">
                                                {fileName}
                                                {fileSize && (
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

                            <input
                                id={name}
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept={accept}
                                onChange={(e) =>
                                    handleFileChange(e, onChange)
                                }
                            />
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