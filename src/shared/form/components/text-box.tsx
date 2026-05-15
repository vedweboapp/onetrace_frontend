"use client";

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
                className={`
          rounded-[8px]
          px-3
          py-2
          outline-none
          w-full
          resize-none
          text-slate-900
          dark:text-white
          ${readOnly
                        ? "border-none bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed select-none"
                        : `bg-white dark:bg-slate-900 border ${errors
                            ? "border-red-500"
                            : "border-gray-300 dark:border-slate-700"
                        } focus:ring-2 focus:ring-blue-500`
                    }
          ${className}
        `}
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