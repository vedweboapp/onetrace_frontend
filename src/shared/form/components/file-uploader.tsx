// components/form/FileUploader.tsx

import React, { useEffect, useState } from "react";
import {
    Controller,
    Control,
    FieldValues,
    RegisterOptions,
} from "react-hook-form";
import { X, File, Image as ImageIcon } from "lucide-react";

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
                    if (
                        value &&
                        typeof value === "string" &&
                        !preview
                    ) {
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
                }, [value]);

                return (
                    <div
                        className={`flex flex-col gap-1 w-full ${className}`}
                    >
                        {label && (
                            <div className="text-[13px] font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                                {label}
                            </div>
                        )}

                        <div className="w-full">
                            {!fileName ? (
                                <label
                                    htmlFor={name}
                                    className="flex flex-col items-center justify-center w-full min-h-[120px] px-4 py-6 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 hover:border-primary/30 transition-all group"
                                >
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <svg
                                                className="w-6 h-6 text-gray-400 group-hover:text-primary transition-colors"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                />
                                            </svg>
                                        </div>

                                        <p className="mb-1 text-sm text-gray-600 font-medium">
                                            Click to upload attachment
                                        </p>

                                        <p className="text-[11px] text-gray-400">
                                            JPG, PNG, PDF, DOC
                                        </p>
                                    </div>

                                    <input
                                        id={name}
                                        type="file"
                                        className="hidden"
                                        accept={accept}
                                        onChange={(e) =>
                                            handleFileChange(e, onChange)
                                        }
                                    />
                                </label>
                            ) : (
                                <div className="w-full border border-gray-200 rounded-xl p-4 bg-white shadow-sm animate-in fade-in zoom-in duration-300">
                                    {isImageFile(fileType) && preview && (
                                        <div className="mb-4 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                className="max-h-48 w-full object-contain mx-auto transition-transform hover:scale-105 duration-500"
                                            />
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            {isImageFile(fileType) ? (
                                                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                    <ImageIcon
                                                        size={20}
                                                        className="text-blue-500"
                                                    />
                                                </div>
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                                                    <File
                                                        size={20}
                                                        className="text-red-500"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-800 truncate">
                                                    {fileName}
                                                </p>

                                                <p className="text-[11px] text-gray-400 uppercase font-bold tracking-tight">
                                                    {fileType?.split("/")[1] ||
                                                        "FILE"}{" "}
                                                    •{" "}
                                                    {fileSize
                                                        ? (
                                                            fileSize / 1024
                                                        ).toFixed(1)
                                                        : "0"}{" "}
                                                    KB
                                                </p>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleRemove(onChange)
                                            }
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                                        >
                                            <X size={18} />
                                        </button>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                                        <label
                                            htmlFor={name}
                                            className="text-xs font-bold text-primary hover:underline cursor-pointer"
                                        >
                                            Replace File
                                        </label>

                                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                            Ready to sync
                                        </span>
                                    </div>

                                    <input
                                        id={name}
                                        type="file"
                                        className="hidden"
                                        accept={accept}
                                        onChange={(e) =>
                                            handleFileChange(e, onChange)
                                        }
                                    />
                                </div>
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