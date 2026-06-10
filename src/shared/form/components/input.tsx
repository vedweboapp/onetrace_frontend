"use client";

import React, { InputHTMLAttributes } from "react";
import { FieldError, UseFormRegisterReturn } from "react-hook-form";
import {
    isNativeDateInputType,
    nativeDatePickerHitAreaClassName,
    openNativeDatePicker,
} from "@/shared/ui/surface-date-input";
import { surfaceInputClassName, surfaceTextareaClassName } from "@/shared/ui";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string;
    register?: UseFormRegisterReturn;
    errors?: FieldError;
    readOnly?: boolean;
    className?: string;
};

const extractLabelText = (label?: any) => {
    if (!label || typeof label !== 'string') return "";

    return label.replace(/[*:]/g, "").trim();
};

const Input = ({
    label,
    register,
    errors,
    readOnly,
    className = "",
    onClick,
    ...rest
}: InputProps) => {
    const isDateField = isNativeDateInputType(rest.type);

    function handleDateClick(e: React.MouseEvent<HTMLInputElement>) {
        onClick?.(e);
        if (e.defaultPrevented || readOnly || rest.disabled) return;
        openNativeDatePicker(e.currentTarget);
    }

    return (
        <div
            className={`flex flex-col gap-1 w-full`}
        >
            {label && (
                <label
                    htmlFor={rest.name}
                    className="
            text-sm
            font-medium
            text-mutedtext
          "
                >
                    {label}
                </label>
            )}

            <input
                {...register}
                {...rest}
                readOnly={readOnly}
                onClick={isDateField ? handleDateClick : onClick}
                placeholder={
                    rest.placeholder ||
                    `Enter ${extractLabelText(
                        label
                    )} here`
                }
                className={`
          rounded-[8px]
          px-3
          py-2
          outline-none
          w-full
          text-slate-900
          dark:text-white
          ${readOnly
                        ? `
                border-none
                bg-gray-100
                dark:bg-slate-800/50
                cursor-not-allowed
                select-none
              `
                        : `
                bg-white
                dark:bg-slate-900
                border
                ${errors
                            ? "border-red-500"
                            : "border-gray-300 dark:border-slate-700"
                        }
                focus:ring-2
               ${surfaceInputClassName}
                ${isDateField && !readOnly ? nativeDatePickerHitAreaClassName : ""}
              `
                    }
          ${className}
        `}
            />

            {errors && (
                <span
                    className="
            text-red-500
            text-xs
          "
                >
                    {errors.message}
                </span>
            )}
        </div>
    );
};

export default Input;