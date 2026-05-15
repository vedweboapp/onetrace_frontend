"use client";

import React, {
    SelectHTMLAttributes,
} from "react";

import {
    FieldError,
    UseFormRegisterReturn,
} from "react-hook-form";

type DropdownOption =
    | string
    | {
        label: string;
        value: string;
    };

type FormDropdownProps =
    SelectHTMLAttributes<HTMLSelectElement> & {
        label?: string;

        register?: UseFormRegisterReturn;

        options?: DropdownOption[];

        errors?: FieldError;

        className?: string;

        readOnly?: boolean;
    };

const formatLabel = (value: string) => {
    return value
        .split("_")
        .map(
            (word) =>
                word.charAt(0).toUpperCase() +
                word.slice(1)
        )
        .join(" ");
};

const Select = ({
    label,
    register,
    options = [],
    errors,
    className = "",
    readOnly,
    ...rest
}: FormDropdownProps) => {
    return (
        <div
            className={`
        flex
        flex-col
        gap-1
        w-full
      `}
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

            <select
                {...register}
                {...rest}
                disabled={readOnly}
                className={`
          rounded-[8px]
          px-3
          py-2
          outline-none
          w-full
          ${readOnly
                        ? `
                border-none
                bg-gray-100
                cursor-not-allowed
                select-none
              `
                        : `
                bg-white
                border
                ${errors
                            ? "border-red-500"
                            : "border-gray-300"
                        }
                focus:ring-2
                focus:ring-blue-500
              `
                    }
          ${className}
        `}
            >
                {options.map((item, index) => {
                    const value =
                        typeof item === "string"
                            ? item
                            : item.value;

                    const optionLabel =
                        typeof item === "string"
                            ? formatLabel(item)
                            : item.label;

                    return (
                        <option
                            key={index}
                            value={value}
                        >
                            {optionLabel}
                        </option>
                    );
                })}
            </select>

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

export default Select;