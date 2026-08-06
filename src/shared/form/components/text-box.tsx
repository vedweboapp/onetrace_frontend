"use client";

import { surfaceTextareaClassName } from "@/shared/ui";
import { cn } from "@/core/utils/http.util";
import React from "react";

interface TextBoxProps {
    label?: string;
    register?: any;
    errors?: any;
    readOnly?: boolean;
    className?: string;
    rows?: number;
    [key: string]: any;
}

const TextBox: React.FC<TextBoxProps> = ({
    label,
    register,
    errors,
    readOnly,
    className = "",
    rows = 4,
    ...rest
}) => {
    return (
        <div className="flex flex-col gap-1 w-full">
            {label && (
                <label
                    htmlFor={rest.name}
                    className="text-sm font-medium text-mutedtext"
                >
                    {label}
                </label>
            )}

            <textarea
                {...register}
                {...rest}
                rows={rows}
                readOnly={readOnly}
                placeholder={
                    rest.placeholder ||
                    `Enter ${typeof label === 'string' ? label.replace(/[*:]/g, "").trim() : ''} here`
                }
                className={cn(
                    surfaceTextareaClassName,
                    // Read-only: override bg, border, and ring; block pointer interaction
                    readOnly
                        ? "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 cursor-default pointer-events-none focus:ring-0 focus-visible:ring-0 focus-visible:border-slate-200 select-none"
                        : errors
                            ? "border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500"
                            : "",
                    className,
                )}
            />

            {errors && (
                <span className="text-red-500 text-xs">
                    {errors.message}
                </span>
            )}
        </div>
    );
};

export default TextBox;